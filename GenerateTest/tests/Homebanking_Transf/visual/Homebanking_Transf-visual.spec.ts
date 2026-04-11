
import { test, expect } from '@playwright/test';

test('visual Homebanking_Transf', async ({ page }) => {
  await page.goto('https://homebanking-demo-tests.netlify.app');
  await expect(page).toHaveScreenshot('Homebanking_Transf.png', { fullPage: true });
});
