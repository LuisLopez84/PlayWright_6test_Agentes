import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Widgets').click();
  await page.getByRole('link', { name: 'Accordian' }).click();
  await page.getByRole('button', { name: 'Where does it come from?' }).click();
  await page.getByRole('button', { name: 'Why do we use it?' }).click();
  await page.getByText('It is a long established fact').click();
});