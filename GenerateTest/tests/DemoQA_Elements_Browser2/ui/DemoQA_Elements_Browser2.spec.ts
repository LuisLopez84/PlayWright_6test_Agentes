
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser2', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser2');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);
  // New Window opens a popup — capture it before clicking
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: 'New Window', exact: true }).click(),
  ]);
  await newPage.waitForLoadState('domcontentloaded');
  await newPage.getByRole('heading', { name: 'This is a sample page' }).click();
});
