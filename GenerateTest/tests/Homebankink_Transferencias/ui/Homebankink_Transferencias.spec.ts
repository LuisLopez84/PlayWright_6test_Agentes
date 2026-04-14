
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('Homebankink_Transferencias', async ({ page }) => {
  await smartGoto(page, 'Homebankink_Transferencias');

  await smartClick(page, `Usuario`);
  await smartFill(page, `Usuario`, 'demo');
  await page.waitForTimeout(500);
  await page.keyboard.press('Tab');
  await smartFill(page, `Contraseña`, 'demo123');
  await page.waitForTimeout(500);
  await smartClick(page, `Ingresar`);
  await smartClick(page, `Transferencias`);
  await smartSelect(page, `#source-account`, 'ACC002');
  await smartClick(page, `Monto`);
  await smartFill(page, `Monto`, '1159');
  await page.waitForTimeout(500);
  await smartClick(page, `Descripción (opcional)`);
  await smartFill(page, `Descripción (opcional)`, 'Proyecto Playwright 98%');
  await page.waitForTimeout(500);
  await smartClick(page, `Transferir`);
  // Capturar toast transitorio en paralelo con el click de confirmación.
  await Promise.all([
    smartWaitForText(page, `Transferencia realizada`, 20000),
    smartClick(page, `Confirmar`),
  ]);
  await smartClick(page, `Salir`);
  await smartClick(page, `Confirmar`);
  await smartClick(page, `Sesión cerrada correctamente`);
});
