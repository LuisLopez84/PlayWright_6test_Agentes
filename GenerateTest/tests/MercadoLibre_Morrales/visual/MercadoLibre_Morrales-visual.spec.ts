
import { test, expect } from '@playwright/test';

test('visual MercadoLibre_Morrales', async ({ page }) => {
  await page.goto('https://www.mercadolibre.com.co');
  await expect(page).toHaveScreenshot('MercadoLibre_Morrales.png', { fullPage: true });
});
