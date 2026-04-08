
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('Homebanking_Pruebas001', async ({ page }) => {

  // 🔥 Navegación inteligente
  await smartGoto(page, 'Homebanking_Pruebas001');

  await smartClick(page, `Usuario`);
  await smartFill(page, `Usuario`, 'demo');
  await smartClick(page, `Contraseña`);
  await smartFill(page, `Contraseña`, 'demo123');
  await smartClick(page, `Ingresar`);
  await smartClick(page, `¡Bienvenido! Inicio de sesión`);
});
