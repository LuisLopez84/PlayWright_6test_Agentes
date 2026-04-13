/**
 * load-engine.ts
 *
 * Motor de carga concurrente usando Promise.all.
 *
 * Cada "worker" es una función async que hace peticiones en bucle durante
 * `durationMs` milisegundos. Como las peticiones HTTP son I/O-bound, el
 * event loop de Node.js las ejecuta verdaderamente en paralelo a nivel de red.
 *
 * Tipos de prueba soportados:
 *  - INCREMENTAL: hilos suben linealmente de initialThreads a finalThreads
 *  - PICOS: cada escenario tiene su propio número de hilos (definidos explícitamente)
 */

import { makeRequest } from './http-client';
import { MetricsCollector, ScenarioSummary } from './metrics-collector';
import { LoadTarget } from '../utils/target-resolver';

// ─── Tipos de configuración ───────────────────────────────────────────────────

export interface Assertions {
  expectedStatusCodes: number[];
  expectedResponseText: string;
}

export interface IncrementalConfig {
  scenarios: number;
  initialThreads: number;
  finalThreads: number;
  durationPerScenarioSeconds: number;
}

export interface SpikeConfig {
  threadsPerScenario: number[];
  durationPerScenarioSeconds: number[];
}

// ─── Worker individual ────────────────────────────────────────────────────────

/**
 * Un "usuario virtual" que envía peticiones en bucle hasta que se agota el tiempo.
 */
async function runVirtualUser(
  target: LoadTarget,
  durationMs: number,
  collector: MetricsCollector,
  assertions: Assertions,
): Promise<void> {
  const endTime = Date.now() + durationMs;

  while (Date.now() < endTime) {
    const start = Date.now();
    try {
      const result = await makeRequest(
        target.url,
        target.method,
        target.headers,
        target.body,
      );
      const elapsed = Date.now() - start;

      // Evaluar aserción de código de respuesta
      const statusOk = assertions.expectedStatusCodes.length > 0
        ? assertions.expectedStatusCodes.includes(result.statusCode)
        : result.statusCode >= 200 && result.statusCode < 400;

      // Evaluar aserción de texto en body
      const textOk = !assertions.expectedResponseText
        || result.body.includes(assertions.expectedResponseText);

      collector.record(elapsed, result.statusCode, statusOk && textOk);
    } catch {
      const elapsed = Date.now() - start;
      // Error de red → statusCode=0, success=false
      collector.record(elapsed, 0, false);
    }
  }
}

// ─── Ejecutor de un escenario ─────────────────────────────────────────────────

/**
 * Lanza N workers concurrentes durante `durationMs` y retorna las métricas.
 */
async function runScenario(
  target: LoadTarget,
  threads: number,
  durationMs: number,
  scenarioIndex: number,
  assertions: Assertions,
): Promise<ScenarioSummary> {
  const durationSec = durationMs / 1000;
  console.log(
    `  ▶ Escenario ${scenarioIndex + 1} | ${threads} hilos | ${durationSec}s | URL: ${target.url}`,
  );

  const collector = new MetricsCollector();
  collector.start();

  await Promise.all(
    Array.from({ length: threads }, () =>
      runVirtualUser(target, durationMs, collector, assertions),
    ),
  );

  collector.end();
  return collector.getSummary(scenarioIndex, threads, durationSec);
}

// ─── Prueba escalonada incremental ────────────────────────────────────────────

/**
 * Ejecuta N escenarios subiendo los hilos linealmente de initialThreads a finalThreads.
 * Los escenarios intermedios se interpolan automáticamente.
 */
export async function runIncrementalTest(
  target: LoadTarget,
  config: IncrementalConfig,
  assertions: Assertions,
): Promise<ScenarioSummary[]> {
  const summaries: ScenarioSummary[] = [];
  const n = Math.max(1, config.scenarios);

  console.log(
    `\n  🔼 Prueba INCREMENTAL — ${n} escenarios | ${config.initialThreads}→${config.finalThreads} hilos | ${config.durationPerScenarioSeconds}s/escenario`,
  );

  for (let i = 0; i < n; i++) {
    const threads = n === 1
      ? config.initialThreads
      : Math.round(
          config.initialThreads +
            (i / (n - 1)) * (config.finalThreads - config.initialThreads),
        );

    const summary = await runScenario(
      target,
      threads,
      config.durationPerScenarioSeconds * 1000,
      i,
      assertions,
    );
    summaries.push(summary);

    // Pausa entre escenarios para que el servidor se estabilice
    if (i < n - 1) {
      console.log(`  ⏸  Pausa 3s entre escenarios...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  return summaries;
}

// ─── Prueba de picos ──────────────────────────────────────────────────────────

/**
 * Ejecuta N escenarios con hilos y duraciones configurados explícitamente.
 */
export async function runSpikeTest(
  target: LoadTarget,
  config: SpikeConfig,
  assertions: Assertions,
): Promise<ScenarioSummary[]> {
  const summaries: ScenarioSummary[] = [];
  const n = config.threadsPerScenario.length;

  if (n === 0) {
    console.warn('  ⚠️  spike.threadsPerScenario está vacío — no se ejecutan escenarios');
    return summaries;
  }

  // Verificar que las duraciones estén alineadas
  const durations = config.durationPerScenarioSeconds;
  if (durations.length !== n) {
    console.warn(
      `  ⚠️  spike.durationPerScenarioSeconds tiene ${durations.length} elementos pero threadsPerScenario tiene ${n}. Se usará el último valor disponible.`,
    );
  }

  console.log(
    `\n  ⚡ Prueba de PICOS — ${n} escenarios | hilos: [${config.threadsPerScenario.join(', ')}]`,
  );

  for (let i = 0; i < n; i++) {
    const threads = config.threadsPerScenario[i] ?? 10;
    const durationSec = durations[i] ?? durations[durations.length - 1] ?? 30;

    const summary = await runScenario(
      target,
      threads,
      durationSec * 1000,
      i,
      assertions,
    );
    summaries.push(summary);

    if (i < n - 1) {
      console.log(`  ⏸  Pausa 3s entre escenarios...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  return summaries;
}
