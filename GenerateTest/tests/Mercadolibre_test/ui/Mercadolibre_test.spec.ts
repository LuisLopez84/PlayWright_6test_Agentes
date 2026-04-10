
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('Mercadolibre_test', async ({ page }) => {
  await smartGoto(page, 'Mercadolibre_test');

  await smartClick(page, `Electrónica, Audio y Video`);
  await smartClick(page, `Cables de Audio y Video`);
  await smartClick(page, `Más tarde`);
  await smartClick(page, `Adaptador Conversor`);
  await smartClick(page, `Agregar al carrito`);
  await smartClick(page, `login-link`);
});
