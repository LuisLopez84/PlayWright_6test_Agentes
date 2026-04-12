import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Widgets').click();
  await page.getByRole('link', { name: 'Auto Complete' }).click();
  await page.locator('.auto-complete__input-container').first().click();
  await page.locator('#autoCompleteMultipleInput').fill('diez');
  await page.locator('.auto-complete__input-container.css-19bb58m').click();
  await page.locator('#autoCompleteSingleInput').fill('azul');
  await page.locator('.col-12.mt-4.col-md-6 > div:nth-child(2)').click();
});