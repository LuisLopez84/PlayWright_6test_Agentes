/**
 * Homebanking_PlazosFijosTesting.nf.spec.ts
 *
 * Prueba NO FUNCIONAL (Carga / Rendimiento) — Homebanking_PlazosFijosTesting
 * Targets: 1 | SOAP Calculator — INCREMENTAL (incremental)
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
 *     GenerateTest/tests/Homebanking_PlazosFijosTesting/non-functional/Homebanking_PlazosFijosTesting.nf.spec.ts
 */

import { test } from '@playwright/test';
import { NFConfig } from '../../../non-functional/config/nf-config';
import { runIncrementalTest } from '../../../non-functional/core/load-engine';
import { printSummaryTable } from '../../../non-functional/reporters/summary-reporter';
import type { LoadTarget } from '../../../non-functional/utils/target-resolver';

// ─── Target 1: SOAP Calculator — INCREMENTAL [API] — INCREMENTAL ────
const NF_TARGET_0: LoadTarget = {
  name: 'SOAP Calculator — INCREMENTAL',
  url: 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName',
  method: 'POST',
  headers: {
    "Content-Type": "text/xml;charset=UTF-8",
    "SOAPAction": "http://tempuri.org/Add"
  },
  body: `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<ListOfContinentsByName xmlns="http://www.oorsprong.org/websamples.countryinfo">
</ListOfContinentsByName>
</soap:Body>
</soap:Envelope>`,
  type: 'api',
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

test('Non-Functional — Homebanking_PlazosFijosTesting', async () => {
  test.setTimeout(0);

  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 Prueba No Funcional: Homebanking_PlazosFijosTesting');
  console.log('  📋 Targets: 1 | SOAP Calculator — INCREMENTAL (incremental)');
  console.log('═'.repeat(60));

  // ── [1/1] SOAP Calculator — INCREMENTAL — INCREMENTAL ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 SOAP Calculator — INCREMENTAL | http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName');
  console.log('  📋 Tipo: INCREMENTAL');
  const summaries_0 = await runIncrementalTest(NF_TARGET_0, NF_PARAMS_0, NFConfig.assertions);
  printSummaryTable(NF_TARGET_0, summaries_0, 'incremental');

  console.log('\n  ✅ Prueba no funcional completada: Homebanking_PlazosFijosTesting\n');
});
