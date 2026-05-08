/**
 * Homebanking_TransferenciasTesting.nf.spec.ts
 *
 * Prueba NO FUNCIONAL (Carga / Rendimiento) — Homebanking_TransferenciasTesting
 * Targets: 1 | Homebanking_TransferenciasTesting (incremental)
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
 *   npx playwright test --project=non-functional \
 *     GenerateTest/tests/Homebanking_TransferenciasTesting/non-functional/Homebanking_TransferenciasTesting.nf.spec.ts
 */

import { test } from '@playwright/test';
import { NFConfig } from '../../../non-functional/config/nf-config';
import { runIncrementalTest } from '../../../non-functional/core/load-engine';
import { printSummaryTable } from '../../../non-functional/reporters/summary-reporter';
import type { LoadTarget } from '../../../non-functional/utils/target-resolver';

// ─── Target 1: Homebanking_TransferenciasTesting [RECORDING] — INCREMENTAL ────
const NF_TARGET_0: LoadTarget = {
  name: 'Homebanking_TransferenciasTesting',
  url: 'https://homebanking-demo-tests.netlify.app',
  method: 'GET',
  headers: {},
  body: undefined,
  type: 'recording',
  testType: 'incremental',
  incremental: {
    "scenarios": 6,
    "initialThreads": 1,
    "finalThreads": 6,
    "durationPerScenarioSeconds": 3
  },
  spike: {
    "threadsPerScenario": [
      10,
      50,
      5,
      80,
      20
    ],
    "durationPerScenarioSeconds": [
      30,
      30,
      30,
      30,
      30
    ]
  },
};
const NF_PARAMS_0 = {
    "scenarios": 6,
    "initialThreads": 1,
    "finalThreads": 6,
    "durationPerScenarioSeconds": 3
  }; // incremental

// ─── Test ──────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });

test('Non-Functional — Homebanking_TransferenciasTesting', async () => {
  test.setTimeout(0);

  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 Prueba No Funcional: Homebanking_TransferenciasTesting');
  console.log('  📋 Targets: 1 | Homebanking_TransferenciasTesting (incremental)');
  console.log('═'.repeat(60));

  // ── [1/1] Homebanking_TransferenciasTesting — INCREMENTAL ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 Homebanking_TransferenciasTesting | https://homebanking-demo-tests.netlify.app');
  console.log('  📋 Tipo: INCREMENTAL');
  const summaries_0 = await runIncrementalTest(NF_TARGET_0, NF_PARAMS_0, NFConfig.assertions);
  printSummaryTable(NF_TARGET_0, summaries_0, 'incremental');

  console.log('\n  ✅ Prueba no funcional completada: Homebanking_TransferenciasTesting\n');
});
