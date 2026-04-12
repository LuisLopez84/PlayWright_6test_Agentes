
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Widges7', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Widges7');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Tool Tips`);
  await smartClick(page, `Hover me to see`);
  await smartClick(page, `Hover me to see`);
  await smartFill(page, `Hover me to see`, 'tool');
  await page.waitForTimeout(500);
  await smartClick(page, `Hover me to see`);
  await smartClick(page, `Contrary to popular belief,`);
});
