
import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartClick, smartFill } from '@utils/smart-actions';

// Risk 6: timeouts configurables via variables de entorno
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);

test('Heroku_CrearUsuario', async ({ page }) => {
  await smartGoto(page, 'Heroku_CrearUsuario');

  await smartClick(page, `page.getByRole('textbox', { name: 'Email' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Email' })`, 'tester@tester.com.co');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Password' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Password' })`, '1234567');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('button', { name: 'Submit' })`);
  await smartClick(page, `page.getByRole('button', { name: 'Add a New Contact' })`);
  await smartClick(page, `page.getByRole('textbox', { name: '* First Name:' })`);
  await smartFill(page, `page.getByRole('textbox', { name: '* First Name:' })`, 'tester1');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: '* Last Name:' })`);
  await smartFill(page, `page.getByRole('textbox', { name: '* Last Name:' })`, 'tester2');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Date of Birth:' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Date of Birth:' })`, '1984-06-01');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Email:' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Email:' })`, 'tester@tester.com.co');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Phone:' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Phone:' })`, '1111111111');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Street Address 1:' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Street Address 1:' })`, 'calle 1 1 11');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'City:' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'City:' })`, 'B');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartFill(page, `page.getByRole('textbox', { name: 'City:' })`, 'Bogota');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'State or Province:' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'State or Province:' })`, 'B');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartFill(page, `page.getByRole('textbox', { name: 'State or Province:' })`, 'Bogota');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Postal Code:' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Postal Code:' })`, '110010');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('textbox', { name: 'Country:' })`);
  await smartFill(page, `page.getByRole('textbox', { name: 'Country:' })`, 'Colombia');
  await page.waitForTimeout(FILL_WAIT_MS);
  await smartClick(page, `page.getByRole('cell', { name: 'tester1 tester2' })`);
});
