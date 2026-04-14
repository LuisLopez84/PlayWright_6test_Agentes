/**
 * Homebankink_Transferencias.nf.spec.ts
 *
 * Prueba NO FUNCIONAL (Carga / Rendimiento) — Homebankink_Transferencias
 * Tipo: SPIKE
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
import { runSpikeTest } from '../../../non-functional/core/load-engine';
import { printSummaryTable } from '../../../non-functional/reporters/summary-reporter';
import type { LoadTarget } from '../../../non-functional/utils/target-resolver';

// ─── Target embebido (resuelto en tiempo de generación) ────────────────────
const NF_TARGET: LoadTarget = {
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

// ─── Parámetros de prueba embebidos (resueltos en tiempo de generación) ────
const NF_SPIKE = {
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
  };

// ─── Test ──────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });

test('Non-Functional — Homebankink_Transferencias', async () => {
  // Sin timeout: las pruebas de carga pueden durar varios minutos
  test.setTimeout(0);

  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 Prueba No Funcional: Dashboard Cliente');
  console.log('  🌐 URL: https://homebanking-demo.onrender.com/cliente/dashboard');
  console.log('  📋 Tipo: SPIKE');
  console.log('═'.repeat(60));

  const summaries = await runSpikeTest(NF_TARGET, NF_SPIKE, NFConfig.assertions);

  printSummaryTable(NF_TARGET, summaries, 'spike');
});
