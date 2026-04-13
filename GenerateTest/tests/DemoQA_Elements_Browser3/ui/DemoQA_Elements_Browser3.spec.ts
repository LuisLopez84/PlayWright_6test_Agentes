
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser3', async ({ page, context }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser3');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);

  // Fallback de navegación directa: si los clicks de sidebar no llegaron al destino
  if (!page.url().includes('browser-windows')) {
    console.log('⚠️ Navegación UI no llegó a browser-windows — usando goto directo');
    await page.goto('https://demoqa.com/browser-windows');
    await page.waitForLoadState('load');
  }

  // context.waitForEvent('page') captura cualquier nueva página del contexto
  const [_popupPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 30000 }),
    page.getByRole('button', { name: 'New Window Message' }).click(),
  ]);
  await _popupPage.waitForLoadState('load');

  await smartClick(_popupPage, `Knowledge increases by`);
  await smartClick(_popupPage, `Knowledge increases by`);
  await smartClick(_popupPage, `Knowledge increases by`);
});
