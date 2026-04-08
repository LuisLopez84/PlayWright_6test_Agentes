
import { test, expect } from '@playwright/test';

test('performance MercadoLibre_Morrales', async ({ page }) => {
  const start = Date.now();
  await page.goto('https://www.mercadolibre.com.co');
  const load = Date.now() - start;
  const budget = process.env.PERF_BUDGET
  ? Number(process.env.PERF_BUDGET)
  : 10000;

expect(load).toBeLessThan(budget);
});
