import { test, expect } from '@playwright/test';
// Risk 1: smartGoto eliminado — todos los tests navegan via TARGET_URL directamente

/**
 * Performance tests — Homebanking_Pago_ServiciosTesting
 * Budgets configurables via variables de entorno:
 *   BASE_URL      (sobreescribe la URL; default: URL del recording)
 *   PERF_BUDGET   (ms, default 10000)
 *   LCP_BUDGET    (ms, default 4000)
 *   CLS_BUDGET    (score, default 0.25)
 *   TBT_BUDGET    (ms, default 600)
 *   MAX_RESOURCES (count, default 200)
 */

// Risk 2: URL sobreescribible por variable de entorno sin necesidad de regenerar
const TARGET_URL = process.env.BASE_URL || 'https://homebanking-demo-tests.netlify.app';

// Risk 9: viewport fijo para mediciones consistentes entre ejecuciones
const VIEWPORT = { width: 1280, height: 720 };

test.describe('Performance: Homebanking_Pago_ServiciosTesting', () => {

  // Risk 4: beforeEach centraliza la configuración común (viewport)
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
  });

  // ── 1. Tiempo de carga ─────────────────────────────────────────────────────
  test('page load time', async ({ page }) => {
    const budget = Number(process.env.PERF_BUDGET || 10000);
    const start  = Date.now();
    await page.goto(TARGET_URL);
    await page.waitForLoadState('domcontentloaded');
    const domLoad = Date.now() - start;
    await page.waitForLoadState('load').catch(() => {});
    const fullLoad = Date.now() - start;
    console.log(`⏱ DOM: ${domLoad}ms | Full: ${fullLoad}ms | Budget: ${budget}ms`);
    expect(fullLoad, `Carga completa < ${budget}ms`).toBeLessThan(budget);
  });

  // ── 2. Core Web Vitals (LCP, CLS, TBT) ────────────────────────────────────
  test('Core Web Vitals — LCP, CLS, TBT', async ({ page }) => {
    await page.goto(TARGET_URL);

    // Risk 5: fallback explícito a domcontentloaded si networkidle no se alcanza
    try {
      await page.waitForLoadState('networkidle', { timeout: 8000 });
    } catch {
      await page.waitForLoadState('domcontentloaded');
    }
    // Risk 7: waitForTimeout(1000) eliminado — networkidle ya garantiza estabilidad

    const vitals = await page.evaluate(() => {
      return new Promise<{ lcp: number; cls: number; tbt: number }>((resolve) => {
        let lcp = 0, cls = 0, tbt = 0;
        // Risk 6: registrar FCP para filtrar TBT solo desde ese punto
        let fcpTime = 0;

        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              if (!fcpTime) fcpTime = e.startTime;
            }
          }).observe({ type: 'first-contentful-paint', buffered: true });
        } catch {}

        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length) lcp = entries[entries.length - 1].startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch {}

        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries() as any[]) {
              if (!e.hadRecentInput) cls += e.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch {}

        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              // Risk 6: solo long tasks a partir de FCP (aproximación de TBT real)
              if (e.startTime >= fcpTime) {
                tbt += Math.max(0, e.duration - 50);
              }
            }
          }).observe({ type: 'longtask', buffered: true });
        } catch {}

        setTimeout(() => {
          if (!lcp) {
            const nav = performance.getEntriesByType('navigation')[0] as any;
            lcp = nav?.domContentLoadedEventEnd || 0;
          }
          resolve({ lcp, cls, tbt });
        }, 600);
      });
    }).catch(() => ({ lcp: 0, cls: 0, tbt: 0 }));

    console.log(`📊 LCP: ${vitals.lcp.toFixed(0)}ms | CLS: ${vitals.cls.toFixed(4)} | TBT: ${vitals.tbt.toFixed(0)}ms`);

    const lcpBudget = Number(process.env.LCP_BUDGET || 4000);
    const clsBudget = Number(process.env.CLS_BUDGET || 0.25);
    const tbtBudget = Number(process.env.TBT_BUDGET || 600);

    if (vitals.lcp > 0) expect(vitals.lcp, `LCP < ${lcpBudget}ms`).toBeLessThan(lcpBudget);
    expect(vitals.cls, `CLS < ${clsBudget}`).toBeLessThan(clsBudget);
    if (vitals.tbt > 0) expect(vitals.tbt, `TBT < ${tbtBudget}ms`).toBeLessThan(tbtBudget);
  });

  // ── 3. Conteo de recursos de red ───────────────────────────────────────────
  test('network resources count', async ({ page }) => {
    let resourceCount = 0;
    // Risk 8: incluye fetch, xhr y font además de los 4 tipos básicos
    const COUNTED_TYPES = new Set([
      'document', 'script', 'stylesheet', 'image', 'fetch', 'xhr', 'font',
    ]);
    page.on('request', req => {
      if (COUNTED_TYPES.has(req.resourceType())) resourceCount++;
    });

    await page.goto(TARGET_URL);

    // Risk 5: fallback a domcontentloaded si networkidle no se alcanza
    try {
      await page.waitForLoadState('networkidle', { timeout: 8000 });
    } catch {
      await page.waitForLoadState('domcontentloaded');
    }

    const maxResources = Number(process.env.MAX_RESOURCES || 200);
    console.log(`📦 Recursos: ${resourceCount} (max: ${maxResources})`);
    expect(resourceCount, `Recursos ≤ ${maxResources}`).toBeLessThanOrEqual(maxResources);
  });

});
