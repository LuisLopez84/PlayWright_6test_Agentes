
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);
  await smartClick(page, `New Tab`);
  await smartClick(page, `This is a sample page`);
});
