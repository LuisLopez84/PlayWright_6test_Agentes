
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser2', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser2');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);
  // Abrir nueva pestaña y esperar a que esté lista
  const [_popupPage] = await Promise.all([
    page.waitForEvent('popup'),
    (page.getByRole('button', { name: 'New Window', exact: true })).click(),
  ]);
  await _popupPage.waitForLoadState();
  await smartWaitForText(_popupPage, `This is a sample page`, 15000);
});
