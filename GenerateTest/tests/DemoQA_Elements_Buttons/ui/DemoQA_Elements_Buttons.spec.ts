
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText, smartDblClick } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Buttons', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Buttons');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Buttons`);
  await smartDblClick(page, `Double Click Me`);
  // Verificar mensaje de resultado (texto asíncrono — puede ser toast transitorio)
  await smartWaitForText(page, `You have done a double click`, 15000);
  await smartDblClick(page, `Right Click Me`);
  // Capturar toast transitorio en paralelo con el click de confirmación.
  await Promise.all([
    smartWaitForText(page, `You have done a dynamic click`, 20000),
    smartClick(page, `Click Me`),
  ]);
});
