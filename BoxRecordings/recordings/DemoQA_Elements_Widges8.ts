import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Widgets').click();
  await page.getByRole('link', { name: 'Menu', exact: true }).click();
  await page.getByRole('link', { name: 'Main Item 1' }).click();
  await page.getByRole('link', { name: 'Main Item 1' }).click();
  await page.getByRole('link', { name: 'Main Item 2' }).click();
  await page.getByRole('link', { name: 'Sub Item' }).nth(1).click();
  await page.getByRole('link', { name: 'Main Item 3' }).click();
  await page.getByRole('link', { name: 'Main Item 3' }).click();
  await page.getByRole('link', { name: 'Main Item 2' }).click();
  await page.getByRole('link', { name: 'SUB SUB LIST »' }).click();
  await page.getByRole('link', { name: 'Sub Sub Item 1' }).click();
  await page.getByRole('link', { name: 'Sub Sub Item 2' }).click();
});