
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Frames', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Frames');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  // Capturar toast transitorio en paralelo con el click de confirmación.
  await Promise.all([
    smartWaitForText(page, `This is a sample page`, 20000),
    smartClick(page, `Frames`),
  ]);
});
