import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.mercadolibre.com.co/');
  await page.getByRole('combobox', { name: 'Ingresa lo que quieras' }).click();
  await page.getByRole('combobox', { name: 'Ingresa lo que quieras' }).press('CapsLock');
  await page.getByRole('combobox', { name: 'Ingresa lo que quieras' }).fill('M');
  await page.getByRole('combobox', { name: 'Ingresa lo que quieras' }).press('CapsLock');
  await page.getByRole('combobox', { name: 'Ingresa lo que quieras' }).fill('Morrales');
  await page.getByRole('option', { name: 'morrales hombre' }).getByRole('strong').click();
  await page.getByRole('listitem').filter({ hasText: /^Totto$/ }).click();
  await page.getByRole('link', { name: 'Totto', exact: true }).click();
  await page.getByRole('link', { name: 'Urbana', exact: true }).click();
  await page.getByRole('link', { name: 'Totto Mochila Ergonómica Mediana Expandible Porta Laptop 16 Con Bolsillo Secreto| Escuela - Oficina - Viaje| 13.36 L Grow 242 Negro Imagen - 1/8', exact: true }).click();
  await page.getByRole('button', { name: 'Comprar ahora' }).first().click();
  await page.goto('https://www.mercadolibre.com/jms/mco/lgz/msl/login/H4sIAAAAAAAEA1VR32vCMBD-XwLrk7MaG9sJZTBhb24wGANfQkyvNTNtYnK1uuH_vqvsYXs4SL77fuQu38y6xnQSLx7YisHZW6MNsgnzVmHtQitNRY3WEhQNwu9Vu5GigmoBIUS2-h6NGqiegESjVa1sBCKpHveytm4g7JZFmIkSzqTrlJUD7E4Gxu4_RYBjD5E41DDdSVlTyVseyRtH4B7Rx1WaDsMwbSFoVTlrdgGm2rVUafOV6j3og-sx3fWXR6ljqMvN-bg-8s1w73mo3Ckrsu3H9mW5xbdD7Z1p-8_De3LsVYcGL-U8aV0FpVcNJDT7uItys35diGWR8VzMi0S7DmmU0lc-iXvjveka6Twa141kns8LLkQ-Fwk9HjqUfbDlHX_2VOSUCb4QD3n2J5JdJ7SJiBKD0ge2wtADbdGPH6N-fWn8JS9ms5znOR2E4AW7_gDffPztywEAAA/user');
  await page.getByTestId('user_id').click();
  await page.getByTestId('user_id').fill('pruebas@pruebas.com.co');
  await page.getByRole('button', { name: 'Continuar' }).click();
});