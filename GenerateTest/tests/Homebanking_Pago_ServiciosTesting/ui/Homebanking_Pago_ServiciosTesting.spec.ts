
import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '@utils/smart-actions';

// Risk 6: timeouts configurables via variables de entorno
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);

test('Homebanking_Pago_ServiciosTesting', async ({ page }) => {
  await smartGoto(page, 'Homebanking_Pago_ServiciosTesting');

  await smartClick(page, `page.getByRole('textbox', { name: 'Usuario' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Usuario' })`, 'demo');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Contraseña' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Contraseña' })`, 'demo123');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('button', { name: 'Ingresar' })`);
  await smartClick(page, `page.getByRole('list').getByText('Pago de Servicios')`);
  await smartSelect(page, `page.getByLabel('Selecciona el Servicio')`, 'SRV004');
  await smartClick(page, `page.getByRole('spinbutton', { name: 'Monto a Pagar' })`);
  await smartFill(page, `page.getByRole('spinbutton', { name: 'Monto a Pagar' })`, '2500');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartSelect(page, `page.getByLabel('Cuenta a Debitar')`, 'ACC003');
  await smartClick(page, `page.getByRole('button', { name: 'Pagar Servicio' })`);
  await smartWaitForText(page, `✅ ¡Pago Finalizado!`, VERIFY_TIMEOUT);
});
