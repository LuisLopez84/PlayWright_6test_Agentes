
import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartClick, smartFill } from '@utils/smart-actions';

// Risk 6: timeouts configurables via variables de entorno
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);

test('MercadoLibre_Audifonos', async ({ page }) => {
  await smartGoto(page, 'MercadoLibre_Audifonos');

  await smartClick(page, `page.getByRole('combobox', { name: 'Ingresa lo que quieras' })`);
  await smartFill(page, `page.getByRole('combobox', { name: 'Ingresa lo que quieras' })`, 'audifonos');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('button', { name: 'Buscar' })`);
  await smartClick(page, `page.getByRole('link', { name: 'Smartwatches y Accesorios' })`);
  await smartClick(page, `page.getByRole('link', { name: 'Soy nuevo' })`);
});
