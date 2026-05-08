
import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartClick, smartFill, smartSelect } from '@utils/smart-actions';

// Risk 6: timeouts configurables via variables de entorno
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);

test('Homebanking_PrestamosTesting', async ({ page }) => {
  await smartGoto(page, 'Homebanking_PrestamosTesting');

  await smartClick(page, `page.getByRole('textbox', { name: 'Usuario' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Usuario' })`, 'demo');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Contraseña' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Contraseña' })`, 'demo123');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('button', { name: 'Ingresar' })`);
  await smartClick(page, `page.getByRole('list').getByText('Préstamos')`);
  await smartSelect(page, `#loan-destination-account`, 'ACC002');
  await smartClick(page, `page.getByRole('spinbutton', { name: 'Monto a solicitar' })`);
  await smartFill(page, `page.getByRole('spinbutton', { name: 'Monto a solicitar' })`, '2000');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartSelect(page, `page.getByLabel('Cuotas')`, '24');
  await smartClick(page, `page.getByRole('button', { name: 'Solicitar Préstamo' })`);
  await smartClick(page, `page.getByRole('button', { name: 'Confirmar' })`);
  await smartClick(page, `page.getByText('Préstamo acreditado')`);
});
