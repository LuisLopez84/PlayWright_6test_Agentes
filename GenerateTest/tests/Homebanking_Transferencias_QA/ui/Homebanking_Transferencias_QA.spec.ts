
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('Homebanking_Transferencias_QA', async ({ page }) => {
  await smartGoto(page, 'Homebanking_Transferencias_QA');

  await smartClick(page, `Usuario`);
  await smartFill(page, `Usuario`, 'demo');
  await page.waitForTimeout(500);
  await smartClick(page, `Contraseña`);
  await smartFill(page, `Contraseña`, 'demo123');
  await page.waitForTimeout(500);
  await smartClick(page, `Ingresar`);
  await smartClick(page, `Transferencias`);
  await smartSelect(page, `#source-account`, 'ACC002');
  await smartClick(page, `Monto`);
  await smartFill(page, `Monto`, '1001');
  await page.waitForTimeout(500);
  await smartClick(page, `Descripción (opcional)`);
  await smartFill(page, `Descripción (opcional)`, 'test 002');
  await page.waitForTimeout(500);
  await smartClick(page, `Transferir`);
  // Capturar toast transitorio en paralelo con el click de confirmación.
  await Promise.all([
    smartWaitForText(page, `Transferencia realizada`, 20000),
    smartClick(page, `Confirmar`),
  ]);
});
