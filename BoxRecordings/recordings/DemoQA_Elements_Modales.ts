import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Alerts, Frame & Windows').click();
  await page.getByRole('link', { name: 'Modal Dialogs' }).click();
  await page.getByRole('button', { name: 'Small modal' }).click();
  await page.getByText('Close').click();
  await page.getByRole('button', { name: 'Large modal' }).click();
  await page.getByText('Close').click();
});