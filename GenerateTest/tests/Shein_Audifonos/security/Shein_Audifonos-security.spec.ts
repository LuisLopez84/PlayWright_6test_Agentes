import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartFill, smartClick } from '@utils/smart-actions';

// Risk 2 (performance/accessibility pattern): URL sobreescribible sin regenerar
const TARGET_URL  = process.env.BASE_URL || 'https://www.shein.com.co';
const LOGIN_PATH  = '/login';

test.describe('Security: Shein_Audifonos', () => {

  // ── Headers de seguridad ──────────────────────────────────────────────────
  // Risk 1/8: verificación en runtime — no depende de fetch en tiempo de generación
  test('security headers', async ({ request }) => {
    const response = await request.get(TARGET_URL);
    const h = response.headers();

    const optional = ['strict-transport-security', 'content-security-policy',
                      'referrer-policy', 'permissions-policy'];
    const missing = optional.filter(name => !h[name]);
    if (missing.length > 0) {
      console.warn(`⚠️ Headers opcionales ausentes en Shein_Audifonos: ${missing.join(', ')}`);
    }

    // Risk 8: assertions reales sobre los headers más críticos
    expect(h['x-content-type-options'],
      'x-content-type-options debe ser "nosniff"').toBe('nosniff');
    expect(h['x-frame-options'],
      'x-frame-options debe estar presente').toBeTruthy();
  });

  // ── SQL injection ─────────────────────────────────────────────────────────
  test('sql injection protection', async ({ request }) => {
    const response = await request.post(TARGET_URL + LOGIN_PATH, {
      data: { username: "' OR '1'='1", password: "' OR '1'='1" }
    });
    const status = response.status();

    // SPA sin endpoint REST de login — al menos no debe retornar error interno
    // Risk 6: 500 indicaría que el payload llegó a una BD
    expect(status, 'No debe retornar 500 (posible error SQL interno)').not.toBe(500);
    console.log(`ℹ️ SQL injection informativo: ${TARGET_URL + LOGIN_PATH} → ${status}`);
  });

  // ── XSS ───────────────────────────────────────────────────────────────────
  test('XSS injection protection', async ({ page }) => {
    await page.goto(TARGET_URL);
    const payload = "<script>alert('xss')</script>";

    try {
      const firstInput = page.locator(
        'input[type="text"]:visible, input:not([type="hidden"]):visible'
      ).first();
      if (await firstInput.count() > 0) {
        await firstInput.fill(payload);
        await firstInput.press('Enter');
      }
    } catch { /* sin campos de texto visibles */ }

    const content = await page.content();
    expect(content, 'El payload XSS no debe aparecer sin escapar en el DOM').not.toContain(payload);
  });

});
