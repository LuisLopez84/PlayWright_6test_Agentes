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

export const NFConfig = {

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 1 — TARGETS
  // Cada target genera un spec en GenerateTest/tests/<suiteName>/non-functional/
  // ═══════════════════════════════════════════════════════════════════════════

  targets: [

    // ─────────────────────────────────────────────────────────────────────────
    // OPCIÓN A: Recording (flujo de usuario grabado)
    // ─────────────────────────────────────────────────────────────────────────
    // Ejemplo A — recording (descomenta y reemplaza con el nombre de tu grabación):
    // {
    //   type: 'recording' as const,
    //   recording: 'DemoQA_Elements_TextBox',
    // },
    //
    // Ejemplo B — recording adicional:
    // {
    //   type: 'recording' as const,
    //   recording: 'Homebankink_PagoServicios',
    // },

    // ─────────────────────────────────────────────────────────────────────────
    // OPCIÓN B: API (endpoint específico)
    // ─────────────────────────────────────────────────────────────────────────
    // Indica el path al spec de API para detectar automáticamente el nombre
    // de la suite (y saber en qué carpeta GenerateTest/tests/<suite>/ colocar
    // el spec generado). Luego define el endpoint real a someter a carga.
    //
    // Ejemplo:
    // {
    //   type: 'api' as const,
    //   // Ruta al spec de API (relativa al raíz del proyecto)
    //   // Puede ser rest o soap — solo se usa para detectar la suite
    //   apiSpecPath: 'GenerateTest/api-testing-rest-soap/rest/Homebanking_Transf_Servicio_Operacion_PUT_Token.spec.ts',
    //   // Endpoint a someter a prueba de carga
    //   endpoint: {
    //     name: 'Homebanking Login',
    //     method: 'POST' as const,
    //     url: 'https://homebanking-demo-tests.netlify.app/api/login',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email: 'test@test.com', password: '123456' }),
    //   },
    // },

  ] as Array<
    | {
        type: 'recording';
        /** Nombre exacto del recording (sin ruta ni .ts) */
        recording: string;
      }
    | {
        type: 'api';
        /**
         * Ruta al spec de API (relativa al raíz del proyecto).
         * Se usa para extraer el nombre de la suite y ubicar el spec generado.
         * Ej: 'GenerateTest/api-testing-rest-soap/rest/Homebanking_Transf_Servicio_POST.spec.ts'
         */
        apiSpecPath: string;
        /** Endpoint real a someter a prueba de carga */
        endpoint: {
          name: string;
          method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
          url: string;
          headers?: Record<string, string>;
          body?: string;
        };
      }
  >,

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 2 — ASERCIONES DE RESPUESTA
  // ═══════════════════════════════════════════════════════════════════════════
  assertions: {
    /**
     * Códigos HTTP considerados exitosos.
     * [] = acepta cualquier código < 400 (2xx/3xx).
     * Ej: [200, 201] o [200]
     */
    expectedStatusCodes: [] as number[],

    /**
     * Texto que debe estar presente en el body de la respuesta.
     * '' = sin verificación de texto.
     * Ej: '"success":true' o 'OK'
     */
    expectedResponseText: '',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 3 — TIPO DE PRUEBA
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * 'incremental' = Prueba escalonada incremental (hilos suben gradualmente)
   * 'spike'       = Prueba de picos (hilos definidos explícitamente por escenario)
   */
  testType: 'incremental' as 'incremental' | 'spike',

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 4a — PRUEBA ESCALONADA INCREMENTAL
  //           (aplica cuando testType === 'incremental')
  // ═══════════════════════════════════════════════════════════════════════════
  incremental: {
    /**
     * Número de escenarios a ejecutar (mínimo 1).
     */
    scenarios: 3,

    /**
     * Hilos (usuarios virtuales concurrentes) en el PRIMER escenario.
     */
    initialThreads: 10,

    /**
     * Hilos en el ÚLTIMO escenario.
     * Los intermedios se interpolan linealmente.
     *
     * Ejemplo: scenarios=3, initial=10, final=50
     *   Escenario 1: 10 hilos
     *   Escenario 2: 30 hilos
     *   Escenario 3: 50 hilos
     */
    finalThreads: 50,

    /**
     * Duración en SEGUNDOS de cada escenario.
     */
    durationPerScenarioSeconds: 30,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 4b — PRUEBA DE PICOS
  //           (aplica cuando testType === 'spike')
  // ═══════════════════════════════════════════════════════════════════════════
  spike: {
    /**
     * Hilos por cada escenario — longitud = número de escenarios.
     *
     * Ejemplo: [10, 50, 5, 80, 20]
     * → 5 escenarios con 10, 50, 5, 80 y 20 hilos respectivamente
     */
    threadsPerScenario: [10, 50, 5, 80, 20] as number[],

    /**
     * Duración en SEGUNDOS por cada escenario (mismo índice).
     *
     * Ejemplo: [30, 30, 30, 30, 30] → todos duran 30s
     * O diferente por pico: [60, 30, 60, 30, 60]
     */
    durationPerScenarioSeconds: [30, 30, 30, 30, 30] as number[],
  },
};
