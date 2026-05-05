import { extractBaseURL, GOTO_RE } from '../utils/url-extractor';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { openai as sharedOpenai, hasOpenAI } from '../utils/openai-client';
import { Action } from '../types/action.types'; // Risk 1: usar tipo canónico

import { parseRecording } from '../agents/recorder/recorder-parser-agent';
import { generateUITest } from '../agents/generators/ui-agent';
import { discoverApiCalls } from '../agents/network/api-discovery.agent';
import { generateApiTests } from '../agents/network/api-test-generator.agent';
import { generatePerformance } from '../agents/generators/performance-agent';
import { generateAccessibility } from '../agents/generators/accessibility-agent';
import { generateVisual } from '../agents/generators/visual-agent';
import { generateSecurity } from '../agents/generators/security-agent';
import { processBoxAPIsExecute } from '../agents/network/box-api-executor.agent';

import { ensureDir } from '../utils/fs-utils';
import { buildFeature, generateStepsFromGherkin } from '../agents/core/generator-agent';
import { validateFlow } from '../agents/core/flow-validator';
import { enhanceFlow } from '../agents/core/smart-flow-engine';

// ============================================================
// Utilidades de matching de nombres de suite
// ============================================================

/**
 * Normaliza un nombre para comparación: minúsculas, guiones y espacios → '_',
 * elimina extensiones y sufijos como .spec.ts
 */
function normalizeName(name: string): string {
  return name
    .replace(/\.spec\.ts$/, '')
    .replace(/\.spec\.js$/, '')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

/**
 * Extrae el prefijo "nombre de suite" de un nombre de archivo de test de API.
 * Busca el primer keyword HTTP/SOAP para cortar antes de él.
 * Ejemplo: "Homebanking_Transf-Servicio_Operacion_SOAP_POST.spec.ts" → "Homebanking_Transf-Servicio_Operacion"
 */
function extractSuitePrefixFromFilename(fileName: string): string {
  const withoutExt = fileName.replace(/\.spec\.(ts|js)$/, '');
  const match = withoutExt.match(/^(.+?)_(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|SOAP)(?:_|$)/i);
  if (match) return match[1];
  // Fallback: quitar último segmento separado por _
  const parts = withoutExt.split('_');
  if (parts.length > 1) parts.pop();
  return parts.join('_');
}

/**
 * Calcula la longitud del prefijo común entre dos strings.
 */
function commonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Calcula similitud entre dos strings basada en prefijo común normalizado.
 * Retorna valor entre 0 y 1 donde 1 = coincidencia exacta.
 */
function prefixSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  const prefixLen = commonPrefixLength(na, nb);
  // El score se basa en cuánto del nombre de la suite se cubre
  return prefixLen / Math.max(na.length, nb.length);
}

/**
 * Matching local robusto: primero exacto (normalizado), luego fuzzy por prefijo.
 * Umbral mínimo de similitud: 0.70 (70% del nombre de suite en común).
 */
function findMatchingSuite(
  fileName: string,
  suites: string[],
  fuzzyThreshold = 0.70
): { suite: string; score: number } | null {
  const filePrefix = extractSuitePrefixFromFilename(fileName);
  const normalizedFilePrefix = normalizeName(filePrefix);

  // Ordenar de mayor a menor longitud para preferir matches más específicos
  const sortedSuites = [...suites].sort((a, b) => b.length - a.length);

  // 1. Coincidencia exacta normalizada
  for (const suite of sortedSuites) {
    const normalizedSuite = normalizeName(suite);
    if (normalizedFilePrefix === normalizedSuite ||
        normalizedFilePrefix.startsWith(normalizedSuite + '_')) {
      return { suite, score: 1.0 };
    }
  }

  // 2. Fuzzy: prefijo común más largo que supere el umbral
  let bestMatch: { suite: string; score: number } | null = null;
  for (const suite of sortedSuites) {
    const score = prefixSimilarity(filePrefix, suite);
    if (score >= fuzzyThreshold) {
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { suite, score };
      }
    }
  }

  return bestMatch;
}

/**
 * Fallback IA: usa OpenAI para determinar a qué suite pertenece el archivo
 * cuando el matching local falla o tiene baja confianza.
 */
async function findMatchingSuiteWithAI(
  fileName: string,
  suites: string[]
): Promise<string | null> {
  if (!hasOpenAI || !sharedOpenai) {
    console.log('⚠️  OPENAI_API_KEY no configurada — fallback IA omitido');
    return null;
  }

  try {
    const prompt = `Eres un asistente que mapea nombres de archivos de tests de API a sus suites de Playwright.

Archivo de test: "${fileName}"
Suites disponibles: ${JSON.stringify(suites)}

El archivo de test puede tener abreviaciones, guiones, o nombres parciales del nombre de suite real.
Por ejemplo "Homebanking_Transf-Servicio_Operacion_SOAP_POST.spec.ts" pertenece a la suite "Homebanking_Transfer"
porque "Transf" es abreviación de "Transfer".

Responde ÚNICAMENTE con el nombre exacto de la suite del array (sin comillas extra, sin explicación).
Si ninguna suite coincide razonablemente, responde null.`;

    const response = await sharedOpenai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 100
    });

    const answer = response.choices[0]?.message?.content?.trim() ?? '';
    if (!answer || answer === 'null') return null;

    // Validar que la respuesta sea una suite válida
    const matched = suites.find(s => s === answer || normalizeName(s) === normalizeName(answer));
    if (matched) {
      console.log(`🤖 IA determinó suite: "${matched}" para "${fileName}"`);
      return matched;
    }
    console.log(`⚠️ IA respondió "${answer}" pero no coincide con ninguna suite conocida`);
    return null;
  } catch (err) {
    console.error('⚠️ Error en findMatchingSuiteWithAI:', err);
    return null;
  }
}

/**
 * Corrige la ruta de importación de api-helper en el contenido del test.
 */
function fixApiHelperImport(content: string): string {
  const correctImport = `import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper'`;

  // Reemplaza cualquier variante de import que contenga api-helper
  content = content.replace(
    /import\s*\{[^}]*\}\s*from\s*['"][^'"]*api-helper[^'"]*['"]\s*;?/g,
    correctImport + ';'
  );

  // Si no había ningún import de api-helper pero se usa restRequest/soapRequest, no hacemos nada más
  return content;
}

/**
 * Elimina directorios en GenerateTest/tests/ que no correspondan a ninguna suite conocida.
 * Risk 7: operación destructiva — controlada por env vars:
 *   SKIP_ORPHAN_CLEANUP=true  — deshabilita la limpieza completamente
 *   CLEANUP_DRY_RUN=true      — lista qué se eliminaría sin borrar nada
 */
function cleanupOrphanSuiteDirs(testsOutputDir: string, validSuites: string[]): void {
  if (!fs.existsSync(testsOutputDir)) return;

  // Risk 7: permitir deshabilitar la limpieza para evitar pérdidas accidentales
  if (process.env.SKIP_ORPHAN_CLEANUP === 'true') {
    console.log('⏭️  Limpieza de directorios huérfanos omitida (SKIP_ORPHAN_CLEANUP=true)');
    return;
  }

  const DRY_RUN = process.env.CLEANUP_DRY_RUN === 'true';
  if (DRY_RUN) console.log('🔍 [DRY RUN] Directorios huérfanos que se eliminarían:');

  const existingDirs = fs.readdirSync(testsOutputDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const validNormalized = new Set(validSuites.map(s => normalizeName(s)));

  for (const dir of existingDirs) {
    if (!validNormalized.has(normalizeName(dir))) {
      const dirPath = path.join(testsOutputDir, dir);
      if (DRY_RUN) {
        console.log(`   → ${dirPath}`);
      } else {
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`🧹 Directorio huérfano eliminado: ${dirPath}`);
        } catch (err) {
          console.error(`⚠️ No se pudo eliminar directorio huérfano: ${dirPath}`, err);
        }
      }
    }
  }

  if (DRY_RUN) console.log('   (usa CLEANUP_DRY_RUN=false o sin la variable para aplicar)');
}

// ============================================================
// Orquestador principal
// ============================================================

async function runAgents() {
  console.log('🤖 AI Testing generation started');

  const recordingsDir = path.join('BoxRecordings', 'recordings');
  const outputDir = path.join('GenerateTest');
  const featureDir = path.join(outputDir, 'features');
  const testsOutputDir = path.join(process.cwd(), 'GenerateTest', 'tests');

  ensureDir(outputDir);
  ensureDir(featureDir);

  // ============================================
  // 0. Recolectar recordings (pueden no existir)
  // ============================================
  const files = fs.existsSync(recordingsDir) ? fs.readdirSync(recordingsDir) : [];

  if (!fs.existsSync(recordingsDir)) {
    console.log('⚠️ Carpeta de recordings no encontrada — se procesará solo BoxAPIsExecute');
  } else if (files.length === 0) {
    console.log('⚠️ No hay recordings — se procesará solo BoxAPIsExecute');
  }

  const suiteNames: string[] = [];
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const name = file.replace(/\.(ts|js)$/, '');
      suiteNames.push(name);
    }
  }
  if (suiteNames.length > 0) {
    console.log(`📋 Suites disponibles: ${suiteNames.join(', ')}`);
  }

  // ============================================
  // Procesar cada recording (se omite si no hay)
  // ============================================
  for (const file of files) {
    try {
      if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

      const recordingPath = path.join(recordingsDir, file);
      const name = file.replace(/\.(ts|js)$/, '');

      console.log(`\n📀 Processing: ${name}`);

      // 1. Parse recording
      let steps: Action[] = [];
      try {
        steps = parseRecording(recordingPath) as Action[];
      } catch (err) {
        console.error(`❌ Error parsing recording: ${file}`, err);
        continue;
      }
      if (!steps || steps.length === 0) {
        console.log('⚠️ No steps detected, skipping');
        continue;
      }
      console.log(`🧠 Steps detected: ${steps.length}`);

      // 1b. Enriquecer semánticamente los pasos para el generador de UI
      const enhancedSteps = enhanceFlow(steps);

      // 2. Generate BDD feature
      let gherkin = '';
      try {
        gherkin = await buildFeature(name, steps);
      } catch (err) {
        console.error('❌ Error generating Gherkin', err);
        continue;
      }
      if (!gherkin || gherkin.trim().length === 0) {
        console.log('⚠️ Empty Gherkin, skipping');
        continue;
      }
      const featurePath = path.join(featureDir, `${name}.feature`);
      fs.writeFileSync(featurePath, gherkin);
      console.log(`📄 Feature generado: ${featurePath}`);

      // 2b. Validar cobertura del feature y corregir si hay pasos faltantes
      try {
        const validation = await validateFlow(steps, gherkin, featurePath);
        if (!validation.skipped && validation.hasMissingSteps) {
          console.log(`🔧 Feature corregido con ${validation.missingSteps.length} paso(s) añadido(s)`);
        }
      } catch (err) {
        console.warn('⚠️ Error en validación del feature (no crítico)', err);
      }

      // 3. Step definitions
      try {
        await generateStepsFromGherkin(name, gherkin);
      } catch (err) {
        console.error('⚠️ Error generating step definitions', err);
      }

      // 4. UI Test (usa enhancedSteps para contexto semántico de flujo)
      try {
        generateUITest(name, enhancedSteps as any[]);
      } catch (err) {
        console.error('⚠️ Error generating UI test', err);
      }

      // 5. API Discovery + tests (from network traffic in recording)
      let apiCalls: any[] = [];
      try {
        apiCalls = discoverApiCalls(recordingPath);
        console.log(`📡 API calls discovered: ${apiCalls.length}`);
      } catch (err) {
        console.error('⚠️ Error discovering APIs', err);
      }
      if (apiCalls.length > 0) {
        try {
          generateApiTests(name, apiCalls);
        } catch (err) {
          console.error('⚠️ Error generating API tests', err);
        }
      } else {
        console.log('ℹ️ No API calls found, skipping API tests');
      }

      // 6. Base URL + Metadata
      // Risk 7: fallback usa GOTO_RE importado — sin duplicar el regex
      let baseURL = '';
      try {
        baseURL = extractBaseURL(recordingPath) || '';
        if (!baseURL) {
          const rawContent = fs.readFileSync(recordingPath, 'utf-8');
          const gotoMatch = [...rawContent.matchAll(GOTO_RE)][0];
          if (gotoMatch) baseURL = gotoMatch[1];
        }
      } catch (err) {
        console.error('⚠️ Error extracting baseURL', err);
      }
      if (baseURL) {
        // Risk 2: normalizar a origin para tests de security/performance/accessibility/visual
        // El bloque anterior era un no-op — ahora aplica la normalización real.
        try {
          baseURL = new URL(baseURL.trim()).origin;
        } catch {
          baseURL = baseURL.trim(); // URL inválida → usar como está
        }
      }
      const metadata = { name, baseURL };
      const metadataPath = path.join(outputDir, `${name}.metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`🧠 Metadata generated: ${metadataPath} (baseURL: ${baseURL || 'N/A'})`);

      // 7. Advanced tests (Performance, Accessibility, Visual, Security)
      if (baseURL) {
        try {
          generatePerformance(name, baseURL);
          generateAccessibility(name, baseURL);
          generateVisual(name, baseURL);
          await generateSecurity(name, baseURL, steps);
        } catch (err) {
          console.error('⚠️ Error generating advanced tests', err);
        }
      } else {
        console.log('⚠️ No baseURL detected, skipping advanced tests');
      }
    } catch (globalError) {
      console.error(`🔥 ERROR GLOBAL procesando ${file}`, globalError);
    }
  }

  // ============================================
  // 8. Procesar tests de API manuales (REST y SOAP)  — Risk 1: renumerado (era 9)
  //    - Matching robusto: exacto → fuzzy → IA OpenAI
  //    - COPIA sin borrar fuente (preserva el original para re-runs)
  //    - Limpia directorios huérfanos de runs anteriores incorrectos
  // ============================================
  const apiManualDirs = [
    { baseDir: path.join(process.cwd(), 'GenerateTest', 'api-testing-rest-soap', 'rest'), type: 'rest' },
    { baseDir: path.join(process.cwd(), 'GenerateTest', 'api-testing-rest-soap', 'soap'), type: 'soap' }
  ];

  // Risk 5: AI_THRESHOLD < FUZZY_THRESHOLD para que matches débiles (0.50–0.70)
  // también pasen por la IA. findMatchingSuite se llama con AI_THRESHOLD como umbral
  // mínimo, capturando candidatos débiles. La IA se consulta cuando score < FUZZY_THRESHOLD.
  const FUZZY_THRESHOLD = 0.70;   // match confiable — no necesita IA
  const AI_THRESHOLD    = 0.50;   // match débil — delegar a IA para confirmar

  for (const { baseDir, type } of apiManualDirs) {
    if (!fs.existsSync(baseDir)) continue;
    const manualFiles = fs.readdirSync(baseDir).filter(f => f.endsWith('.spec.ts'));

    for (const manualFile of manualFiles) {
      console.log(`\n🔍 Procesando test manual (${type}): ${manualFile}`);

      // --- Fase 1: matching local con umbral bajo (AI_THRESHOLD) para capturar candidatos débiles ---
      let matchResult = findMatchingSuite(manualFile, suiteNames, AI_THRESHOLD); // Risk 5: umbral bajo
      let suiteName: string | null = matchResult?.suite ?? null;
      let matchScore = matchResult?.score ?? 0;

      if (suiteName && matchScore >= FUZZY_THRESHOLD) {
        console.log(`✅ Suite detectada localmente: "${suiteName}" (score=${matchScore.toFixed(2)}) para "${manualFile}"`);
      }

      // --- Fase 2: fallback IA cuando score < FUZZY_THRESHOLD (incluye rango 0.50–0.70) o sin match ---
      if (!suiteName || matchScore < FUZZY_THRESHOLD) {
        console.log(`🤖 Score bajo (${matchScore.toFixed(2)}) o sin match — consultando IA para "${manualFile}"...`);
        const aiSuite = await findMatchingSuiteWithAI(manualFile, suiteNames);
        if (aiSuite) {
          suiteName = aiSuite;
          matchScore = 1.0; // confianza IA
        }
      }

      // --- Sin match válido ---
      if (!suiteName) {
        console.warn(`⚠️ No se pudo determinar la suite para "${manualFile}" — se omite`);
        continue;
      }

      // --- Copiar (sin borrar fuente) ---
      const targetApiDir = path.join(testsOutputDir, suiteName, 'api');
      ensureDir(targetApiDir);

      const sourcePath = path.join(baseDir, manualFile);
      const targetPath = path.join(targetApiDir, manualFile);

      let content = fs.readFileSync(sourcePath, 'utf-8');
      content = fixApiHelperImport(content);

      fs.writeFileSync(targetPath, content);
      console.log(`✅ Test manual de API (${type}) copiado a: ${targetPath}`);
      // NOTA: NO se elimina el archivo fuente — se preserva para permitir re-runs.
      // fs.unlinkSync(sourcePath) ← eliminado intencionalmente
    }
  }

  // ============================================
  // 9. Procesar BoxAPIsExecute/ — genera specs Playwright desde servicios  — Risk 1: renumerado (era 10)
  //     REST, SOAP u otros definidos en BoxAPIsExecute/<TIPO>/<MÉTODO>/*.spec.ts
  //     → GenerateTest/tests/<Suite>/api/ (o Solo_test_API si sin suite)
  // ============================================
  console.log('\n📦 Procesando BoxAPIsExecute con agente IA...');
  await processBoxAPIsExecute(
    suiteNames,
    testsOutputDir,
    process.env.OPENAI_API_KEY
  );

  // ============================================
  // 10. Limpiar directorios huérfanos en GenerateTest/tests/  — Risk 1: renumerado (era 11)
  //     (creados por runs anteriores con matching incorrecto)
  // ============================================
  const knownSuitesWithSolo = [...suiteNames, 'Solo_test_API'];
  cleanupOrphanSuiteDirs(testsOutputDir, knownSuitesWithSolo);

  console.log('\n🎉 AI Testing generation completed');
}

runAgents().catch(err => {
  console.error('🔥 FATAL ERROR', err);
});
