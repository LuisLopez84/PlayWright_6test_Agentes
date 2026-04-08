export async function waitForUIStability(page: Page) {

  if (page.isClosed()) return;

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(300);

  const modal = page.locator('[role="dialog"], .modal, #modal-confirm');

  if (await modal.count() > 0) {

    const visible = await modal.first().isVisible().catch(() => false);

    if (visible) {
      console.log('🤖 Modal visible detectado');
    }
  }
}