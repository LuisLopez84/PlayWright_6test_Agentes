import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Elements').click();
  await page.getByRole('link', { name: 'Radio Button' }).click();
  await page.getByRole('radio', { name: 'Yes' }).check();
  await page.getByRole('paragraph').getByText('Yes').click();
});