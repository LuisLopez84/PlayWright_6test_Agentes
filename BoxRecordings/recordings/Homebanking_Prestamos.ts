import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://homebanking-demo-tests.netlify.app/');
  await page.getByRole('textbox', { name: 'Usuario' }).click();
  await page.getByRole('textbox', { name: 'Usuario' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Usuario' }).fill('demo');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('demo123');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('list').getByText('Préstamos').click();
  await page.locator('#loan-destination-account').selectOption('ACC002');
  await page.getByRole('spinbutton', { name: 'Monto a solicitar' }).click();
  await page.getByRole('spinbutton', { name: 'Monto a solicitar' }).fill('5555');
  await page.getByLabel('Cuotas').selectOption('24');
  await page.getByRole('button', { name: 'Solicitar Préstamo' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText('Préstamo acreditado').click();
});