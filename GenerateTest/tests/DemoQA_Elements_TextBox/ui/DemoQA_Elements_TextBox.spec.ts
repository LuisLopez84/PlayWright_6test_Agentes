
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_TextBox', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_TextBox');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Text Box`);
  await smartClick(page, `Full Name`);
  await smartFill(page, `Full Name`, 'Luis QA');
  await page.waitForTimeout(500);
  await smartClick(page, `name@example.com`);
  await smartFill(page, `name@example.com`, 'luis@luie.com.co');
  await page.waitForTimeout(500);
  await smartClick(page, `Current Address`);
  await smartFill(page, `Current Address`, 'prueba text box');
  await page.waitForTimeout(500);
  await smartClick(page, `#permanentAddress`);
  await smartFill(page, `#permanentAddress`, 'test');
  await page.waitForTimeout(500);
  // Capturar toast transitorio en paralelo con el click de confirmación.
  await Promise.all([
    smartWaitForText(page, `Permananet Address :test`, 20000),
    smartClick(page, `Submit`),
  ]);
});
