import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Elements').click();
  await page.getByRole('link', { name: 'Buttons' }).click();
  await page.getByRole('button', { name: 'Double Click Me' }).dblclick();
  await page.getByText('You have done a double click').click();
  await page.getByRole('button', { name: 'Right Click Me' }).dblclick();
  await page.getByRole('button', { name: 'Click Me', exact: true }).click();
  await page.getByText('You have done a dynamic click').click();
});