/**
 * nf-performance.spec.ts
 *
 * Spec STANDALONE de pruebas no funcionales (runner independiente).
 * Útil para probar la configuración ANTES de generar los specs integrados.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  Ejecución directa (sin integración al reporte principal):          ║
 * ║    npx playwright test --config GenerateTest/non-functional/nf.playwright.config.ts
 * ║                                                                      ║
 * ║  Para integración completa en el reporte HTML:                      ║
 * ║    1. npx ts-node GenerateTest/non-functional/generator/generate-nf-tests.ts
 * ║    2. npx playwright test --project=non-functional                  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { test } from '@playwright/test';
import { NFConfig } from './config/nf-config';
import { resolveTargets } from './utils/target-resolver';
import { runIncrementalTest, runSpikeTest } from './core/load-engine';
import { printSummaryTable } from './reporters/summary-reporter';

// mode: 'parallel' permite que Playwright ejecute simultáneamente specs
// generados por generate-nf-tests.ts cuando hay más de un worker disponible.
test.describe.configure({ mode: 'parallel' });

test('Prueba No Funcional — Standalone', async () => {
  test.setTimeout(0);

  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 INICIANDO PRUEBA NO FUNCIONAL (standalone)');
  console.log('═'.repeat(60));

  const targets = resolveTargets(NFConfig);

  if (targets.length === 0) {
    console.log(`
  ⚠️  No hay targets configurados.
  Edita: GenerateTest/non-functional/config/nf-config.ts
  Añade recordings o apis al array targets[].
`);
    return;
  }

  console.log(`\n  📋 Targets: ${targets.length} — ejecutando en PARALELO`);
  for (const t of targets) {
    console.log(`     • [${t.type.toUpperCase()}] ${t.name} → ${t.url} | Tipo: ${t.testType.toUpperCase()}`);
  }

  // Todos los targets arrancan simultáneamente.
  // Las peticiones HTTP son I/O-bound, por lo que el event loop de Node las
  // distribuye sin bloquear: incremental y spike sobre la misma (o distinta) API
  // generan carga concurrente real.
  const results = await Promise.all(
    targets.map(async (target) => {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`  📡 [INICIO] ${target.name} | ${target.url} | Tipo: ${target.testType.toUpperCase()}`);

      const summaries = target.testType === 'incremental'
        ? await runIncrementalTest(target, target.incremental, NFConfig.assertions)
        : await runSpikeTest(target, target.spike, NFConfig.assertions);

      return { target, summaries };
    }),
  );

  // Imprimir todos los resúmenes una vez que todos los targets terminaron
  console.log('\n' + '═'.repeat(60));
  console.log('  📊 RESULTADOS FINALES');
  console.log('═'.repeat(60));
  for (const { target, summaries } of results) {
    printSummaryTable(target, summaries, target.testType);
  }

  console.log('\n  ✅ Prueba no funcional completada.\n');
});
