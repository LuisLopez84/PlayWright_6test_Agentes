/**
 * metrics-collector.ts
 *
 * Recolecta métricas de cada petición HTTP durante una prueba de carga.
 * JS es single-threaded → no hay race conditions al hacer push() desde múltiples
 * workers async (todos corren en el mismo event loop).
 *
 * Métricas equivalentes al reporte resumen de JMeter:
 *  - Número de peticiones enviadas
 *  - Tiempo promedio de respuesta
 *  - Tiempo mínimo de respuesta
 *  - Tiempo máximo de respuesta
 *  - Porcentaje de errores
 *  - Throughput (TPS — transacciones por segundo)
 */

export interface RequestResult {
  duration: number;    // ms
  statusCode: number;
  success: boolean;
  timestamp: number;   // epoch ms
}

export interface ScenarioSummary {
  scenarioIndex: number;
  threads: number;
  durationSeconds: number;
  totalRequests: number;
  avgResponseTime: number;   // ms
  minResponseTime: number;   // ms
  maxResponseTime: number;   // ms
  errorCount: number;
  errorRate: number;         // %
  throughput: number;        // TPS
  elapsedSeconds: number;    // tiempo real medido
}

export class MetricsCollector {
  private results: RequestResult[] = [];
  private startMs = 0;
  private endMs = 0;

  start(): void {
    this.startMs = Date.now();
    this.results = [];
  }

  end(): void {
    this.endMs = Date.now();
  }

  /**
   * Registra el resultado de una petición individual.
   * @param duration     Tiempo de respuesta en ms
   * @param statusCode   Código HTTP recibido (0 si hubo error de red)
   * @param success      true si cumple las aserciones configuradas
   */
  record(duration: number, statusCode: number, success: boolean): void {
    this.results.push({ duration, statusCode, success, timestamp: Date.now() });
  }

  /**
   * Calcula el resumen de métricas para el escenario.
   */
  getSummary(scenarioIndex: number, threads: number, durationSeconds: number): ScenarioSummary {
    const total = this.results.length;
    const elapsedSeconds = Math.max((this.endMs - this.startMs) / 1000, 0.001);

    if (total === 0) {
      return {
        scenarioIndex,
        threads,
        durationSeconds,
        totalRequests: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        errorCount: 0,
        errorRate: 0,
        throughput: 0,
        elapsedSeconds,
      };
    }

    const durations = this.results.map((r) => r.duration);
    const errors = this.results.filter((r) => !r.success).length;
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      scenarioIndex,
      threads,
      durationSeconds,
      totalRequests: total,
      avgResponseTime: Math.round(sum / total),
      minResponseTime: Math.min(...durations),
      maxResponseTime: Math.max(...durations),
      errorCount: errors,
      errorRate: Math.round((errors / total) * 10000) / 100,
      throughput: Math.round((total / elapsedSeconds) * 100) / 100,
      elapsedSeconds: Math.round(elapsedSeconds * 100) / 100,
    };
  }
}
