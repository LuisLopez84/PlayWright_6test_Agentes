import { Page } from '@playwright/test';

export async function detectAndHandleCaptcha(page: Page): Promise<boolean> {
  const captchaFrame = page.frame({ url: /recaptcha/ }) || page.locator('[title="reCAPTCHA"]');
  if (await captchaFrame.count() > 0) {
    console.log('⚠️ Captcha detectado. Pausando test. Resuelve manualmente o integra servicio.');
    await page.pause();
    return true;
  }
  return false;
}