
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('Homebanking_PlazosFijos', async ({ page }) => {
  await smartGoto(page, 'Homebanking_PlazosFijos');

  await smartClick(page, `Usuario`);
  await smartFill(page, `Usuario`, 'demo');
  await page.waitForTimeout(500);
  await smartClick(page, `Contraseña`);
  await smartFill(page, `Contraseña`, 'demo123');
  await page.waitForTimeout(500);
  await smartClick(page, `Ingresar`);
  await smartClick(page, `Plazos Fijos`);
  await smartSelect(page, `#deposit-source-account`, 'ACC002');
  await smartClick(page, `Monto a invertir`);
  await smartFill(page, `Monto a invertir`, '2222');
  await page.waitForTimeout(500);
  await smartSelect(page, `Plazo`, '360');
  await smartClick(page, `Crear Plazo Fijo`);
  // Capturar toast transitorio en paralelo con el click de confirmación.
  await Promise.all([
    smartWaitForText(page, `Plazo fijo creado exitosamente`, 20000),
    smartClick(page, `Confirmar`),
  ]);
});
