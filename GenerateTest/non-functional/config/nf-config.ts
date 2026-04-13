/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          CONFIGURACIÓN DE PRUEBAS NO FUNCIONALES (Carga / Rendimiento)      ║
 * ║  Edita este archivo para definir QUÉ probar, CÓMO y con QUÉ parámetros.    ║
 * ║                                                                              ║
 * ║  Ejecución:                                                                  ║
 * ║    npx playwright test GenerateTest/non-functional/nf-performance.spec.ts   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export const NFConfig = {

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 1 — TARGETS: ¿Qué quieres probar?
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Nombres de grabaciones (recordings) a someter a prueba de carga.
   * Solo el nombre, sin ruta ni extensión .ts
   * Se usará el baseURL del metadata.json correspondiente.
   * Dejar [] para no ejecutar pruebas sobre recordings.
   *
   * Ejemplos:
   *   recordings: ['Homebankink_PagoServicios', 'Homebankink_PlazosFijos'],
   */
  recordings: [] as string[],

  /**
   * Endpoints de API a probar directamente.
   * Útil para pruebas específicas sobre servicios REST/SOAP.
   * Dejar [] para no ejecutar pruebas sobre APIs.
   *
   * Ejemplos:
   *   apis: [
   *     {
   *       name: 'Login API',
   *       method: 'POST',
   *       url: 'https://mi-api.com/users/login',
   *       headers: { 'Content-Type': 'application/json' },
   *       body: JSON.stringify({ email: 'test@test.com', password: '123' }),
   *     },
   *     {
   *       name: 'Contacts GET',
   *       method: 'GET',
   *       url: 'https://mi-api.com/contacts',
   *       headers: { 'Authorization': 'Bearer TOKEN_AQUI' },
   *     },
   *   ],
   */
  apis: [] as Array<{
    /** Nombre descriptivo para el reporte */
    name: string;
    /** Método HTTP */
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** URL completa del endpoint */
    url: string;
    /** Headers opcionales */
    headers?: Record<string, string>;
    /** Body de la petición (para POST/PUT/PATCH). JSON.stringify() si es objeto */
    body?: string;
  }>,

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 2 — ASERCIONES DE RESPUESTA
  // ═══════════════════════════════════════════════════════════════════════════
  assertions: {
    /**
     * Códigos HTTP que se consideran exitosos.
     * [] = acepta cualquier código 2xx/3xx (< 400).
     * Ejemplo: [200, 201] o [200]
     */
    expectedStatusCodes: [] as number[],

    /**
     * Texto que debe estar presente en el body de la respuesta.
     * '' = sin verificación de texto.
     * Ejemplo: '"success":true' o 'OK'
     */
    expectedResponseText: '',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 3 — TIPO DE PRUEBA
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * 'incremental' = Prueba escalonada incremental (sube hilos gradualmente)
   * 'spike'       = Prueba de picos (hilos definidos explícitamente por escenario)
   */
  testType: 'incremental' as 'incremental' | 'spike',

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 4a — CONFIGURACIÓN PRUEBA ESCALONADA INCREMENTAL
  //           (Solo aplica cuando testType === 'incremental')
  // ═══════════════════════════════════════════════════════════════════════════
  incremental: {
    /**
     * Número de escenarios a ejecutar.
     * Mínimo: 1
     */
    scenarios: 3,

    /**
     * Hilos (usuarios virtuales concurrentes) en el PRIMER escenario.
     * Ejemplo: 10
     */
    initialThreads: 10,

    /**
     * Hilos en el ÚLTIMO escenario.
     * Los escenarios intermedios se interpolan linealmente.
     * Ejemplo: si scenarios=3, initialThreads=10, finalThreads=50 →
     *   Escenario 1: 10 hilos
     *   Escenario 2: 30 hilos
     *   Escenario 3: 50 hilos
     */
    finalThreads: 50,

    /**
     * Duración en SEGUNDOS de cada escenario.
     * Ejemplo: 30 → cada escenario dura 30 segundos
     */
    durationPerScenarioSeconds: 30,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 4b — CONFIGURACIÓN PRUEBA DE PICOS
  //           (Solo aplica cuando testType === 'spike')
  // ═══════════════════════════════════════════════════════════════════════════
  spike: {
    /**
     * Número de hilos por cada escenario.
     * La longitud de este array determina el número de escenarios.
     *
     * Ejemplo:
     *   threadsPerScenario: [10, 50, 5, 80, 20]
     *   → 5 escenarios con 10, 50, 5, 80 y 20 hilos respectivamente
     */
    threadsPerScenario: [10, 50, 5, 80, 20] as number[],

    /**
     * Duración en SEGUNDOS por cada escenario.
     * Debe tener la misma longitud que threadsPerScenario.
     *
     * Ejemplo:
     *   durationPerScenarioSeconds: [30, 30, 30, 30, 30]
     *   → todos los escenarios duran 30 segundos
     *
     * También puedes variar tiempos:
     *   durationPerScenarioSeconds: [60, 30, 60, 30, 60]
     */
    durationPerScenarioSeconds: [30, 30, 30, 30, 30] as number[],
  },
};
