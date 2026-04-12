import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Alerts, Frame & Windows').click();
  await page.getByRole('link', { name: 'Frames', exact: true }).click();
  await page.locator('#frame1').contentFrame().getByRole('heading', { name: 'This is a sample page' }).click();
  await page.locator('#frame2').contentFrame().getByRole('heading', { name: 'This is a sample page' }).click();
});