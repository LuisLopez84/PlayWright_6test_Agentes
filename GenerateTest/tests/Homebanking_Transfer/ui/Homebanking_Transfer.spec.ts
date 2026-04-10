
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('Homebanking_Transfer', async ({ page }) => {
  await smartGoto(page, 'Homebanking_Transfer');

  await smartClick(page, `Usuario`);
  await smartFill(page, `Usuario`, 'demo');
  await page.waitForTimeout(500);
  await smartFill(page, `Contraseña`, 'demo123');
  await page.waitForTimeout(500);
  await smartClick(page, `Ingresar`);
  await smartClick(page, `¡Bienvenido! Inicio de sesión`);
  await smartClick(page, `Transferencias`);
  await smartSelect(page, `#source-account`, 'ACC002');
  await smartClick(page, `Monto`);
  await smartFill(page, `Monto`, '1002');
  await page.waitForTimeout(500);
  await smartClick(page, `Descripción (opcional)`);
  await smartFill(page, `Descripción (opcional)`, 'Cloude 002');
  await page.waitForTimeout(500);
  await smartClick(page, `Transferir`);
  await smartClick(page, `Confirmar`);
  await smartClick(page, `Transferencia realizada`);
  await smartClick(page, `Salir`);
});
