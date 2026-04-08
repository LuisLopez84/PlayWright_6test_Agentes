
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('MercadoLibre_Morrales', async ({ page }) => {

  // 🔥 Navegación inteligente
  await smartGoto(page, 'MercadoLibre_Morrales');

  await smartClick(page, `Ingresa lo que quieras`);
  await smartFill(page, `Ingresa lo que quieras`, 'M');
  await smartFill(page, `Ingresa lo que quieras`, 'Morrales');
  await smartClick(page, `Continuar`);
});
