
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartDblClick } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('herokuapp_EditarUsuario', async ({ page }) => {
  await smartGoto(page, 'herokuapp_EditarUsuario');

  await smartClick(page, `Email`);
  await smartFill(page, `Email`, 'pruebas@prue.com.co');
  await page.waitForTimeout(500);
  await smartClick(page, `Password`);
  await smartFill(page, `Password`, '1234567');
  await page.waitForTimeout(500);
  await smartClick(page, `Submit`);
  await smartClick(page, `Framework Playwright`);
  await smartClick(page, `Edit Contact`);
  await smartDblClick(page, `First Name:`);
  await smartClick(page, `First Name:`);
  await smartFill(page, `First Name:`, '');
  await page.waitForTimeout(500);
  await smartDblClick(page, `Last Name:`);
  await smartClick(page, `Last Name:`);
  await smartFill(page, `Last Name:`, '');
  await page.waitForTimeout(500);
  await smartClick(page, `Date of Birth:`);
  await smartClick(page, `Submit`);
  await smartClick(page, `Framework001`);
});
