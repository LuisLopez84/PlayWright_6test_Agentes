
import { test, expect } from '@playwright/test';

test('performance Homebanking_Transf', async ({ page }) => {
  const start = Date.now();
  await page.goto('https://homebanking-demo-tests.netlify.app');
  const load = Date.now() - start;
  const budget = process.env.PERF_BUDGET
  ? Number(process.env.PERF_BUDGET)
  : 10000;

expect(load).toBeLessThan(budget);
});
