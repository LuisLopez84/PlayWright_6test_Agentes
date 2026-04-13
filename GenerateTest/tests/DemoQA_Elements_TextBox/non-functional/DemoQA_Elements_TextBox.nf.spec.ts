/**
 * DemoQA_Elements_TextBox.nf.spec.ts
 *
 * Prueba NO FUNCIONAL (Carga / Rendimiento) — DemoQA_Elements_TextBox
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
 *     GenerateTest/tests/DemoQA_Elements_TextBox/non-functional/DemoQA_Elements_TextBox.nf.spec.ts
 */

import { test } from '@playwright/test';
import { NFConfig } from '../../../non-functional/config/nf-config';
import { runIncrementalTest, runSpikeTest } from '../../../non-functional/core/load-engine';
import { printSummaryTable } from '../../../non-functional/reporters/summary-reporter';
import type { LoadTarget } from '../../../non-functional/utils/target-resolver';

// ─── Target embebido (resuelto en tiempo de generación) ────────────────────
const NF_TARGET: LoadTarget = {
  name: 'DemoQA_Elements_TextBox',
  url: 'https://demoqa.com',
  method: 'GET',
  headers: {},
  body: undefined,
  type: 'recording',
};

// ─── Test ──────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });

test('Non-Functional — DemoQA_Elements_TextBox', async () => {
  // Sin timeout: las pruebas de carga pueden durar varios minutos
  test.setTimeout(0);

  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 Prueba No Funcional: DemoQA_Elements_TextBox');
  console.log('  🌐 URL: https://demoqa.com');
  console.log('  📋 Tipo: ' + NFConfig.testType.toUpperCase());
  console.log('═'.repeat(60));

  const summaries = NFConfig.testType === 'incremental'
    ? await runIncrementalTest(NF_TARGET, NFConfig.incremental, NFConfig.assertions)
    : await runSpikeTest(NF_TARGET, NFConfig.spike, NFConfig.assertions);

  printSummaryTable(NF_TARGET, summaries, NFConfig.testType);
});
