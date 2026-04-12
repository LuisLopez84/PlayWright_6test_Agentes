
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('Homebankink_TarjetaVirtual', async ({ page }) => {
  await smartGoto(page, 'Homebankink_TarjetaVirtual');

  await smartClick(page, `Usuario`);
  await smartFill(page, `Usuario`, 'demo');
  await page.waitForTimeout(500);
  await smartClick(page, `Contraseña`);
  await smartFill(page, `Contraseña`, 'demo123');
  await page.waitForTimeout(500);
  await smartClick(page, `Ingresar`);
  await smartClick(page, `Tarjeta Virtual`);
  await smartSelect(page, `Sincronizar con cuenta:`, 'ACC002');
  // Capturar toast transitorio en paralelo con el click de confirmación.
  await Promise.all([
    smartWaitForText(page, `✅ Tarjeta virtual generada`, 20000),
    smartClick(page, `+ Generar Nueva Tarjeta`),
  ]);
});
