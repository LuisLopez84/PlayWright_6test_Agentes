import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Interactions').click();
  await page.getByRole('link', { name: 'Selectable' }).click();
  await page.getByRole('link', { name: 'Resizable' }).click();
  await page.getByText('Resizable box, starting at').click();
  await page.locator('#resizable').click();
});