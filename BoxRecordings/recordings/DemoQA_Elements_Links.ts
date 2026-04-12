import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Elements').click();
  await page.getByRole('link', { name: 'Links', exact: true }).click();
  await page.getByRole('link', { name: 'Moved' }).click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  const page1 = await page1Promise;
  await page1.getByRole('link', { name: 'Book Store Application' }).click();
  await page1.getByText('Elements').click();
  await page1.getByRole('link', { name: 'Links', exact: true }).click();
  const page2Promise = page1.waitForEvent('popup');
  await page1.getByRole('link', { name: 'HomeeSOYc' }).click();
  const page2 = await page2Promise;
});