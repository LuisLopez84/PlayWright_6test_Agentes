
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser3', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser3');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);
  // Abrir nueva pestaña y esperar a que esté lista
  const [_popupPage] = await Promise.all([
    page.waitForEvent('popup'),
    (page.getByRole('button', { name: 'New Window Message' })).click(),
  ]);
  await _popupPage.waitForLoadState();
  await smartClick(_popupPage, `Knowledge increases by`);
  await smartClick(_popupPage, `Knowledge increases by`);
  await smartClick(_popupPage, `Knowledge increases by`);
});
