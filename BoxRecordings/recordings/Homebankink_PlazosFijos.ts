import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://homebanking-demo-tests.netlify.app/');
  await page.getByRole('textbox', { name: 'Usuario' }).click();
  await page.getByRole('textbox', { name: 'Usuario' }).fill('demo');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('demo123');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('listitem').filter({ hasText: 'Plazos Fijos' }).click();
  await page.locator('#deposit-source-account').selectOption('ACC002');
  await page.getByRole('spinbutton', { name: 'Monto a invertir' }).click();
  await page.getByRole('spinbutton', { name: 'Monto a invertir' }).fill('2000');
  await page.getByLabel('Plazo').selectOption('360');
  await page.getByRole('button', { name: 'Crear Plazo Fijo' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText('Plazo fijo creado exitosamente').click();
});