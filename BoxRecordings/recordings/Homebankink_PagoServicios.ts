import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://homebanking-demo-tests.netlify.app/');
  await page.getByRole('textbox', { name: 'Usuario' }).click();
  await page.getByRole('textbox', { name: 'Usuario' }).fill('demo');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('demo123');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('list').getByText('Pago de Servicios').click();
  await page.getByLabel('Selecciona el Servicio').selectOption('SRV003');
  await page.getByRole('spinbutton', { name: 'Monto a Pagar' }).click();
  await page.getByRole('spinbutton', { name: 'Monto a Pagar' }).fill('2750');
  await page.getByLabel('Cuenta a Debitar').selectOption('ACC002');
  await page.getByRole('button', { name: 'Pagar Servicio' }).click();
  await page.getByText('✅ ¡Pago Finalizado!').click();
});