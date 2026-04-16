import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://thinking-tester-contact-list.herokuapp.com/');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('pruebas@prue.com.co');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('1234567');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('cell', { name: 'Framework Playwright' }).nth(1).click();
  await page.getByRole('button', { name: 'Edit Contact' }).click();
  await page.getByRole('textbox', { name: 'First Name:' }).dblclick();
  await page.getByRole('textbox', { name: 'First Name:' }).click();
  await page.getByRole('textbox', { name: 'First Name:' }).fill('');
  await page.getByRole('textbox', { name: 'Last Name:' }).dblclick();
  await page.getByRole('textbox', { name: 'Last Name:' }).click();
  await page.getByRole('textbox', { name: 'Last Name:' }).fill('');
  await page.getByRole('textbox', { name: 'Date of Birth:' }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByText('Framework001').click();
});