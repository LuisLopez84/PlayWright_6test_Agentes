import { Page } from '@playwright/test';
import { solveAndInjectCaptcha, CaptchaMethod } from './captcha-solver';

// Risk 3: este módulo coordina detección + resolución + inyección
// Risk 2: punto de entrada para smart-actions o ui-agent

interface DetectedCaptcha {
  method: CaptchaMethod;
  siteKey: string;
}

// Detecta qué tipo de captcha está presente y extrae el siteKey desde el DOM
async function detectCaptcha(page: Page): Promise<DetectedCaptcha | null> {
  return page.evaluate((): DetectedCaptcha | null => {
    // Cloudflare Turnstile (evaluar antes que reCAPTCHA — comparte data-sitekey)
    const turnstile = document.querySelector<HTMLElement>('.cf-turnstile[data-sitekey]');
    if (turnstile) {
      return { method: 'turnstile', siteKey: turnstile.getAttribute('data-sitekey') ?? '' };
    }
    // hCaptcha
    const hcaptcha = document.querySelector<HTMLElement>('.h-captcha[data-sitekey]');
    if (hcaptcha) {
      return { method: 'hcaptcha', siteKey: hcaptcha.getAttribute('data-sitekey') ?? '' };
    }
    // reCAPTCHA v2 — widget con data-sitekey y script de Google
    const recaptchaWidget = document.querySelector<HTMLElement>('[data-sitekey]');
    const hasRecaptchaScript = Array.from(document.scripts).some(s =>
      s.src.includes('recaptcha') || s.src.includes('google.com/recaptcha')
    );
    if (recaptchaWidget && hasRecaptchaScript) {
      return { method: 'userrecaptcha', siteKey: recaptchaWidget.getAttribute('data-sitekey') ?? '' };
    }
    return null;
  });
}

/**
 * Detecta si hay un captcha en la página actual y lo resuelve automáticamente.
 *
 * Risk 2: punto de entrada que conecta el solver al pipeline — importar desde
 *         smart-actions.ts o ui-agent cuando se detecte un bloqueo de captcha.
 * Risk 3: coordina detección (aquí) con resolución + inyección (captcha-solver.ts).
 *
 * @returns true si se detectó y resolvió un captcha, false si no había o falló.
 */
export async function handleCaptchaIfPresent(page: Page): Promise<boolean> {
  const detected = await detectCaptcha(page);
  if (!detected) return false;

  if (!detected.siteKey) {
    console.warn('[captcha-handler] Captcha detectado pero siteKey no encontrado — omitido.');
    return false;
  }

  console.log(`[captcha-handler] Captcha detectado: ${detected.method} — resolviendo...`);
  return solveAndInjectCaptcha(page, detected.siteKey, page.url(), detected.method);
}
