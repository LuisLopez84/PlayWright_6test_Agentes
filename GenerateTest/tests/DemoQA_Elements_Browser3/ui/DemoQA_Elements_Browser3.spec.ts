
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser3', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser3');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);
  // New Window Message opens a popup — capture it before clicking
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: 'New Window Message' }).click(),
  ]);
  await newPage.waitForLoadState('domcontentloaded');
  await newPage.getByText('Knowledge increases by').click();
});
