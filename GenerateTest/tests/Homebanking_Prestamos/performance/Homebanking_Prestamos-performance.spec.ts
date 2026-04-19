import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';

/**
 * Performance tests for Homebanking_Prestamos
 * Mide: tiempo de carga, LCP, CLS, TBT y número de recursos.
 * Budgets configurables via variables de entorno:
 *   PERF_BUDGET (ms, default 10000)
 *   LCP_BUDGET  (ms, default 4000)
 *   CLS_BUDGET  (score, default 0.25)
 *   TBT_BUDGET  (ms, default 600)
 *   MAX_RESOURCES (count, default 200)
 */
test.describe('Performance tests for Homebanking_Prestamos', () => {

  test('page load time', async ({ page }) => {
    const budget = process.env.PERF_BUDGET ? Number(process.env.PERF_BUDGET) : 10000;
    const start = Date.now();
    await page.goto('https://homebanking-demo-tests.netlify.app');
    await page.waitForLoadState('domcontentloaded');
    const domLoad = Date.now() - start;
    await page.waitForLoadState('load').catch(() => {});
    const fullLoad = Date.now() - start;
    console.log(`⏱ DOM: ${domLoad}ms | Full: ${fullLoad}ms | Budget: ${budget}ms`);
    expect(fullLoad, `Carga completa debe ser < ${budget}ms`).toBeLessThan(budget);
  });

  test('Core Web Vitals (LCP, CLS, TBT)', async ({ page }) => {
    await page.goto('https://homebanking-demo-tests.netlify.app');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const vitals = await page.evaluate(() => {
      return new Promise<{ lcp: number; cls: number; tbt: number }>((resolve) => {
        let lcp = 0, cls = 0, tbt = 0;
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
            for (const e of list.getEntries()) tbt += Math.max(0, e.duration - 50);
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

    const lcpBudget = Number(process.env.LCP_BUDGET  || 4000);
    const clsBudget = Number(process.env.CLS_BUDGET  || 0.25);
    const tbtBudget = Number(process.env.TBT_BUDGET  || 600);

    if (vitals.lcp > 0) expect(vitals.lcp).toBeLessThan(lcpBudget);
    expect(vitals.cls).toBeLessThan(clsBudget);
    if (vitals.tbt > 0) expect(vitals.tbt).toBeLessThan(tbtBudget);
  });

  test('network resources count', async ({ page }) => {
    let resourceCount = 0;
    page.on('request', req => {
      if (['document','script','stylesheet','image'].includes(req.resourceType())) resourceCount++;
    });
    await page.goto('https://homebanking-demo-tests.netlify.app');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const maxResources = Number(process.env.MAX_RESOURCES || 200);
    console.log(`📦 Recursos: ${resourceCount} (max: ${maxResources})`);
    expect(resourceCount).toBeLessThanOrEqual(maxResources);
  });

});
