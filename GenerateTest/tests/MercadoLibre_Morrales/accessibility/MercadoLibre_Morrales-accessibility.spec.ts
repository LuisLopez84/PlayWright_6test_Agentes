
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('accessibility MercadoLibre_Morrales', async ({ page }) => {
  await page.goto('https://www.mercadolibre.com.co');
  const results = await new AxeBuilder({ page }).analyze();
  console.log("Violations:", results.violations.length);
});
