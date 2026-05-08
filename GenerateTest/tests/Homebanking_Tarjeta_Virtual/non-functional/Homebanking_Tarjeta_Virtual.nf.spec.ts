/**
 * Homebanking_Tarjeta_Virtual.nf.spec.ts
 *
 * Prueba NO FUNCIONAL (Carga / Rendimiento) — Homebanking_Tarjeta_Virtual
 * Targets: 1 | Homebanking_Tarjeta_Virtual (incremental)
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
 *     GenerateTest/tests/Homebanking_Tarjeta_Virtual/non-functional/Homebanking_Tarjeta_Virtual.nf.spec.ts
 */

import { test } from '@playwright/test';
import { NFConfig } from '../../../non-functional/config/nf-config';
import { runIncrementalTest } from '../../../non-functional/core/load-engine';
import { printSummaryTable } from '../../../non-functional/reporters/summary-reporter';
import type { LoadTarget } from '../../../non-functional/utils/target-resolver';

// ─── Target 1: Homebanking_Tarjeta_Virtual [RECORDING] — INCREMENTAL ────
const NF_TARGET_0: LoadTarget = {
  name: 'Homebanking_Tarjeta_Virtual',
  url: 'https://homebanking-demo-tests.netlify.app',
  method: 'GET',
  headers: {},
  body: undefined,
  type: 'recording',
  testType: 'incremental',
  incremental: {
    "scenarios": 5,
    "initialThreads": 1,
    "finalThreads": 5,
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
    "scenarios": 5,
    "initialThreads": 1,
    "finalThreads": 5,
    "durationPerScenarioSeconds": 3
  }; // incremental

// ─── Test ──────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });

test('Non-Functional — Homebanking_Tarjeta_Virtual', async () => {
  test.setTimeout(0);

  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 Prueba No Funcional: Homebanking_Tarjeta_Virtual');
  console.log('  📋 Targets: 1 | Homebanking_Tarjeta_Virtual (incremental)');
  console.log('═'.repeat(60));

  // ── [1/1] Homebanking_Tarjeta_Virtual — INCREMENTAL ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 Homebanking_Tarjeta_Virtual | https://homebanking-demo-tests.netlify.app');
  console.log('  📋 Tipo: INCREMENTAL');
  const summaries_0 = await runIncrementalTest(NF_TARGET_0, NF_PARAMS_0, NFConfig.assertions);
  printSummaryTable(NF_TARGET_0, summaries_0, 'incremental');

  console.log('\n  ✅ Prueba no funcional completada: Homebanking_Tarjeta_Virtual\n');
});
