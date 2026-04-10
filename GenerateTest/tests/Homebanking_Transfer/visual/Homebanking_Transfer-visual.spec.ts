
import { test, expect } from '@playwright/test';

test('visual Homebanking_Transfer', async ({ page }) => {
  await page.goto('https://homebanking-demo-tests.netlify.app');
  await expect(page).toHaveScreenshot('Homebanking_Transfer.png', { fullPage: true });
});
