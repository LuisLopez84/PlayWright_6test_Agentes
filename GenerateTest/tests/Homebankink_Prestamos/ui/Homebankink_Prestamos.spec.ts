
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('Homebankink_Prestamos', async ({ page }) => {
  await smartGoto(page, 'Homebankink_Prestamos');

  await smartClick(page, `Usuario`);
  await smartFill(page, `Usuario`, 'demo');
  await page.waitForTimeout(500);
  await smartClick(page, `Contraseña`);
  await smartFill(page, `Contraseña`, 'demo123');
  await page.waitForTimeout(500);
  await smartClick(page, `Ingresar`);
  await smartClick(page, `Préstamos`);
  await smartSelect(page, `#loan-destination-account`, 'ACC002');
  await smartClick(page, `Monto a solicitar`);
  await smartFill(page, `Monto a solicitar`, '2500');
  await page.waitForTimeout(500);
  await smartSelect(page, `Cuotas`, '24');
  await smartClick(page, `Solicitar Préstamo`);
  await smartClick(page, `Confirmar`);
  await smartClick(page, `Préstamo acreditado`);
});
