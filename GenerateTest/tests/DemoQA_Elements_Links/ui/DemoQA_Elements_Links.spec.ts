
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Links', async ({ page, context }) => {
  await smartGoto(page, 'DemoQA_Elements_Links');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Links`);

  // Fallback de navegación directa: si los clicks de sidebar no llegaron a /links
  if (!page.url().includes('/links')) {
    console.log('⚠️ Navegación UI no llegó a /links — usando goto directo');
    await page.goto('https://demoqa.com/links');
    await page.waitForLoadState('load');
  }

  // Clic en link de API (muestra respuesta en página, no navega)
  await smartClick(page, `Moved`);

  // Abrir nueva pestaña con "Home" — link que abre demoqa.com en un nuevo tab
  const [_popupPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 30000 }),
    page.getByRole('link', { name: 'Home', exact: true }).click(),
  ]);
  await _popupPage.waitForLoadState('load');

  // Navegar en la nueva pestaña
  await smartClick(_popupPage, `Book Store Application`);
  await smartClick(_popupPage, `Elements`);
  await smartClick(_popupPage, `Links`);

  // Fallback de navegación directa en popup page
  if (!_popupPage.url().includes('/links')) {
    await _popupPage.goto('https://demoqa.com/links');
    await _popupPage.waitForLoadState('load');
  }

  // Click en link que abre otra pestaña (HomeeSOYc)
  await smartClick(_popupPage, `HomeeSOYc`);
});
