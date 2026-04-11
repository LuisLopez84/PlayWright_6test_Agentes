
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('Homebanking_Transf', async ({ page }) => {
  await smartGoto(page, 'Homebanking_Transf');

  await smartClick(page, `Usuario`);
  await smartFill(page, `Usuario`, 'demo');
  await page.waitForTimeout(500);
  await smartFill(page, `Contraseña`, 'demo123');
  await page.waitForTimeout(500);
  await smartClick(page, `Ingresar`);
  await smartClick(page, `Transferencias`);
  await smartSelect(page, `#source-account`, 'ACC002');
  await smartClick(page, `Monto`);
  await smartFill(page, `Monto`, '1003');
  await page.waitForTimeout(500);
  await smartClick(page, `Descripción (opcional)`);
  await smartFill(page, `Descripción (opcional)`, 'cloud 002');
  await page.waitForTimeout(500);
  await smartClick(page, `Transferir`);
  await smartClick(page, `Confirmar`);
  // Verificar mensaje de resultado (texto asíncrono post-acción — puede ser toast transitorio)
  await smartWaitForText(page, `Transferencia realizada`, 15000);
});
