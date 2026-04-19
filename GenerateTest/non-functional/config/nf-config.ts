/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║         CONFIGURACIÓN DE PRUEBAS NO FUNCIONALES (Carga / Rendimiento)       ║
 * ║                                                                              ║
 * ║  1. Configura targets (recordings o APIs) y parámetros de carga.            ║
 * ║  2. Ejecuta el generador para crear specs en GenerateTest/tests/:            ║
 * ║       npx ts-node GenerateTest/non-functional/generator/generate-nf-tests.ts║
 * ║  3. Los specs quedarán en GenerateTest/tests/<Suite>/non-functional/         ║
 * ║     y aparecerán en el reporte HTML junto con UI/API/Performance/etc.        ║
 * ║                                                                              ║
 * ║  Ejecución directa (sin integrar al reporte):                               ║
 * ║    npx playwright test --config GenerateTest/non-functional/nf.playwright.config.ts
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS INTERNOS — NO MODIFICAR
// ═══════════════════════════════════════════════════════════════════════════════

export interface IncrementalParams {
  /** Número de escenarios (mínimo 1). */
  scenarios: number;
  /** Hilos en el primer escenario. */
  initialThreads: number;
  /** Hilos en el último escenario (los intermedios se interpolan linealmente). */
  finalThreads: number;
  /** Duración en segundos de cada escenario. */
  durationPerScenarioSeconds: number;
}

export interface SpikeParams {
  /** Hilos por escenario — longitud = número de escenarios. Ej: [1, 8, 4, 10, 3] */
  threadsPerScenario: number[];
  /** Duración en segundos por escenario (mismo índice). Ej: [5, 5, 5, 5, 5] */
  durationPerScenarioSeconds: number[];
}

type NfTarget =
  | {
      type: 'recording';
      /** Nombre exacto del recording (sin ruta ni .ts). Ej: 'Homebankink_Transferencias' */
      recording: string;
      /**
       * Tipo de prueba para ESTE target (opcional).
       * Si se omite, usa el valor global `testType`.
       */
      testType?: 'incremental' | 'spike';
      /** Parámetros incrementales para este target (override del global). */
      incremental?: IncrementalParams;
      /** Parámetros spike para este target (override del global). */
      spike?: SpikeParams;
    }
  | {
      type: 'api';
      /**
       * Ruta al spec de API (relativa al raíz del proyecto).
       * Solo se usa para detectar el nombre de la suite.
       * Ej: 'GenerateTest/api-testing-rest-soap/rest/MiSuite_GET.spec.ts'
       */
      apiSpecPath: string;
      /** Endpoint real a someter a prueba de carga. */
      endpoint: {
        name: string;
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        url: string;
        headers?: Record<string, string>;
        body?: string;
      };
      /**
       * Tipo de prueba para ESTE target (opcional).
       * Si se omite, usa el valor global `testType`.
       */
      testType?: 'incremental' | 'spike';
      /** Parámetros incrementales para este target (override del global). */
      incremental?: IncrementalParams;
      /** Parámetros spike para este target (override del global). */
      spike?: SpikeParams;
    };

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN — EDITA ESTA SECCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

export const NFConfig: {
  targets: NfTarget[];
  assertions: { expectedStatusCodes: number[]; expectedResponseText: string };
  testType: 'incremental' | 'spike';
  incremental: IncrementalParams;
  spike: SpikeParams;
} = {

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 1 — TARGETS ******CONFIGURAR*******
  // Cada target genera un spec en GenerateTest/tests/<suiteName>/non-functional/
  // Cada target puede tener su propio testType, incremental y spike.
  // ─────────────────────────────────────────────────────────────────────────────
  targets: [

    // ── TARGET 1: Recording — Prueba INCREMENTAL ──────────────────────────────
    {
      type: 'recording',
      recording: 'Homebanking_PagoServicios', // Indicar el recording del flujo a cual se va a inyectar la prueba no funcional
      testType: 'incremental',
      incremental: {
        scenarios: 3,           // 5 escalones: 2 → 4 → 6 → 8 → 10 hilos
        initialThreads: 2,      // Primer escalón: 2 usuarios concurrentes
        finalThreads: 6,        // Último escalón: 6 usuarios concurrentes
        durationPerScenarioSeconds: 5, // Cada escalón dura 5 segundos
      },
    },

    // ── TARGET 2: API — Prueba de PICOS (spike) para SOAP ───────────────────────────────
    {
      type: 'api',
      apiSpecPath: 'GenerateTest/api-testing-rest-soap/soap/Homebanking_PagoServicios_Servicio_Operacion_POST_SOAP.spec.ts',
      endpoint: {
        name: 'Prueba Rendimiento Servicio SOAP PICOS',
        method: 'POST',
        url: 'http://www.dneonline.com/calculator.asmx',
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',   // SOAP — las claves con guión van entre comillas
          'SOAPAction': 'http://tempuri.org/Add',      // SOAP — obligatorio para identificar la operación
          // Si el endpoint requiere autenticación, descomentar y ajustar:
          // 'Authorization': 'Bearer EL_TOKEN',
        },
        body: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:Add>
      <tem:intA>5</tem:intA>
      <tem:intB>2</tem:intB>
    </tem:Add>
  </soapenv:Body>
</soapenv:Envelope>`,
      },
      testType: 'spike',
      spike: {
        threadsPerScenario: [1, 15, 4, 10, 3], // 5 picos: 1, 8, 4, 10, 3 hilos
        durationPerScenarioSeconds: [5, 5, 5, 5, 5], // Cada pico dura 5 segundos
      },
    },

    // Puedes agregar más targets aquí — cada uno con su propio testType:
    // {
    //   type: 'recording',
    //   recording: 'OtroRecording',
    //   testType: 'spike',
    //   spike: { threadsPerScenario: [5, 20], durationPerScenarioSeconds: [10, 10] },
    // },

// ── TARGET 3: API — Prueba de PICOS (spike) para REST ───────────────────────────────
//Descomentarear si se necesita enviar test no funcional a REST
//    {
//    type: 'api',
//    apiSpecPath: 'GenerateTest/api-testing-rest-soap/rest/Homebankink_Transferencias_ConsultaCliente_GET.spec.ts',
//    endpoint: {
//        name: 'Dashboard Cliente',
//        method: 'GET',
//        url: 'https://homebanking-demo.onrender.com/cliente/dashboard',
//        headers: { accept: 'application/json' },
//        },
//        testType: 'spike',
//        spike: {
//        threadsPerScenario: [1, 8, 4, 10, 3],
//        durationPerScenarioSeconds: [5, 5, 5, 5, 5],
//        },
//    },

  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 2 — ASERCIONES DE RESPUESTA (aplican a todos los targets)
  // ─────────────────────────────────────────────────────────────────────────────
  assertions: {
    /**
     * Códigos HTTP considerados exitosos.
     * [] = acepta cualquier código < 400 (2xx/3xx).
     */
    expectedStatusCodes: [200],
    /**
     * Texto que debe estar presente en el body de la respuesta.
     * '' = sin verificación de texto.
     */
    expectedResponseText: '',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // VALORES GLOBALES POR DEFECTO
  // Se usan cuando un target NO define su propio testType/incremental/spike.
  // ─────────────────────────────────────────────────────────────────────────────

  testType: 'incremental',

  incremental: {
    scenarios: 3,
    initialThreads: 10,
    finalThreads: 50,
    durationPerScenarioSeconds: 30,
  },

  spike: {
    threadsPerScenario: [10, 50, 5, 80, 20],
    durationPerScenarioSeconds: [30, 30, 30, 30, 30],
  },
};
