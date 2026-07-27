import { Page } from '@playwright/test';

export async function detectAndHandleCaptcha(page: Page): Promise<boolean> {
  // Unificado en un solo Locator (antes mezclaba Frame | Locator vía ||,
  // y .count() no existe en Frame — de ahí el error de tipos original).
  const captchaLocator = page.locator('iframe[src*="recaptcha"], [title="reCAPTCHA"]');
  if (await captchaLocator.count() > 0) {
    console.log('⚠️ Captcha detectado. Pausando test. Resuelve manualmente o integra servicio.');
    await page.pause();
    return true;
  }
  return false;
}