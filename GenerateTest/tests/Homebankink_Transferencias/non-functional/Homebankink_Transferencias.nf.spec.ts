/**
 * Homebankink_Transferencias.nf.spec.ts
 *
 * Prueba NO FUNCIONAL (Carga / Rendimiento) — Homebankink_Transferencias
 * Targets: 2 | Homebankink_Transferencias (incremental), Dashboard Cliente (spike)
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
 *     GenerateTest/tests/Homebankink_Transferencias/non-functional/Homebankink_Transferencias.nf.spec.ts
 */

import { test } from '@playwright/test';
import { NFConfig } from '../../../non-functional/config/nf-config';
import { runIncrementalTest, runSpikeTest } from '../../../non-functional/core/load-engine';
import { printSummaryTable } from '../../../non-functional/reporters/summary-reporter';
import type { LoadTarget } from '../../../non-functional/utils/target-resolver';

// ─── Target 1: Homebankink_Transferencias [RECORDING] — INCREMENTAL ────
const NF_TARGET_0: LoadTarget = {
  name: 'Homebankink_Transferencias',
  url: 'https://homebanking-demo-tests.netlify.app',
  method: 'GET',
  headers: {},
  body: undefined,
  type: 'recording',
  testType: 'incremental',
  incremental: {
    "scenarios": 3,
    "initialThreads": 2,
    "finalThreads": 6,
    "durationPerScenarioSeconds": 5
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
    "scenarios": 3,
    "initialThreads": 2,
    "finalThreads": 6,
    "durationPerScenarioSeconds": 5
  }; // incremental

// ─── Target 2: Dashboard Cliente [API] — SPIKE ────
const NF_TARGET_1: LoadTarget = {
  name: 'Dashboard Cliente',
  url: 'https://homebanking-demo.onrender.com/cliente/dashboard',
  method: 'GET',
  headers: {
    "accept": "application/json"
  },
  body: undefined,
  type: 'api',
  testType: 'spike',
  incremental: {
    "scenarios": 3,
    "initialThreads": 10,
    "finalThreads": 50,
    "durationPerScenarioSeconds": 30
  },
  spike: {
    "threadsPerScenario": [
      1,
      8,
      4,
      10,
      3
    ],
    "durationPerScenarioSeconds": [
      5,
      5,
      5,
      5,
      5
    ]
  },
};
const NF_PARAMS_1 = {
    "threadsPerScenario": [
      1,
      8,
      4,
      10,
      3
    ],
    "durationPerScenarioSeconds": [
      5,
      5,
      5,
      5,
      5
    ]
  }; // spike

// ─── Test ──────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });

test('Non-Functional — Homebankink_Transferencias', async () => {
  test.setTimeout(0);

  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 Prueba No Funcional: Homebankink_Transferencias');
  console.log('  📋 Targets: 2 | Homebankink_Transferencias (incremental) + Dashboard Cliente (spike)');
  console.log('═'.repeat(60));

  // ── [1/2] Homebankink_Transferencias — INCREMENTAL ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 Homebankink_Transferencias | https://homebanking-demo-tests.netlify.app');
  console.log('  📋 Tipo: INCREMENTAL');
  const summaries_0 = await runIncrementalTest(NF_TARGET_0, NF_PARAMS_0, NFConfig.assertions);
  printSummaryTable(NF_TARGET_0, summaries_0, 'incremental');

  // ── [2/2] Dashboard Cliente — SPIKE ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 Dashboard Cliente | https://homebanking-demo.onrender.com/cliente/dashboard');
  console.log('  📋 Tipo: SPIKE');
  const summaries_1 = await runSpikeTest(NF_TARGET_1, NF_PARAMS_1, NFConfig.assertions);
  printSummaryTable(NF_TARGET_1, summaries_1, 'spike');

  console.log('\n  ✅ Prueba no funcional completada: Homebankink_Transferencias\n');
});
