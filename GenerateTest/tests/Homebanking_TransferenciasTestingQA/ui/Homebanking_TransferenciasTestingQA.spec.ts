
import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '@utils/smart-actions';

// Risk 6: timeouts configurables via variables de entorno
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);

test('Homebanking_TransferenciasTestingQA', async ({ page }) => {
  await smartGoto(page, 'Homebanking_TransferenciasTestingQA');

  await smartClick(page, `page.getByRole('textbox', { name: 'Usuario' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Usuario' })`, 'demo');
  await page.waitForTimeout(FILL_WAIT_MS);
  await page.keyboard.press('Tab');
  await smartFill(page, `page.getByRole('textbox', { name: 'Contraseña' })`, 'demo123');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('button', { name: 'Ingresar' })`);
  await smartClick(page, `page.getByRole('list').getByText('Transferencias')`);
  await smartSelect(page, `#source-account`, 'ACC002');
  await smartClick(page, `page.getByRole('spinbutton', { name: 'Monto' })`);
  await smartFill(page, `page.getByRole('spinbutton', { name: 'Monto' })`, '10000');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Descripción (opcional)' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Descripción (opcional)' })`, 'T');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartFill(page, `page.getByRole('textbox', { name: 'Descripción (opcional)' })`, 'Tranferencia prueba 15 2026');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('button', { name: 'Transferir' })`);
  await Promise.all([
    smartWaitForText(page, `Transferencia realizada`, VERIFY_TIMEOUT),
    smartClick(page, `page.getByRole('button', { name: 'Confirmar' })`),
  ]);
});
