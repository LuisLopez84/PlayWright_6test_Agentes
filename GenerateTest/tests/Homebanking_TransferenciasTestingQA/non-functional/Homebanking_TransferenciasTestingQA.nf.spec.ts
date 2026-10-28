/**
 * Homebanking_TransferenciasTestingQA.nf.spec.ts
 *
 * Prueba NO FUNCIONAL (Carga / Rendimiento) — Homebanking_TransferenciasTestingQA
 * Targets: 4 | SOAP Calculator — INCREMENTAL (incremental), SOAP Calculator — PICOS (spike), REST Transferencias Dashboard — PICOS (spike), REST Transferencias Dashboard — INCREMENTAL (incremental)
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
 *     GenerateTest/tests/Homebanking_TransferenciasTestingQA/non-functional/Homebanking_TransferenciasTestingQA.nf.spec.ts
 */

import { test } from '@playwright/test';
import { NFConfig } from '../../../non-functional/config/nf-config';
import { runIncrementalTest, runSpikeTest } from '../../../non-functional/core/load-engine';
import { printSummaryTable } from '../../../non-functional/reporters/summary-reporter';
import type { LoadTarget } from '../../../non-functional/utils/target-resolver';

// ─── Target 1: SOAP Calculator — INCREMENTAL [API] — INCREMENTAL ────
const NF_TARGET_0: LoadTarget = {
  name: 'SOAP Calculator — INCREMENTAL',
  url: 'http://www.dneonline.com/calculator.asmx',
  method: 'POST',
  headers: {
    "Content-Type": "text/xml;charset=UTF-8",
    "SOAPAction": "http://tempuri.org/Add"
  },
  body: `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<Add xmlns="http://tempuri.org/">
<intA>5</intA>
<intB>2</intB>
</Add>
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

// ─── Target 2: SOAP Calculator — PICOS [API] — SPIKE ────
const NF_TARGET_1: LoadTarget = {
  name: 'SOAP Calculator — PICOS',
  url: 'http://www.dneonline.com/calculator.asmx',
  method: 'POST',
  headers: {
    "Content-Type": "text/xml;charset=UTF-8",
    "SOAPAction": "http://tempuri.org/Add"
  },
  body: `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<Add xmlns="http://tempuri.org/">
<intA>5</intA>
<intB>2</intB>
</Add>
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

// ─── Target 3: REST Transferencias Dashboard — PICOS [API] — SPIKE ────
const NF_TARGET_2: LoadTarget = {
  name: 'REST Transferencias Dashboard — PICOS',
  url: 'https://homebanking-demo.onrender.com/transferencias/',
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
const NF_PARAMS_2 = {
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

// ─── Target 4: REST Transferencias Dashboard — INCREMENTAL [API] — INCREMENTAL ────
const NF_TARGET_3: LoadTarget = {
  name: 'REST Transferencias Dashboard — INCREMENTAL',
  url: 'https://homebanking-demo.onrender.com/transferencias/',
  method: 'GET',
  headers: {
    "accept": "application/json"
  },
  body: undefined,
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
const NF_PARAMS_3 = {
    "scenarios": 5,
    "initialThreads": 1,
    "finalThreads": 5,
    "durationPerScenarioSeconds": 3
  }; // incremental

// ─── Test ──────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });

test('Non-Functional — Homebanking_TransferenciasTestingQA', async () => {
  test.setTimeout(0);

  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 Prueba No Funcional: Homebanking_TransferenciasTestingQA');
  console.log('  📋 Targets: 4 | SOAP Calculator — INCREMENTAL (incremental) + SOAP Calculator — PICOS (spike) + REST Transferencias Dashboard — PICOS (spike) + REST Transferencias Dashboard — INCREMENTAL (incremental)');
  console.log('═'.repeat(60));

  // ── [1/4] SOAP Calculator — INCREMENTAL — INCREMENTAL ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 SOAP Calculator — INCREMENTAL | http://www.dneonline.com/calculator.asmx');
  console.log('  📋 Tipo: INCREMENTAL');
  const summaries_0 = await runIncrementalTest(NF_TARGET_0, NF_PARAMS_0, NFConfig.assertions);
  printSummaryTable(NF_TARGET_0, summaries_0, 'incremental');

  // ── [2/4] SOAP Calculator — PICOS — SPIKE ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 SOAP Calculator — PICOS | http://www.dneonline.com/calculator.asmx');
  console.log('  📋 Tipo: SPIKE');
  const summaries_1 = await runSpikeTest(NF_TARGET_1, NF_PARAMS_1, NFConfig.assertions);
  printSummaryTable(NF_TARGET_1, summaries_1, 'spike');

  // ── [3/4] REST Transferencias Dashboard — PICOS — SPIKE ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 REST Transferencias Dashboard — PICOS | https://homebanking-demo.onrender.com/transferencias/');
  console.log('  📋 Tipo: SPIKE');
  const summaries_2 = await runSpikeTest(NF_TARGET_2, NF_PARAMS_2, NFConfig.assertions);
  printSummaryTable(NF_TARGET_2, summaries_2, 'spike');

  // ── [4/4] REST Transferencias Dashboard — INCREMENTAL — INCREMENTAL ─────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('  📡 REST Transferencias Dashboard — INCREMENTAL | https://homebanking-demo.onrender.com/transferencias/');
  console.log('  📋 Tipo: INCREMENTAL');
  const summaries_3 = await runIncrementalTest(NF_TARGET_3, NF_PARAMS_3, NFConfig.assertions);
  printSummaryTable(NF_TARGET_3, summaries_3, 'incremental');

  console.log('\n  ✅ Prueba no funcional completada: Homebanking_TransferenciasTestingQA\n');
});
