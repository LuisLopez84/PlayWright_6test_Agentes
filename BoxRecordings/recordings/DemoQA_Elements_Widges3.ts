import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Widgets').click();
  await page.getByRole('link', { name: 'Date Picker' }).click();
  await page.locator('#datePickerMonthYearInput').click();
  await page.getByRole('gridcell', { name: 'Choose Saturday, April 11th,' }).selectOption('1950');
  await page.getByRole('combobox').first().selectOption('0');
  await page.getByRole('gridcell', { name: 'Choose Tuesday, January 31st,' }).click();
  await page.locator('#dateAndTimePickerInput').click();
  await page.getByRole('button', { name: 'Next Month' }).click();
  await page.getByRole('option', { name: '17:45' }).click();
});