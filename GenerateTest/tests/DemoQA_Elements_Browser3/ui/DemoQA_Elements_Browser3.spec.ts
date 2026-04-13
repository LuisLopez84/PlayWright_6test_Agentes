
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser3', async ({ page, context }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser3');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);
  // Asegurar que la página está lista antes de abrir nueva pestaña
  await page.waitForLoadState('load');
  // context.waitForEvent('page') es más robusto que page.waitForEvent('popup'):
  // captura cualquier nueva página en el contexto sin depender del actionTimeout
  const [_popupPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 30000 }),
    (page.getByRole('button', { name: 'New Window Message' })).click(),
  ]);
  await _popupPage.waitForLoadState('load');
  await smartClick(_popupPage, `Knowledge increases by`);
  await smartClick(_popupPage, `Knowledge increases by`);
  await smartClick(_popupPage, `Knowledge increases by`);
});
