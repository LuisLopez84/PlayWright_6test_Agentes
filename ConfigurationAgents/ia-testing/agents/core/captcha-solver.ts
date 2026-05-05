import { Page } from '@playwright/test';
import axios from 'axios';

// Risk 4: tipos de captcha soportados
export type CaptchaMethod = 'userrecaptcha' | 'hcaptcha' | 'turnstile';

// Risk 5: timeout configurable — default 50 s para dejar ~70 s al resto del test (global 120 s)
const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = Math.floor(
  parseInt(process.env.CAPTCHA_TIMEOUT_MS || '50000', 10) / POLL_INTERVAL_MS
);

// Risk 6: POST /in.php con retry hasta 3 intentos
async function submitTask(
  apiKey: string,
  method: CaptchaMethod,
  siteKey: string,
  pageUrl: string,
  retries = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post('https://2captcha.com/in.php', null, {
        params: { key: apiKey, method, googlekey: siteKey, pageurl: pageUrl, json: 1 },
        timeout: 10_000,
      });
      if (res.data.status === 1) return res.data.request as string;
      console.warn(`[captcha-solver] POST /in.php status≠1 (intento ${attempt}): ${res.data.request}`);
    } catch (err: any) {
      console.warn(`[captcha-solver] POST /in.php error (intento ${attempt}): ${err.message}`);
    }
    if (attempt < retries) await new Promise(r => setTimeout(r, 2_000));
  }
  return null;
}

// Risk 1: inyecta el token resuelto en el campo oculto del DOM según el tipo de captcha
async function injectToken(page: Page, token: string, method: CaptchaMethod): Promise<void> {
  await page.evaluate(
    ({ token, method }) => {
      if (method === 'userrecaptcha') {
        const ta = document.getElementById('g-recaptcha-response') as HTMLTextAreaElement | null;
        if (ta) ta.value = token;
        // disparar callback si el widget lo expone
        const clients = (window as any).___grecaptcha_cfg?.clients ?? {};
        for (const k of Object.keys(clients)) {
          const cb = clients[k]?.aa?.aa?.callback ?? clients[k]?.callback;
          if (typeof cb === 'function') { cb(token); break; }
        }
      } else if (method === 'hcaptcha') {
        const ta = document.querySelector<HTMLTextAreaElement>('[name="h-captcha-response"]');
        if (ta) ta.value = token;
        const cb = (window as any).__hCaptchaCallback;
        if (typeof cb === 'function') cb(token);
      } else if (method === 'turnstile') {
        const inp = document.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]');
        if (inp) inp.value = token;
      }
    },
    { token, method }
  );
}

/**
 * Resuelve un captcha via 2Captcha e inyecta el token en el DOM de `page`.
 *
 * Risk 1: `page` ahora se usa para inyectar el token resuelto.
 * Risk 4: soporta reCAPTCHA v2, hCaptcha y Cloudflare Turnstile.
 * Risk 5: timeout configurable via CAPTCHA_TIMEOUT_MS (default 50 s).
 * Risk 6: POST /in.php reintentado hasta 3 veces ante errores transitorios.
 *
 * @returns true si el token fue inyectado correctamente, false en cualquier fallo.
 */
export async function solveAndInjectCaptcha(
  page: Page,
  siteKey: string,
  pageUrl: string,
  method: CaptchaMethod = 'userrecaptcha'
): Promise<boolean> {
  const apiKey = process.env.TWO_CAPTCHA_API_KEY;
  if (!apiKey) {
    console.warn('[captcha-solver] TWO_CAPTCHA_API_KEY no configurada — captcha omitido.');
    return false;
  }

  try {
    const requestId = await submitTask(apiKey, method, siteKey, pageUrl);
    if (!requestId) {
      console.error('[captcha-solver] No se pudo registrar la tarea en 2Captcha.');
      return false;
    }

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      const res = await axios.get('https://2captcha.com/res.php', {
        params: { key: apiKey, action: 'get', id: requestId, json: 1 },
        timeout: 10_000,
      });
      if (res.data.status === 1) {
        await injectToken(page, res.data.request as string, method);
        console.log(`[captcha-solver] Token inyectado correctamente (${method}).`);
        return true;
      }
    }

    console.error(
      `[captcha-solver] Timeout esperando solución (${(MAX_POLLS * POLL_INTERVAL_MS) / 1000} s).`
    );
    return false;
  } catch (err: any) {
    console.error(`[captcha-solver] Error resolviendo captcha: ${err.message}`);
    return false;
  }
}
