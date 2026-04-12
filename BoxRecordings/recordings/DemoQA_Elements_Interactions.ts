import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Interactions').click();
  await page.getByRole('listitem').filter({ hasText: 'Sortable' }).click();
  await page.getByLabel('List').getByText('One').click();
  await page.getByLabel('List').getByText('Two').click();
  await page.getByRole('tab', { name: 'Grid' }).click();
  await page.getByLabel('Grid').getByText('Five').click();
  await page.getByLabel('Grid').getByText('Three').click();
  await page.getByLabel('Grid').getByText('One').click();
});