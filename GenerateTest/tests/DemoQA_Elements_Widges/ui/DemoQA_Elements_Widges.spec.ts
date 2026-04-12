
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Widges', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Widges');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Accordian`);
  await smartClick(page, `Where does it come from?`);
  // Capturar toast transitorio en paralelo con el click de confirmación.
  await Promise.all([
    smartWaitForText(page, `It is a long established fact`, 20000),
    smartClick(page, `Why do we use it?`),
  ]);
});
