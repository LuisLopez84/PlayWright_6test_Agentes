
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);
  // New Tab opens a popup — capture it before clicking
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: 'New Tab' }).click(),
  ]);
  await newPage.waitForLoadState('domcontentloaded');
  await newPage.getByRole('heading', { name: 'This is a sample page' }).click();
});
