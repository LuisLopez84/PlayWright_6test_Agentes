
import { test, expect } from '@playwright/test';

test('visual Homebanking_Pruebas001', async ({ page }) => {
  await page.goto('https://homebanking-demo-tests.netlify.app');
  await expect(page).toHaveScreenshot('Homebanking_Pruebas001.png', { fullPage: true });
});
