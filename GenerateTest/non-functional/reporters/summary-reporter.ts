/**
 * summary-reporter.ts
 *
 * Renderiza un reporte de métricas estilo JMeter (Reporte Resumen) en stdout.
 *
 * Columnas:
 *   Escenario | Hilos | Peticiones | Prom(ms) | Mín(ms) | Máx(ms) | %Error | TPS
 *
 * Incluye una fila de TOTALES agregados al final.
 */

import { ScenarioSummary } from '../core/metrics-collector';
import { LoadTarget } from '../utils/target-resolver';

// ─── Utilidades de formateo ───────────────────────────────────────────────────

function pad(value: string | number, width: number, align: 'left' | 'right' = 'right'): string {
  const str = String(value);
  const padding = Math.max(0, width - str.length);
  const spaces = ' '.repeat(padding);
  return align === 'right' ? spaces + str : str + spaces;
}

function fmt(n: number, decimals = 0): string {
  return n.toFixed(decimals);
}

const LINE_WIDTH = 106;
const DOUBLE_LINE = '═'.repeat(LINE_WIDTH);
const SINGLE_LINE = '─'.repeat(LINE_WIDTH);

// ─── Cálculo de totales agregados ────────────────────────────────────────────

function computeTotals(summaries: ScenarioSummary[]): {
  totalRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  throughput: number;
} {
  const nonEmpty = summaries.filter((s) => s.totalRequests > 0);
  if (nonEmpty.length === 0) {
    return { totalRequests: 0, avgResponseTime: 0, minResponseTime: 0, maxResponseTime: 0, errorRate: 0, throughput: 0 };
  }

  const totalRequests = nonEmpty.reduce((a, s) => a + s.totalRequests, 0);
  const totalErrors = nonEmpty.reduce((a, s) => a + s.errorCount, 0);
  const totalElapsed = nonEmpty.reduce((a, s) => a + s.elapsedSeconds, 0);

  // Promedio ponderado por peticiones
  const weightedAvg = nonEmpty.reduce((a, s) => a + s.avgResponseTime * s.totalRequests, 0);
  const avgResponseTime = Math.round(weightedAvg / totalRequests);

  const minResponseTime = Math.min(...nonEmpty.map((s) => s.minResponseTime));
  const maxResponseTime = Math.max(...nonEmpty.map((s) => s.maxResponseTime));
  const errorRate = Math.round((totalErrors / totalRequests) * 10000) / 100;
  const throughput = Math.round((totalRequests / totalElapsed) * 100) / 100;

  return { totalRequests, avgResponseTime, minResponseTime, maxResponseTime, errorRate, throughput };
}

// ─── Función principal de reporte ────────────────────────────────────────────

/**
 * Imprime el reporte completo en stdout.
 * Formato de tabla compatible con cualquier terminal.
 */
export function printSummaryTable(
  target: LoadTarget,
  summaries: ScenarioSummary[],
  testType: 'incremental' | 'spike',
): void {
  const typeLabel = testType === 'incremental' ? 'ESCALONADA INCREMENTAL' : 'PICOS';
  const targetType = target.type === 'recording' ? 'Recording' : 'API';

  // ─── Cabecera ────────────────────────────────────────────────────────────
  console.log('\n' + DOUBLE_LINE);
  console.log(
    ` REPORTE NO FUNCIONAL (JMeter Summary) ` +
    `│ ${targetType}: ${target.name} ` +
    `│ Tipo: ${typeLabel}`,
  );
  console.log(` URL: ${target.url}`);
  console.log(DOUBLE_LINE);

  // ─── Encabezado de columnas ───────────────────────────────────────────────
  const header = [
    pad('Escen.', 7, 'left'),
    pad('Hilos', 7),
    pad('Peticiones', 11),
    pad('Prom(ms)', 10),
    pad('Mín(ms)', 9),
    pad('Máx(ms)', 9),
    pad('% Error', 9),
    pad('TPS', 10),
  ].join(' │ ');

  console.log(` ${header}`);
  console.log(SINGLE_LINE);

  // ─── Filas de escenarios ──────────────────────────────────────────────────
  for (const s of summaries) {
    if (s.totalRequests === 0) {
      const row = [
        pad(`#${s.scenarioIndex + 1}`, 7, 'left'),
        pad(s.threads, 7),
        pad('0', 11),
        pad('-', 10),
        pad('-', 9),
        pad('-', 9),
        pad('-', 9),
        pad('-', 10),
      ].join(' │ ');
      console.log(` ${row}`);
      continue;
    }

    const errorDisplay = s.errorRate === 0
      ? '0.00 %'
      : `${fmt(s.errorRate, 2)} %`;
    const errorColored = s.errorRate === 0
      ? errorDisplay
      : `\x1b[31m${errorDisplay}\x1b[0m`; // rojo si hay errores

    const row = [
      pad(`#${s.scenarioIndex + 1}`, 7, 'left'),
      pad(s.threads, 7),
      pad(s.totalRequests, 11),
      pad(s.avgResponseTime, 10),
      pad(s.minResponseTime, 9),
      pad(s.maxResponseTime, 9),
      pad(errorDisplay, 9),
      pad(fmt(s.throughput, 2), 10),
    ].join(' │ ');

    // Reemplazar errorDisplay por la versión coloreada para el output
    const rowColored = s.errorRate > 0
      ? row.replace(errorDisplay, errorColored)
      : row;
    console.log(` ${rowColored}`);
  }

  // ─── Fila de totales ──────────────────────────────────────────────────────
  console.log(SINGLE_LINE);
  const totals = computeTotals(summaries);

  if (totals.totalRequests > 0) {
    const errorTotalDisplay = totals.errorRate === 0
      ? '0.00 %'
      : `${fmt(totals.errorRate, 2)} %`;

    const totalRow = [
      pad('TOTAL', 7, 'left'),
      pad('-', 7),
      pad(totals.totalRequests, 11),
      pad(totals.avgResponseTime, 10),
      pad(totals.minResponseTime, 9),
      pad(totals.maxResponseTime, 9),
      pad(errorTotalDisplay, 9),
      pad(fmt(totals.throughput, 2), 10),
    ].join(' │ ');
    console.log(` ${totalRow}`);
  }

  console.log(DOUBLE_LINE);

  // ─── Leyenda ──────────────────────────────────────────────────────────────
  console.log(` Prom(ms) = Tiempo promedio │ Mín/Máx = Tiempos extremos │ TPS = Transacciones Por Segundo`);

  // ─── Semáforo de resultado ────────────────────────────────────────────────
  const totalErrorRate = totals.errorRate;
  if (totals.totalRequests === 0) {
    console.log(` ⚠️  Sin peticiones registradas.`);
  } else if (totalErrorRate === 0) {
    console.log(` \x1b[32m✅ RESULTADO: 0% de errores — Prueba EXITOSA\x1b[0m`);
  } else if (totalErrorRate < 5) {
    console.log(` \x1b[33m⚠️  RESULTADO: ${fmt(totalErrorRate, 2)}% de errores — Revisar\x1b[0m`);
  } else {
    console.log(` \x1b[31m❌ RESULTADO: ${fmt(totalErrorRate, 2)}% de errores — FALLO\x1b[0m`);
  }
  console.log(DOUBLE_LINE + '\n');
}
