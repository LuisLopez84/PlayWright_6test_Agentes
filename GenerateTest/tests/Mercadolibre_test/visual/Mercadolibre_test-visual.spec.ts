
import { test, expect } from '@playwright/test';

test('visual Mercadolibre_test', async ({ page }) => {
  await page.goto('https://www.mercadolibre.com.co');
  await expect(page).toHaveScreenshot('Mercadolibre_test.png', { fullPage: true });
});
