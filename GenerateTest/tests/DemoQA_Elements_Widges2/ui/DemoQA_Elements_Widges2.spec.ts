
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Widges2', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Widges2');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Auto Complete`);
  await smartClick(page, `.auto-complete__input-container`);
  await smartFill(page, `#autoCompleteMultipleInput`, 'diez');
  await page.waitForTimeout(500);
  await smartClick(page, `.auto-complete__input-container.css-19bb58m`);
  await smartFill(page, `#autoCompleteSingleInput`, 'azul');
  await page.waitForTimeout(500);
  await smartClick(page, `.col-12.mt-4.col-md-6 > div:nth-child(2)`);
});
