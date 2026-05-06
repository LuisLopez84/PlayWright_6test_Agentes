import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.shein.com.co/');
  await page.getByText('Aceptar Todo', { exact: true }).click();
  await page.getByRole('button', { name: 'Buscar: Musera' }).click();
  await page.getByRole('button', { name: 'Buscar: Vestidos De Baño' }).click();
  await page.getByRole('combobox', { name: 'Buscar:' }).fill('audifo');
  await page.getByRole('combobox', { name: 'Buscar: audifo' }).fill('audifonos');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByText('STATUS:').click();
});