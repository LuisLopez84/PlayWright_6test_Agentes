import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Widgets').click();
  await page.getByRole('link', { name: 'Tool Tips' }).click();
  await page.getByRole('button', { name: 'Hover me to see' }).click();
  await page.getByRole('textbox', { name: 'Hover me to see' }).click();
  await page.getByRole('textbox', { name: 'Hover me to see' }).fill('tool');
  await page.getByRole('button', { name: 'Hover me to see' }).click();
  await page.getByText('Contrary to popular belief,').click();
});