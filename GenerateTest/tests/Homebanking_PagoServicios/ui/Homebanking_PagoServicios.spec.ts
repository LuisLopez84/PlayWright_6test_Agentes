
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('Homebanking_PagoServicios', async ({ page }) => {
  await smartGoto(page, 'Homebanking_PagoServicios');

  await smartClick(page, `Usuario`);
  await smartFill(page, `Usuario`, 'demo');
  await page.waitForTimeout(500);
  await smartClick(page, `Contraseña`);
  await smartFill(page, `Contraseña`, 'demo123');
  await page.waitForTimeout(500);
  await smartClick(page, `Ingresar`);
  await smartClick(page, `Pago de Servicios`);
  await smartSelect(page, `Selecciona el Servicio`, 'SRV004');
  await smartClick(page, `Monto a Pagar`);
  await smartFill(page, `Monto a Pagar`, '15555');
  await page.waitForTimeout(500);
  await smartSelect(page, `Cuenta a Debitar`, 'ACC002');
  // Capturar toast transitorio en paralelo con el click de confirmación.
  await Promise.all([
    smartWaitForText(page, `✅ ¡Pago Finalizado!`, 20000),
    smartClick(page, `Pagar Servicio`),
  ]);
});
