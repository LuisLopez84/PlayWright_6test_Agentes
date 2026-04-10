import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.mercadolibre.com.co/');
  await page.getByRole('link', { name: 'Electrónica, Audio y Video' }).click();
  await page.getByRole('link', { name: 'Cables de Audio y Video' }).click();
  await page.getByRole('button', { name: 'Más tarde' }).click();
  await page.getByRole('link', { name: 'Adaptador Conversor' }).click();
  await page.locator('#other-sellers-item-MCO2484893448').getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.goto('https://www.mercadolibre.com/jms/mco/lgz/msl/login/H4sIAAAAAAAEAy2P3W7CMAyF3yXXiEIl1qqXew2EIi9xizfnZ4lbhhDvjttxZx-f75zkYThNFK3cM5rBgPfWQRGzM5lBxlSCJa-HwCpVEnyvLq0WKBBQsFQzPNagCf0nKrRGjcAV1QSzXO3I6aba1qUaVYt_ykVge8OvhVCvG_D2F_ydsapDIYoLMHm7tSk8JRWvIrkOTROQac_QHPulC_XbPHdaXMVKAfdjBikzamTOTA6EUvx__kfbHw5d23U6nE5tr6keHVNE_ev58nwB5jNfURYBAAA/notregistered');
  await page.getByTestId('login-link').click();
  await page.goto('https://www.mercadolibre.com.co/registration/marketplace/form?redirect_url=https%3A%2F%2Fmeli.la%2F18v7msj');
});