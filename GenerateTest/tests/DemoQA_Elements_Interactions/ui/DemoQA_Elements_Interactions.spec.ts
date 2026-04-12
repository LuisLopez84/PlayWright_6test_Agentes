
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Interactions', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Interactions');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Interactions`);
  await smartClick(page, `Sortable`);
  // List tab items
  await page.getByLabel('List').getByText('One').click();
  await page.getByLabel('List').getByText('Two').click();
  // Switch to Grid tab
  await page.getByRole('tab', { name: 'Grid' }).click();
  // Grid tab items
  await page.getByLabel('Grid').getByText('Five').click();
  await page.getByLabel('Grid').getByText('Three').click();
  await page.getByLabel('Grid').getByText('One').click();
});
