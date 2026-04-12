import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Widgets').click();
  await page.getByRole('link', { name: 'Select Menu' }).click();
  await page.locator('.css-8mmkcg').first().click();
  await page.getByRole('option', { name: 'Group 1, option 2' }).click();
  await page.locator('.css-1xc3v61-indicatorContainer > .css-8mmkcg').first().click();
  await page.getByRole('option', { name: 'Mr.' }).click();
  await page.locator('#oldSelectMenu').selectOption('4');
  await page.locator('div:nth-child(8) > .col-md-6 > .css-b62m3t-container > .css-13cymwt-control > .css-1wy0on6 > .css-1xc3v61-indicatorContainer > .css-8mmkcg').click();
  await page.locator('#react-select-4-option-2').click();
  await page.locator('#react-select-4-option-1').click();
  await page.locator('div:nth-child(8)').click();
  await page.locator('#cars').selectOption('saab');
});