/**
 * generate-nf-tests.ts
 *
 * Genera specs de prueba no funcional en GenerateTest/tests/<Suite>/non-functional/
 * a partir de la configuración en nf-config.ts.
 *
 * Ejecución:
 *   npx ts-node GenerateTest/non-functional/generator/generate-nf-tests.ts
 *   npm run generate:nf
 *
 * Nota: los specs generados se incluyen en el reporte HTML de Playwright junto con
 * todos los demás tipos de prueba (UI, API, performance, security, accessibility, visual).
 */

import fs from 'fs';
import path from 'path';
import { NFConfig, IncrementalParams, SpikeParams } from '../config/nf-config';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ResolvedTarget {
  suiteName: string;
  targetName: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
  type: 'recording' | 'api';
  testType: 'incremental' | 'spike';
  incremental: IncrementalParams;
  spike: SpikeParams;
}

// ─── Resolver: recording → URL ────────────────────────────────────────────────

function resolveRecordingURL(recordingName: string): string | null {
  const metadataCandidates = [
    path.join('GenerateTest', `${recordingName}.metadata.json`),
    path.join('GenerateTest', 'tests', recordingName, `${recordingName}.metadata.json`),
  ];

  for (const p of metadataCandidates) {
    if (fs.existsSync(p)) {
      try {
        const meta = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (meta.baseURL) return meta.baseURL;
      } catch {}
    }
  }

  // Fallback: leer recording directamente
  const recCandidates = [
    path.join('BoxRecordings', 'recordings', `${recordingName}.ts`),
    path.join('BoxRecordings', 'recordings', `${recordingName}.js`),
  ];
  for (const p of recCandidates) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      const m = content.match(/page\.goto\(['"`](https?:\/\/[^'"`]+)['"`]\)/);
      if (m) {
        try { return new URL(m[1]).origin; } catch {}
      }
    }
  }
  return null;
}

// ─── Resolver: apiSpecPath → suiteName ───────────────────────────────────────

function resolveSuiteNameFromApiSpec(apiSpecPath: string): string | null {
  const filename = path.basename(apiSpecPath, '.spec.ts');
  const testSuitesDir = path.join('GenerateTest', 'tests');

  if (!fs.existsSync(testSuitesDir)) return null;

  const suites = fs.readdirSync(testSuitesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // Ordenar por longitud descendente para priorizar matches más específicos
  suites.sort((a, b) => b.length - a.length);

  for (const suite of suites) {
    if (filename.startsWith(suite)) return suite;
  }

  // Fallback: usar la primera parte antes de '_Servicio' o método HTTP
  const parts = filename.split(/_(GET|POST|PUT|PATCH|DELETE|Servicio)/i);
  if (parts.length > 1) {
    const candidate = parts[0].trim();
    if (suites.includes(candidate)) return candidate;
  }

  console.warn(`  ⚠️  No se encontró suite para: ${apiSpecPath}`);
  console.warn(`       Suites disponibles: ${suites.join(', ')}`);
  return null;
}

// ─── Resolver de todos los targets ───────────────────────────────────────────

function resolveAllTargets(): ResolvedTarget[] {
  const resolved: ResolvedTarget[] = [];

  for (const t of NFConfig.targets) {
    // Resolver testType e incremental/spike: usa el override del target si existe, si no el global
    const testType    = t.testType    ?? NFConfig.testType;
    const incremental = t.incremental ?? NFConfig.incremental;
    const spike       = t.spike       ?? NFConfig.spike;

    if (t.type === 'recording') {
      const url = resolveRecordingURL(t.recording);
      if (!url) {
        console.error(
          `  ❌ Recording "${t.recording}": no se encontró URL. ` +
          `Verifica que exista el metadata.json o el recording en BoxRecordings/recordings/`,
        );
        continue;
      }
      resolved.push({
        suiteName: t.recording,
        targetName: t.recording,
        url,
        method: 'GET',
        headers: {},
        body: undefined,
        type: 'recording',
        testType,
        incremental,
        spike,
      });
      console.log(`  ✅ Recording "${t.recording}" → ${url} | Tipo: ${testType.toUpperCase()}`);
    } else {
      // API
      const suiteName = resolveSuiteNameFromApiSpec(t.apiSpecPath);
      if (!suiteName) {
        console.error(`  ❌ No se pudo determinar suite para: ${t.apiSpecPath}`);
        continue;
      }
      resolved.push({
        suiteName,
        targetName: t.endpoint.name,
        url: t.endpoint.url,
        method: t.endpoint.method,
        headers: t.endpoint.headers ?? {},
        body: t.endpoint.body,
        type: 'api',
        testType,
        incremental,
        spike,
      });
      console.log(
        `  ✅ API "${t.endpoint.name}" → suite: ${suiteName} | ${t.endpoint.url} | Tipo: ${testType.toUpperCase()}`,
      );
    }
  }

  return resolved;
}

// ─── Generador de spec ────────────────────────────────────────────────────────

function generateSpecContent(target: ResolvedTarget): string {
  const safeName   = target.targetName.replace(/'/g, "\\'");
  const safeUrl    = target.url.replace(/'/g, "\\'");
  const safeMethod = target.method;
  const headersJson = JSON.stringify(target.headers, null, 2).split('\n').join('\n  ');
  const bodyLiteral = target.body ? `'${target.body.replace(/'/g, "\\'")}'` : 'undefined';

  // Ruta relativa desde GenerateTest/tests/<Suite>/non-functional/ a GenerateTest/non-functional/
  const toNF = '../../../non-functional';

  // Embeber parámetros resueltos del target (no dependen de NFConfig en runtime)
  const incrementalJson = JSON.stringify(target.incremental, null, 2).split('\n').join('\n  ');
  const spikeJson = JSON.stringify({
    threadsPerScenario: target.spike.threadsPerScenario,
    durationPerScenarioSeconds: target.spike.durationPerScenarioSeconds,
  }, null, 2).split('\n').join('\n  ');

  // Generar solo el import y la llamada necesarios según el testType
  const importLine = target.testType === 'incremental'
    ? `import { runIncrementalTest } from '${toNF}/core/load-engine';`
    : `import { runSpikeTest } from '${toNF}/core/load-engine';`;

  const testCall = target.testType === 'incremental'
    ? `const summaries = await runIncrementalTest(NF_TARGET, NF_INCREMENTAL, NFConfig.assertions);`
    : `const summaries = await runSpikeTest(NF_TARGET, NF_SPIKE, NFConfig.assertions);`;

  const paramsBlock = target.testType === 'incremental'
    ? `const NF_INCREMENTAL = ${incrementalJson};`
    : `const NF_SPIKE = ${spikeJson};`;

  return `/**
 * ${target.suiteName}.nf.spec.ts
 *
 * Prueba NO FUNCIONAL (Carga / Rendimiento) — ${target.suiteName}
 * Tipo: ${target.testType.toUpperCase()}
 *
 * AUTO-GENERADO por:
 *   npx ts-node GenerateTest/non-functional/generator/generate-nf-tests.ts
 *
 * Para actualizar: editar nf-config.ts y volver a ejecutar el generador.
 *
 * Ejecución integrada (incluye en reporte HTML completo):
 *   npx playwright test --project=non-functional
 *
 * Ejecución individual:
 *   npx playwright test --project=non-functional \\
 *     GenerateTest/tests/${target.suiteName}/non-functional/${target.suiteName}.nf.spec.ts
 */

import { test } from '@playwright/test';
import { NFConfig } from '${toNF}/config/nf-config';
${importLine}
import { printSummaryTable } from '${toNF}/reporters/summary-reporter';
import type { LoadTarget } from '${toNF}/utils/target-resolver';

// ─── Target embebido (resuelto en tiempo de generación) ────────────────────
const NF_TARGET: LoadTarget = {
  name: '${safeName}',
  url: '${safeUrl}',
  method: '${safeMethod}',
  headers: ${headersJson},
  body: ${bodyLiteral},
  type: '${target.type}',
  testType: '${target.testType}',
  incremental: ${incrementalJson},
  spike: ${spikeJson},
};

// ─── Parámetros de prueba embebidos (resueltos en tiempo de generación) ────
${paramsBlock}

// ─── Test ──────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });

test('Non-Functional — ${target.suiteName}', async () => {
  // Sin timeout: las pruebas de carga pueden durar varios minutos
  test.setTimeout(0);

  console.log('\\n' + '═'.repeat(60));
  console.log('  🚀 Prueba No Funcional: ${safeName}');
  console.log('  🌐 URL: ${safeUrl}');
  console.log('  📋 Tipo: ${target.testType.toUpperCase()}');
  console.log('═'.repeat(60));

  ${testCall}

  printSummaryTable(NF_TARGET, summaries, '${target.testType}');
});
`;
}

// ─── Función principal ────────────────────────────────────────────────────────

function main(): void {
  console.log('\n' + '═'.repeat(60));
  console.log('  🔧 GENERADOR DE PRUEBAS NO FUNCIONALES');
  console.log('═'.repeat(60));

  if (NFConfig.targets.length === 0) {
    console.log(`
  ⚠️  No hay targets en NFConfig.targets.

  Edita el archivo:
    GenerateTest/non-functional/config/nf-config.ts

  Y añade recordings o APIs al array targets[].
`);
    return;
  }

  console.log(`\n  📋 Resolviendo ${NFConfig.targets.length} target(s)...\n`);
  const targets = resolveAllTargets();

  if (targets.length === 0) {
    console.error('  ❌ No se resolvió ningún target. Revisa la configuración.');
    return;
  }

  let generated = 0;
  let skipped = 0;

  for (const target of targets) {
    const dir      = path.join('GenerateTest', 'tests', target.suiteName, 'non-functional');
    const specFile = path.join(dir, `${target.suiteName}.nf.spec.ts`);

    // Verificar que la suite existe
    const suiteDir = path.join('GenerateTest', 'tests', target.suiteName);
    if (!fs.existsSync(suiteDir)) {
      console.warn(`  ⚠️  Suite no encontrada: ${suiteDir}`);
      console.warn(`       Ejecuta primero: npm run generate`);
      console.warn(`       O verifica que el nombre del recording/suite sea correcto.`);
      skipped++;
      continue;
    }

    // Crear directorio si no existe
    fs.mkdirSync(dir, { recursive: true });

    // Generar y escribir el spec
    const content = generateSpecContent(target);
    fs.writeFileSync(specFile, content, 'utf-8');

    console.log(`  ✅ Generado: ${specFile}`);
    generated++;
  }

  // ─── Resumen ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(`  📊 Generados: ${generated} spec(s) | Omitidos: ${skipped}`);
  if (generated > 0) {
    console.log(`
  ▶  Para ejecutar las pruebas no funcionales integradas:
       npx playwright test --project=non-functional

  ▶  Para incluir en el reporte HTML completo (todos los proyectos):
       npx playwright test

  ▶  Para ver el reporte:
       npx playwright show-report
`);
  }
  console.log('═'.repeat(60) + '\n');
}

main();
