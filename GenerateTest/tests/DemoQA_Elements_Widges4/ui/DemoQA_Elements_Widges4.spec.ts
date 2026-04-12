
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Widges4', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Widges4');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Slider`);
  await smartFill(page, `#slider`, '80');
  await page.waitForTimeout(500);
  await smartClick(page, `#sliderValue`);
});
