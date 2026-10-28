
import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '@utils/smart-actions';

// Risk 6: timeouts configurables via variables de entorno
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);

// Datos variables cargados desde "Homebanking_TransferenciasTestingQA.csv" (BoxTestData/)
const DDT_ROWS: Record<string, string>[] = [
  {
    "Usuario": "demo",
    "Contraseña": "demo123",
    "Monto": "500",
    "Descripción (opcional)": "Transferencia prueba IA 002"
  }
];

for (let __ddtIdx = 0; __ddtIdx < DDT_ROWS.length; __ddtIdx++) {
  const __ddtRow = DDT_ROWS[__ddtIdx];
  test(`Homebanking_TransferenciasTestingQA — Fila ${__ddtIdx + 1}/${DDT_ROWS.length}`, async ({ page }) => {
    console.log(`@@DDT_ROW_START@@\n${JSON.stringify({ row: __ddtIdx + 1, total: DDT_ROWS.length, data: __ddtRow })}\n@@DDT_ROW_END@@`);
    await smartGoto(page, 'Homebanking_TransferenciasTestingQA');

  await smartClick(page, `page.getByRole('textbox', { name: 'Usuario' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Usuario' })`, (__ddtRow['Usuario'] ?? 'demo'));
  await page.waitForTimeout(FILL_WAIT_MS);
  await page.keyboard.press('Tab');
  await smartFill(page, `page.getByRole('textbox', { name: 'Contraseña' })`, (__ddtRow['Contraseña'] ?? 'demo123'));
  await page.waitForTimeout(FILL_WAIT_MS);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await smartClick(page, `page.getByRole('button', { name: 'Ingresar' })`);
  await smartClick(page, `page.getByRole('list').getByText('Transferencias')`);
  await smartSelect(page, `#source-account`, 'ACC002');
  await smartClick(page, `page.getByRole('button', { name: 'Transferir' })`);
  await smartFill(page, `page.getByRole('spinbutton', { name: 'Monto' })`, (__ddtRow['Monto'] ?? '1555'));
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Descripción (opcional)' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Descripción (opcional)' })`, (__ddtRow['Descripción (opcional)'] ?? 'P'));
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartFill(page, `page.getByRole('textbox', { name: 'Descripción (opcional)' })`, 'Prueba ');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartFill(page, `page.getByRole('textbox', { name: 'Descripción (opcional)' })`, 'Prueba C');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartFill(page, `page.getByRole('textbox', { name: 'Descripción (opcional)' })`, 'Prueba Cobertura ');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartFill(page, `page.getByRole('textbox', { name: 'Descripción (opcional)' })`, 'Prueba Cobertura IA');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('button', { name: 'Transferir' })`);
  await Promise.all([
    smartWaitForText(page, `Transferencia realizada`, VERIFY_TIMEOUT),
    smartClick(page, `page.getByRole('button', { name: 'Confirmar' })`),
  ]);
  await smartClick(page, `page.getByRole('button', { name: 'Salir' })`);
  await smartClick(page, `page.getByRole('button', { name: 'Confirmar' })`);
  });
}
