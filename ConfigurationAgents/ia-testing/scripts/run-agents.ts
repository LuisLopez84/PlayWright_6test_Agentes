import { extractBaseURL } from '../utils/url-extractor';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

import { parseRecording } from '../agents/recorder/recorder-parser-agent';
import { generateUITest } from '../agents/generators/ui-agent';
import { discoverApiCalls } from '../agents/network/api-discovery.agent';
import { generateApiTests } from '../agents/network/api-test-generator.agent';
import { generatePerformance } from '../agents/generators/performance-agent';
import { generateAccessibility } from '../agents/generators/accessibility-agent';
import { generateVisual } from '../agents/generators/visual-agent';
import { generateSecurity } from '../agents/generators/security-agent';

import { ensureDir } from '../utils/fs-utils';
import { buildFeature, generateStepsFromGherkin } from '../agents/core/generator-agent';


async function runAgents() {
  console.log('🤖 AI Testing generation started');

  const recordingsDir = path.join('BoxRecordings', 'recordings');
  const outputDir = path.join('GenerateTest');
  const featureDir = path.join(outputDir, 'features');

  ensureDir(outputDir);
  ensureDir(featureDir);

  if (!fs.existsSync(recordingsDir)) {
    console.log('❌ No recordings folder found');
    return;
  }

  const files = fs.readdirSync(recordingsDir);
  if (files.length === 0) {
    console.log('⚠️ No recordings found');
    return;
  }

  // ============================================
  // 🔥 0. RECOLECTAR TODOS LOS NOMBRES DE SUITES (RECORDINGS)
  // ============================================
  const suiteNames: string[] = [];
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const name = file.replace(/\.(ts|js)$/, '');
      suiteNames.push(name);
    }
  }
  console.log(`📋 Suites disponibles: ${suiteNames.join(', ')}`);

  // ============================================
  // 🔥 PROCESAR CADA RECORDING
  // ============================================
  for (const file of files) {
    try {
      if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

      const recordingPath = path.join(recordingsDir, file);
      const name = file.replace(/\.(ts|js)$/, '');

      console.log(`\n📀 Processing: ${name}`);

      // 1. Parse recording
      let steps: any[] = [];
      try {
        steps = parseRecording(recordingPath);
      } catch (err) {
        console.error(`❌ Error parsing recording: ${file}`, err);
        continue;
      }
      if (!steps || steps.length === 0) {
        console.log('⚠️ No steps detected, skipping');
        continue;
      }
      console.log(`🧠 Steps detected: ${steps.length}`);

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

      // 3. Step definitions
      try {
        await generateStepsFromGherkin(name, gherkin);
      } catch (err) {
        console.error('⚠️ Error generating step definitions', err);
      }

      // 4. UI Test
      try {
        generateUITest(name, steps);
      } catch (err) {
        console.error('⚠️ Error generating UI test', err);
      }

      // 5. API Discovery + tests (from network)
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
      let baseURL = '';
      try {
        baseURL = extractBaseURL(recordingPath) || '';
      } catch (err) {
        console.error('⚠️ Error extracting baseURL', err);
      }
      const metadata = { name, baseURL };
      const metadataPath = path.join(outputDir, `${name}.metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`🧠 Metadata generated: ${metadataPath}`);

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
  // 🔥 9. PROCESAR TESTS DE API MANUALES (REST y SOAP) - CORREGIDO
  // ============================================
  const apiManualDirs = [
    { baseDir: path.join(process.cwd(), 'GenerateTest', 'api-testing-rest-soap', 'rest'), type: 'rest' },
    { baseDir: path.join(process.cwd(), 'GenerateTest', 'api-testing-rest-soap', 'soap'), type: 'soap' }
  ];

  // Función auxiliar para encontrar el nombre de suite que es prefijo del nombre del archivo
  function findMatchingSuite(fileName: string, suites: string[]): string | null {
    // Ordenar suites de mayor a menor longitud para encontrar el prefijo más largo
    const sortedSuites = [...suites].sort((a, b) => b.length - a.length);
    for (const suite of sortedSuites) {
      // Comparación insensible a mayúsculas/minúsculas y respetando guiones bajos
      if (fileName.toLowerCase().startsWith(suite.toLowerCase() + '_') ||
          fileName.toLowerCase() === suite.toLowerCase()) {
        return suite;
      }
    }
    return null;
  }

  for (const { baseDir, type } of apiManualDirs) {
    if (!fs.existsSync(baseDir)) continue;
    const manualFiles = fs.readdirSync(baseDir).filter(f => f.endsWith('.spec.ts'));
    for (const manualFile of manualFiles) {
      // 1. Intentar encontrar suite por prefijo exacto
      let suiteName = findMatchingSuite(manualFile, suiteNames);

      if (!suiteName) {
        // 2. Fallback: extraer usando patrones de método (mejorado)
        const methodPatterns = [
          { pattern: /_(GET|POST|PUT|DELETE|PATCH|SOAP)_/i, methodGroup: 1 },
          { pattern: /_(GET|POST|PUT|DELETE|PATCH|SOAP)(?=_|\.)/i, methodGroup: 1 }
        ];
        let firstMethodIndex = -1;
        for (const { pattern } of methodPatterns) {
          const match = manualFile.match(pattern);
          if (match && match.index !== undefined) {
            firstMethodIndex = match.index;
            break;
          }
        }
        if (firstMethodIndex !== -1) {
          suiteName = manualFile.substring(0, firstMethodIndex);
        } else {
          // Fallback final: primer guion bajo
          const firstUnderscore = manualFile.indexOf('_');
          if (firstUnderscore !== -1) {
            suiteName = manualFile.substring(0, firstUnderscore);
          } else {
            suiteName = manualFile.replace(/\.spec\.ts$/, '');
          }
        }
        console.log(`⚠️ No se encontró suite exacta para ${manualFile}, usando fallback: ${suiteName}`);
      } else {
        console.log(`✅ Suite detectada para ${manualFile}: ${suiteName}`);
      }

      if (!suiteName) {
        console.log(`⚠️ No se pudo determinar la suite para el archivo ${manualFile}, se omite.`);
        continue;
      }

      const targetApiDir = path.join(process.cwd(), 'GenerateTest', 'tests', suiteName, 'api');
      ensureDir(targetApiDir);

      const sourcePath = path.join(baseDir, manualFile);
      const targetPath = path.join(targetApiDir, manualFile);

      let content = fs.readFileSync(sourcePath, 'utf-8');
      // Corregir importación de api-helper (ruta relativa correcta)
      content = content.replace(
        /import\s*\{\s*.*?\s*\}\s*from\s*['"](.*?api-helper.*?)['"]/g,
        `import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper'`
      );
      content = content.replace(/from\s+['"](.*?)(\.js)?['"]/g, (match, p1, p2) => {
        if (p1.includes('api-helper')) {
          return `from '../../../../ConfigurationTest/tests/utils/api-helper'`;
        }
        return match;
      });

      fs.writeFileSync(targetPath, content);
      console.log(`✅ Test manual de API (${type}) movido/actualizado: ${targetPath}`);
      fs.unlinkSync(sourcePath);
    }
  }

  console.log('\n🎉 AI Testing generation completed');
}

runAgents().catch(err => {
  console.error('🔥 FATAL ERROR', err);
});