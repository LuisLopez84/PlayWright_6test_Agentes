import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://homebanking-demo-tests.netlify.app/');
  await page.getByRole('textbox', { name: 'Usuario' }).click();
  await page.getByRole('textbox', { name: 'Usuario' }).fill('demo');
  await page.getByRole('textbox', { name: 'Usuario' }).press('Tab');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('demo123');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('list').getByText('Transferencias').click();
  await page.locator('#source-account').selectOption('ACC002');
  await page.getByRole('spinbutton', { name: 'Monto' }).click();
  await page.getByRole('spinbutton', { name: 'Monto' }).fill('1159');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).click();
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('P');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Proyecto ');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Proyecto P');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Proyecto Playwright 98%');
  await page.getByRole('button', { name: 'Transferir' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText('Transferencia realizada').click();
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText('Sesión cerrada correctamente').click();
});