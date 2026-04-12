
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText, smartCheck } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_RadioButton', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_RadioButton');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Radio Button`);
  await smartCheck(page, `Yes`);
  // Verificar mensaje de resultado (texto asíncrono — puede ser toast transitorio)
  await smartWaitForText(page, `Yes`, 15000);
});
