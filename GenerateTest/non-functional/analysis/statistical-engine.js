'use strict';
/**
 * statistical-engine.js
 *
 * Motor de análisis estadístico no lineal para pruebas de carga (NF).
 * Implementa regresión logística (curva de saturación) equivalente a
 * scipy.optimize.curve_fit con modelo: f(x) = L / (1 + exp(-k*(x-x0)))
 *
 * Donde:
 *   L  = Capacidad máxima (TPS máximo teórico)
 *   k  = Velocidad de crecimiento de la curva
 *   x0 = Punto de inflexión / breakpoint (usuarios en punto más empinado)
 */

// ─── Función logística ──────────────────────────────────────────────────────

function logistic(x, L, k, x0) {
  const arg = Math.min(500, Math.max(-500, -k * (x - x0)));
  return L / (1 + Math.exp(arg));
}

// ─── Cálculo de SSE ─────────────────────────────────────────────────────────

function computeSSE(xs, ys, L, k, x0) {
  let sse = 0;
  for (let i = 0; i < xs.length; i++) {
    const diff = logistic(xs[i], L, k, x0) - ys[i];
    sse += diff * diff;
  }
  return sse;
}

// ─── Optimizador ADAM con gradientes numéricos ───────────────────────────────

function adamOptimize(xs, ys, L0, k0, x0_0) {
  let L = L0, k = k0, x0 = x0_0;
  const lr = 0.01;
  const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
  const h = 1e-4;
  const maxIter = 12000;

  let mL = 0, mk = 0, mx0 = 0;
  let vL = 0, vk = 0, vx0 = 0;

  let bestSSE = computeSSE(xs, ys, L, k, x0);
  let bestL = L, bestK = k, bestX0 = x0;

  for (let t = 1; t <= maxIter; t++) {
    const sse0 = computeSSE(xs, ys, L, k, x0);

    // Gradientes numéricos (diferencias finitas)
    const gL  = (computeSSE(xs, ys, L + h, k,     x0)     - sse0) / h;
    const gK  = (computeSSE(xs, ys, L,     k + h,  x0)     - sse0) / h;
    const gX0 = (computeSSE(xs, ys, L,     k,      x0 + h) - sse0) / h;

    // Actualización ADAM
    mL  = beta1 * mL  + (1 - beta1) * gL;
    mk  = beta1 * mk  + (1 - beta1) * gK;
    mx0 = beta1 * mx0 + (1 - beta1) * gX0;

    vL  = beta2 * vL  + (1 - beta2) * gL  * gL;
    vk  = beta2 * vk  + (1 - beta2) * gK  * gK;
    vx0 = beta2 * vx0 + (1 - beta2) * gX0 * gX0;

    const mLH  = mL  / (1 - Math.pow(beta1, t));
    const mkH  = mk  / (1 - Math.pow(beta1, t));
    const mx0H = mx0 / (1 - Math.pow(beta1, t));

    const vLH  = vL  / (1 - Math.pow(beta2, t));
    const vkH  = vk  / (1 - Math.pow(beta2, t));
    const vx0H = vx0 / (1 - Math.pow(beta2, t));

    L  = Math.max(1e-9, L  - lr * mLH  / (Math.sqrt(vLH)  + eps));
    k  = Math.max(1e-9, k  - lr * mkH  / (Math.sqrt(vkH)  + eps));
    x0 = x0 - lr * mx0H / (Math.sqrt(vx0H) + eps);

    if (sse0 < bestSSE) {
      bestSSE = sse0;
      bestL = L; bestK = k; bestX0 = x0;
    }

    // Criterio de parada
    const gradNorm = Math.sqrt(gL * gL + gK * gK + gX0 * gX0);
    if (gradNorm < 1e-9) break;
  }

  return { L: bestL, k: bestK, x0: bestX0, sse: bestSSE };
}

// ─── Ajuste logístico con múltiples puntos iniciales ────────────────────────

function fitLogistic(xs, ys) {
  if (xs.length < 3) return null;

  const yMax  = Math.max(...ys);
  const xMed  = xs[Math.floor(xs.length / 2)];
  const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;

  const guesses = [
    [yMax,        0.10, xMed],
    [yMax * 1.2,  0.05, xMed],
    [yMax * 1.5,  0.20, xMed * 0.8],
    [yMax,        0.50, xMed * 1.2],
    [yMax * 1.1,  0.30, xMed * 0.9],
    [yMax * 1.3,  0.15, xMed * 1.1],
    [yMax * 0.8,  0.08, xMean * 1.3],
    [yMax * 1.4,  0.25, xMean * 0.7],
  ];

  let best = null;
  let bestSSE = Infinity;

  for (const [L0, k0, x0_0] of guesses) {
    try {
      const r = adamOptimize(xs, ys, L0, k0, x0_0);
      if (r.sse < bestSSE && r.L > 0 && r.k > 0) {
        bestSSE = r.sse;
        best = r;
      }
    } catch (_) { /* ignorar fallos de convergencia */ }
  }

  return best;
}

// ─── Métricas de bondad de ajuste ───────────────────────────────────────────

function computeR2(ys, ypred) {
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const ssTot = ys.reduce((a, y) => a + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - ypred[i]) ** 2, 0);
  return ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
}

function computeRMSE(ys, ypred) {
  return Math.sqrt(ys.reduce((a, y, i) => a + (y - ypred[i]) ** 2, 0) / ys.length);
}

function computeMAE(ys, ypred) {
  return ys.reduce((a, y, i) => a + Math.abs(y - ypred[i]), 0) / ys.length;
}

function empiricalBreakpoint(xs, ys) {
  const yMax = Math.max(...ys);
  const threshold = 0.9 * yMax;
  for (let i = 0; i < xs.length; i++) {
    if (ys[i] >= threshold) return xs[i];
  }
  return xs[xs.length - 1];
}

// ─── Función principal de análisis ──────────────────────────────────────────

/**
 * Recibe el array de bloques NF extraídos por `extractNfTables` del portal
 * y devuelve un array de objetos de análisis estadístico.
 */
function analyzeNfBlocks(nfBlocks) {
  const analyses = [];

  for (const block of nfBlocks) {
    const valid = (block.rows || []).filter(r => r.tps != null && r.hilos != null && +r.tps > 0);
    if (valid.length < 2) continue;

    // Ordenar por hilos
    const sorted = [...valid].sort((a, b) => a.hilos - b.hilos);
    const xs = sorted.map(r => +r.hilos);
    const ys = sorted.map(r => +r.tps);

    const fitResult = fitLogistic(xs, ys);

    const entry = {
      name:          block.name  || 'Sin nombre',
      url:           block.url   || '',
      tipo:          block.tipo  || 'INCREMENTAL',
      xs,
      ys,
      scenarios:     sorted,
      tienesAjuste:  false,
      L:             null,
      k:             null,
      x0:            null,
      r2:            null,
      rmse:          null,
      mae:           null,
      breakpoint:    null,
      breakpointType:'empírico (90% TPS máx)',
      saturationPct: null,
      breakpoint95:  null,
      ypred:         [],
      residuals:     [],
      totalData:     block.total || null,
    };

    if (fitResult) {
      const { L, k, x0 } = fitResult;
      const ypred    = xs.map(x => logistic(x, L, k, x0));
      const residuals = ys.map((y, i) => y - ypred[i]);

      entry.tienesAjuste = true;
      entry.L            = L;
      entry.k            = k;
      entry.x0           = x0;
      entry.r2           = computeR2(ys, ypred);
      entry.rmse         = computeRMSE(ys, ypred);
      entry.mae          = computeMAE(ys, ypred);
      entry.ypred        = ypred;
      entry.residuals    = residuals;

      // Breakpoint: punto de inflexión x0 si está dentro del rango, si no empírico
      const xMin = Math.min(...xs);
      const xMax = Math.max(...xs);
      let bp   = x0;
      let bpType = 'logístico (inflexión de la curva)';

      if (bp <= 0 || bp < xMin * 0.5 || bp > xMax * 2.5) {
        bp     = empiricalBreakpoint(xs, ys);
        bpType = 'empírico (90% TPS máx)';
      }

      entry.breakpoint     = bp;
      entry.breakpointType = bpType;

      // Usuarios donde se alcanza el 95% de L: x0 + ln(19)/k
      if (k > 0) {
        entry.breakpoint95 = x0 + Math.log(19) / k;
      }

      // Porcentaje de saturación al máximo de carga probado
      if (L > 0) {
        entry.saturationPct = logistic(xMax, L, k, x0) / L * 100;
      }
    } else {
      entry.breakpoint = empiricalBreakpoint(xs, ys);
    }

    analyses.push(entry);
  }

  return analyses;
}

module.exports = { analyzeNfBlocks, logistic };
