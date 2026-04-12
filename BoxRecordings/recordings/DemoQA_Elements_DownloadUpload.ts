import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Elements').click();
  await page.getByRole('link', { name: 'Upload and Download' }).click();
  await page.getByRole('button', { name: 'Choose File' }).click();
  await page.getByRole('button', { name: 'Choose File' }).setInputFiles('cloude001.png');
  await page.getByText('C:\\fakepath\\cloude001.png').click();
});