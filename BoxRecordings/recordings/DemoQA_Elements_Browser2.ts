import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Alerts, Frame & Windows').click();
  await page.getByRole('link', { name: 'Browser Windows' }).click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'New Window', exact: true }).click();
  const page1 = await page1Promise;
  await page1.getByRole('heading', { name: 'This is a sample page' }).click();
});