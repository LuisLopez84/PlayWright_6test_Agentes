
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Widges5', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Widges5');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Progress Bar`);
  await smartClick(page, `Start`);
  await smartClick(page, `Stop`);
  await smartClick(page, `%`);
});
