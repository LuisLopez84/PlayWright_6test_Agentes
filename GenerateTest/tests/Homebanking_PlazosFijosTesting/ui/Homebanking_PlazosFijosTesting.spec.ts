
import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '@utils/smart-actions';

// Risk 6: timeouts configurables via variables de entorno
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);

test('Homebanking_PlazosFijosTesting', async ({ page }) => {
  await smartGoto(page, 'Homebanking_PlazosFijosTesting');

  await smartClick(page, `page.getByRole('textbox', { name: 'Usuario' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Usuario' })`, 'demo');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Contraseña' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Contraseña' })`, 'demo123');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('button', { name: 'Ingresar' })`);
  await smartClick(page, `page.getByRole('list').getByText('Plazos Fijos')`);
  await smartClick(page, `#deposit-source-account`);
  await smartClick(page, `page.getByRole('spinbutton', { name: 'Monto a invertir' })`);
  await smartFill(page, `page.getByRole('spinbutton', { name: 'Monto a invertir' })`, '1100');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartSelect(page, `page.getByLabel('Plazo')`, '360');
  await smartClick(page, `page.getByRole('button', { name: 'Crear Plazo Fijo' })`);
  await Promise.all([
    smartWaitForText(page, `Plazo fijo creado exitosamente`, VERIFY_TIMEOUT),
    smartClick(page, `page.getByRole('button', { name: 'Confirmar' })`),
  ]);
});
