
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('accessibility Homebanking_Transf', async ({ page }) => {
  await page.goto('https://homebanking-demo-tests.netlify.app');
  const results = await new AxeBuilder({ page }).analyze();
  console.log("Violations:", results.violations.length);
});
