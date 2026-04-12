
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartDblClick } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_WebTables', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_WebTables');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Web Tables`);
  await smartClick(page, `#edit-record-1 > svg`);
  await smartClick(page, `First Name`);
  await smartDblClick(page, `Last Name`);
  await smartClick(page, `Last Name`);
  await smartClick(page, `Submit`);
  await smartClick(page, `Add`);
  await smartClick(page, `First Name`);
  await smartFill(page, `First Name`, 'LUISQA');
  await page.waitForTimeout(500);
  await smartClick(page, `Last Name`);
  await smartFill(page, `Last Name`, 'LOPEZQA');
  await page.waitForTimeout(500);
  await smartClick(page, `name@example.com`);
  await smartFill(page, `name@example.com`, 'LUIS@GMAIL.COM');
  await page.waitForTimeout(500);
  await smartClick(page, `Age`);
  await smartFill(page, `Age`, '42');
  await page.waitForTimeout(500);
  await smartClick(page, `Salary`);
  await smartFill(page, `Salary`, '1000000000');
  await page.waitForTimeout(500);
  await smartClick(page, `Department`);
  await smartFill(page, `Department`, 'Bogota');
  await page.waitForTimeout(500);
  await smartClick(page, `Submit`);
  await smartClick(page, `LUISQA`);
});
