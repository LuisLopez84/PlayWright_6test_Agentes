
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser3', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser3');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);
  await smartClick(page, `New Window Message`);
  await smartClick(page, `Knowledge increases by`);
  await smartClick(page, `Knowledge increases by`);
  await smartClick(page, `Knowledge increases by`);
});
