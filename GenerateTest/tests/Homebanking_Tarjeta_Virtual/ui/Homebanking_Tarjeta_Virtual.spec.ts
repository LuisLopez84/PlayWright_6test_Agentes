
import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText } from '@utils/smart-actions';

// Risk 6: timeouts configurables via variables de entorno
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);

test('Homebanking_Tarjeta_Virtual', async ({ page }) => {
  await smartGoto(page, 'Homebanking_Tarjeta_Virtual');

  await smartClick(page, `page.getByRole('textbox', { name: 'Usuario' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Usuario' })`, 'demo');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Contraseña' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Contraseña' })`, 'demo123');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('button', { name: 'Ingresar' })`);
  await smartClick(page, `page.getByText('Tarjeta Virtual', { exact: true })`);
  await smartClick(page, `page.getByLabel('Sincronizar con cuenta:')`);
  await smartClick(page, `page.getByRole('button', { name: '+ Generar Nueva Tarjeta' })`);
  await smartWaitForText(page, `✅ Tarjeta virtual generada`, VERIFY_TIMEOUT);
});
