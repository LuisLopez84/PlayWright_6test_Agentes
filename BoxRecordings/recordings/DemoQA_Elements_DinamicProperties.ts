import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByRole('img').nth(1).click();
  await page.getByRole('link', { name: 'Dynamic Properties' }).click();
  await page.getByRole('button', { name: 'Color Change' }).click();
  await page.getByRole('button', { name: 'Will enable 5 seconds' }).click();
  await page.getByRole('button', { name: 'Visible After 5 Seconds' }).click();
  await page.getByRole('button', { name: 'Will enable 5 seconds' }).click();
  await page.getByRole('button', { name: 'Visible After 5 Seconds' }).click();
  await page.getByRole('button', { name: 'Color Change' }).click();
});