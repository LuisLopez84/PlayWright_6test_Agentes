
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('accessibility Mercadolibre_test', async ({ page }) => {
  await page.goto('https://www.mercadolibre.com.co');
  const results = await new AxeBuilder({ page }).analyze();
  console.log("Violations:", results.violations.length);
});
