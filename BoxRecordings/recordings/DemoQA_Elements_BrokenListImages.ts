import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Elements').click();
  await page.getByRole('link', { name: 'Broken Links - Images' }).click();
  await page.getByRole('link', { name: 'Click Here for Valid Link' }).click();
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Elements').click();
  await page.getByRole('link', { name: 'Broken Links - Images' }).click();
  await page.getByRole('link', { name: 'Click Here for Broken Link' }).click();
  await page.getByText('This page returned a 500').click();
});