import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://homebanking-demo-tests.netlify.app/');
  await page.getByRole('textbox', { name: 'Usuario' }).click();
  await page.getByRole('textbox', { name: 'Usuario' }).fill('demo');
  await page.getByRole('textbox', { name: 'Usuario' }).press('Tab');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('demo123');
  await page.getByRole('textbox', { name: 'Contraseña' }).press('Tab');
  await page.getByRole('checkbox', { name: 'Recordarme' }).press('Tab');
  await page.getByRole('button', { name: 'Ingresar' }).press('Enter');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('list').getByText('Transferencias').click();
  await page.locator('#source-account').selectOption('ACC002');
  await page.getByRole('spinbutton', { name: 'Monto' }).click();
  await page.getByRole('spinbutton', { name: 'Monto' }).fill('1003');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).click();
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('cloud 002');
  await page.getByRole('button', { name: 'Transferir' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText('Transferencia realizada').click();
});