/**
 * generate-nf-tests.ts
 *
 * Genera specs de prueba no funcional en GenerateTest/tests/<Suite>/non-functional/
 * a partir de la configuración en nf-config.ts.
 *
 * Regla: se genera UN solo spec por suite que ejecuta TODOS los targets
 * de esa suite en secuencia, mostrando la grilla de resultados de cada uno.
 *
 * Ejecución:
 *   npx ts-node GenerateTest/non-functional/generator/generate-nf-tests.ts
 *   npm run generate:nf
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

  suites.sort((a, b) => b.length - a.length);

  for (const suite of suites) {
    if (filename.startsWith(suite)) return suite;
  }

  const parts = filename.split(/_(GET|POST|PUT|PATCH|DELETE|Servicio)/i);
  if (parts.length > 1) {
    const candidate = parts[0].trim();
    if (suites.includes(candidate)) return candidate;
  }

  console.warn(`  ⚠️  No se encontró suite para: ${apiSpecPath}`);
  return null;
}

// ─── Resolver de todos los targets ───────────────────────────────────────────

function resolveAllTargets(): ResolvedTarget[] {
  const resolved: ResolvedTarget[] = [];

  for (const t of NFConfig.targets) {
    const testType    = t.testType    ?? NFConfig.testType;
    const incremental = t.incremental ?? NFConfig.incremental;
    const spike       = t.spike       ?? NFConfig.spike;

    if (t.type === 'recording') {
      const url = resolveRecordingURL(t.recording);
      if (!url) {
        console.error(`  ❌ Recording "${t.recording}": no se encontró URL.`);
        continue;
      }
      resolved.push({
        suiteName: t.recording,
        targetName: t.recording,
        url, method: 'GET', headers: {}, body: undefined,
        type: 'recording', testType, incremental, spike,
      });
      console.log(`  ✅ Recording "${t.recording}" → ${url} | ${testType.toUpperCase()}`);
    } else {
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
        type: 'api', testType, incremental, spike,
      });
      console.log(`  ✅ API "${t.endpoint.name}" → suite: ${suiteName} | ${t.endpoint.url} | ${testType.toUpperCase()}`);
    }
  }

  return resolved;
}

// ─── Generador de spec (un spec por suite, todos los targets dentro) ──────────

function generateSpecContent(suiteName: string, targets: ResolvedTarget[]): string {
  const toNF = '../../../non-functional';

  // Necesitamos importar runIncrementalTest y/o runSpikeTest según los targets
  const needsIncremental = targets.some((t) => t.testType === 'incremental');
  const needsSpike       = targets.some((t) => t.testType === 'spike');
  const engineImports: string[] = [];
  if (needsIncremental) engineImports.push('runIncrementalTest');
  if (needsSpike)       engineImports.push('runSpikeTest');

  // ─── Constantes embebidas por target ────────────────────────────────────
  const targetBlocks = targets.map((t, i) => {
    const safeName    = t.targetName.replace(/'/g, "\\'");
    const safeUrl     = t.url.replace(/'/g, "\\'");
    const headersJson = JSON.stringify(t.headers, null, 2).replace(/\n/g, '\n  ');
    const bodyLit     = t.body ? `'${t.body.replace(/'/g, "\\'")}'` : 'undefined';
    const incJson     = JSON.stringify(t.incremental, null, 2).replace(/\n/g, '\n  ');
    const spikeJson   = JSON.stringify({
      threadsPerScenario: t.spike.threadsPerScenario,
      durationPerScenarioSeconds: t.spike.durationPerScenarioSeconds,
    }, null, 2).replace(/\n/g, '\n  ');

    const paramsConst = t.testType === 'incremental'
      ? `const NF_PARAMS_${i} = ${incJson}; // incremental`
      : `const NF_PARAMS_${i} = ${spikeJson}; // spike`;

    return `// ─── Target ${i + 1}: ${t.targetName} [${t.type.toUpperCase()}] — ${t.testType.toUpperCase()} ────
const NF_TARGET_${i}: LoadTarget = {
  name: '${safeName}',
  url: '${safeUrl}',
  method: '${t.method}',
  headers: ${headersJson},
  body: ${bodyLit},
  type: '${t.type}',
  testType: '${t.testType}',
  incremental: ${incJson},
  spike: ${spikeJson},
};
${paramsConst}`;
  }).join('\n\n');

  // ─── Cuerpo del test (ejecuta cada target en secuencia) ─────────────────
  const testBody = targets.map((t, i) => {
    const safeName = t.targetName.replace(/'/g, "\\'");
    const safeUrl  = t.url.replace(/'/g, "\\'");
    const call     = t.testType === 'incremental'
      ? `await runIncrementalTest(NF_TARGET_${i}, NF_PARAMS_${i}, NFConfig.assertions)`
      : `await runSpikeTest(NF_TARGET_${i}, NF_PARAMS_${i}, NFConfig.assertions)`;

    return `  // ── [${i + 1}/${targets.length}] ${t.targetName} — ${t.testType.toUpperCase()} ─────────────────────
  console.log('\\n' + '─'.repeat(60));
  console.log('  📡 ${safeName} | ${safeUrl}');
  console.log('  📋 Tipo: ${t.testType.toUpperCase()}');
  const summaries_${i} = ${call};
  printSummaryTable(NF_TARGET_${i}, summaries_${i}, '${t.testType}');`;
  }).join('\n\n');

  return `/**
 * ${suiteName}.nf.spec.ts
 *
 * Prueba NO FUNCIONAL (Carga / Rendimiento) — ${suiteName}
 * Targets: ${targets.length} | ${targets.map((t) => `${t.targetName} (${t.testType})`).join(', ')}
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
 *     GenerateTest/tests/${suiteName}/non-functional/${suiteName}.nf.spec.ts
 */

import { test } from '@playwright/test';
import { NFConfig } from '${toNF}/config/nf-config';
import { ${engineImports.join(', ')} } from '${toNF}/core/load-engine';
import { printSummaryTable } from '${toNF}/reporters/summary-reporter';
import type { LoadTarget } from '${toNF}/utils/target-resolver';

${targetBlocks}

// ─── Test ──────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });

test('Non-Functional — ${suiteName}', async () => {
  test.setTimeout(0);

  console.log('\\n' + '═'.repeat(60));
  console.log('  🚀 Prueba No Funcional: ${suiteName}');
  console.log('  📋 Targets: ${targets.length} | ${targets.map((t) => `${t.targetName} (${t.testType})`).join(' + ')}');
  console.log('═'.repeat(60));

${testBody}

  console.log('\\n  ✅ Prueba no funcional completada: ${suiteName}\\n');
});
`;
}

// ─── Función principal ────────────────────────────────────────────────────────

function main(): void {
  console.log('\n' + '═'.repeat(60));
  console.log('  🔧 GENERADOR DE PRUEBAS NO FUNCIONALES');
  console.log('═'.repeat(60));

  if (NFConfig.targets.length === 0) {
    console.log(`\n  ⚠️  No hay targets en NFConfig.targets.\n  Edita: GenerateTest/non-functional/config/nf-config.ts\n`);
    return;
  }

  console.log(`\n  📋 Resolviendo ${NFConfig.targets.length} target(s)...\n`);
  const allTargets = resolveAllTargets();

  if (allTargets.length === 0) {
    console.error('  ❌ No se resolvió ningún target. Revisa la configuración.');
    return;
  }

  // ─── Agrupar targets por suite ────────────────────────────────────────────
  const bySuite = new Map<string, ResolvedTarget[]>();
  for (const t of allTargets) {
    const list = bySuite.get(t.suiteName) ?? [];
    list.push(t);
    bySuite.set(t.suiteName, list);
  }

  console.log(`\n  📦 ${bySuite.size} suite(s) detectada(s):`);
  for (const [suite, targets] of bySuite) {
    console.log(`     • ${suite}: ${targets.length} target(s) → ${targets.map((t) => `${t.targetName}(${t.testType})`).join(', ')}`);
  }
  console.log('');

  let generated = 0;
  let skipped = 0;

  for (const [suiteName, suiteTargets] of bySuite) {
    const suiteDir = path.join('GenerateTest', 'tests', suiteName);
    const dir      = path.join(suiteDir, 'non-functional');
    const specFile = path.join(dir, `${suiteName}.nf.spec.ts`);

    if (!fs.existsSync(suiteDir)) {
      console.warn(`  ⚠️  Suite no encontrada: ${suiteDir}`);
      console.warn(`       Ejecuta primero: npm run generate`);
      skipped++;
      continue;
    }

    fs.mkdirSync(dir, { recursive: true });
    const content = generateSpecContent(suiteName, suiteTargets);
    fs.writeFileSync(specFile, content, 'utf-8');

    console.log(`  ✅ Generado: ${specFile} (${suiteTargets.length} target(s))`);
    generated++;
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  📊 Generados: ${generated} spec(s) | Omitidos: ${skipped}`);
  if (generated > 0) {
    console.log(`
  ▶  Para ejecutar:
       npx playwright test --project=non-functional

  ▶  Para ver el reporte:
       npx playwright show-report
`);
  }
  console.log('═'.repeat(60) + '\n');
}

main();
