import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.mercadolibre.com.co/');
  await page.getByRole('combobox', { name: 'Ingresa lo que quieras' }).click();
  await page.getByRole('combobox', { name: 'Ingresa lo que quieras' }).fill('audifonos');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.goto('https://listado.mercadolibre.com.co/audifonos');
  await page.getByRole('link', { name: 'Smartwatches y Accesorios' }).click();
  await page.getByRole('link', { name: 'Soy nuevo' }).click();
});