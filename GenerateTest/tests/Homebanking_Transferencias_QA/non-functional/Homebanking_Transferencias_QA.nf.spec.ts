/**
 * Homebanking_Transferencias_QA.nf.spec.ts
 *
 * Prueba NO FUNCIONAL (Carga / Rendimiento) — Homebanking_Transferencias_QA
 * Targets: 2 | Homebanking_Transferencias_QA (incremental), Prueba Rendimiento Servicio SOAP PICOS (spike)
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
 *     GenerateTest/tests/Homebanking_Transferencias_QA/non-functional/Homebanking_Transferencias_QA.nf.spec.ts
 */

import { test } from '@playwright/test';
import { NFConfig } from '../../../non-functional/config/nf-config';
import { runIncrementalTest, runSpikeTest } from '../../../non-functional/core/load-engine';
import { printSummaryTable } from '../../../non-functional/reporters/summary-reporter';
import type { LoadTarget } from '../../../non-functional/utils/target-resolver';

// ─── Target 1: Homebanking_Transferencias_QA [RECORDING] — INCREMENTAL ────
const NF_TARGET_0: LoadTarget = {
  name: 'Homebanking_Transferencias_QA',
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

// ─── Target 2: Prueba Rendimiento Servicio SOAP PICOS [API] — SPIKE ────
const NF_TARGET_1: LoadTarget = {
  name: 'Prueba Rendimiento Servicio SOAP PICOS',
  url: 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName',
  method: 'POST',
  headers: {
    "Content-Type": "text/xml;charset=UTF-8",
    "SOAPAction": "http://tempuri.org/Add"
  },
  body: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<ListOfContinentsByName xmlns="http://www.oorsprong.org/websamples.countryinfo">
</ListOfContinentsByName>
</soap:Body>
</soap:Envelope>`,
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
      15,
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
      15,
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

test('Non-Functional — Homebanking_Transferencias_QA', async () => {
  test.setTimeout(0);

  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 Prueba No Funcional: Homebanking_Transferencias_QA');
  console.log('  📋 Targets: 2 | Homebanking_Transferencias_QA (incremental) + Prueba Rendimiento Servicio SOAP PICOS (spike)');
  console.log('═'.repeat(60));

  // ── [1/2] Homebanking_Transferencias_QA — INCREMENTAL ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 Homebanking_Transferencias_QA | https://homebanking-demo-tests.netlify.app');
  console.log('  📋 Tipo: INCREMENTAL');
  const summaries_0 = await runIncrementalTest(NF_TARGET_0, NF_PARAMS_0, NFConfig.assertions);
  printSummaryTable(NF_TARGET_0, summaries_0, 'incremental');

  // ── [2/2] Prueba Rendimiento Servicio SOAP PICOS — SPIKE ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 Prueba Rendimiento Servicio SOAP PICOS | http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName');
  console.log('  📋 Tipo: SPIKE');
  const summaries_1 = await runSpikeTest(NF_TARGET_1, NF_PARAMS_1, NFConfig.assertions);
  printSummaryTable(NF_TARGET_1, summaries_1, 'spike');

  console.log('\n  ✅ Prueba no funcional completada: Homebanking_Transferencias_QA\n');
});
