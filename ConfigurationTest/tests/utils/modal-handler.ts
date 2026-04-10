import { Page } from '@playwright/test';

export async function closeAnyModal(page: Page): Promise<boolean> {
  if (page.isClosed()) return false;
  let closed = false;
  const handlers = [
    { selector: 'button:has-text("Más tarde")', action: async (btn: any) => { await btn.click({ force: true }); console.log('🤖 Modal ubicación cerrado'); } },
    { selector: 'button:has-text("Agregar ubicación")', action: async (btn: any) => { await btn.click({ force: true }); console.log('🤖 Modal ubicación cerrado (agregar)'); } },
    { selector: 'button:has-text("Aceptar cookies")', action: async (btn: any) => { await btn.click({ force: true }); console.log('🍪 Cookies aceptadas'); } },
    { selector: 'button:has-text("Accept cookies")', action: async (btn: any) => { await btn.click({ force: true }); console.log('🍪 Cookies accepted'); } },
    { selector: '[role="dialog"] button:has-text("Cerrar")', action: async (btn: any) => { await btn.click({ force: true }); console.log('🤖 Dialog cerrado'); } },
    { selector: '.modal button:has-text("Cerrar")', action: async (btn: any) => { await btn.click({ force: true }); console.log('🤖 Modal cerrado'); } },
    { selector: '[aria-label="Close"]', action: async (btn: any) => { await btn.click({ force: true }); console.log('🤖 Close button clicked'); } }
  ];
  for (const h of handlers) {
    try {
      const el = page.locator(h.selector);
      if (await el.count() > 0 && await el.first().isVisible().catch(() => false)) {
        await h.action(el.first());
        closed = true;
        await page.waitForTimeout(300);
      }
    } catch (e) {}
  }
  const modalDialog = page.locator('[role="dialog"], .modal');
  if (await modalDialog.count() > 0 && await modalDialog.first().isVisible().catch(() => false)) {
    await page.mouse.click(10, 10);
    console.log('🤖 Modal cerrado haciendo clic fuera');
    closed = true;
  }
  return closed;
}