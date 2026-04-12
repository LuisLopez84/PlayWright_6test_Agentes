
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Widges6', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Widges6');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Tabs`);
  await smartClick(page, `Origin`);
  await smartClick(page, `Use`);
});
