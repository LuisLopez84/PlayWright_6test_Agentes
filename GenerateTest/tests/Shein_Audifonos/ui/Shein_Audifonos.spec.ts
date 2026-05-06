
import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartClick, smartFill } from '@utils/smart-actions';

// Risk 6: timeouts configurables via variables de entorno
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);

test('Shein_Audifonos', async ({ page }) => {
  await smartGoto(page, 'Shein_Audifonos');

  await smartClick(page, `page.getByText('Aceptar Todo', { exact: true })`);
  await smartClick(page, `page.getByRole('button', { name: 'Buscar: Musera' })`);
  await smartClick(page, `page.getByRole('button', { name: 'Buscar: Vestidos De Baño' })`);
  await smartFill(page, `page.getByRole('combobox', { name: 'Buscar:' })`, 'audifo');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartFill(page, `page.getByRole('combobox', { name: 'Buscar: audifo' })`, 'audifonos');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('button', { name: 'Buscar' })`);
  await smartClick(page, `page.getByText('STATUS:')`);
});
