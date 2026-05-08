import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://homebanking-demo-tests.netlify.app/');
  await page.getByRole('textbox', { name: 'Usuario' }).click();
  await page.getByRole('textbox', { name: 'Usuario' }).fill('demo');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('demo123');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('list').getByText('Transferencias').click();
  await page.locator('#source-account').selectOption('ACC002');
  await page.getByRole('spinbutton', { name: 'Monto' }).click();
  await page.getByRole('spinbutton', { name: 'Monto' }).fill('1000');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).click();
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('c');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('C');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Casi final');
  await page.getByRole('button', { name: 'Transferir' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText('Transferencia realizada').click();
});