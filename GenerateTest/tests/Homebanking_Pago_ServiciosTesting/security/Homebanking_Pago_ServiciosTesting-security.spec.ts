import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartFill, smartClick } from '@utils/smart-actions';

// Risk 2 (performance/accessibility pattern): URL sobreescribible sin regenerar
const TARGET_URL  = process.env.BASE_URL || 'https://homebanking-demo-tests.netlify.app';
const LOGIN_PATH  = '/login';

test.describe('Security: Homebanking_Pago_ServiciosTesting', () => {

  // ── Headers de seguridad ──────────────────────────────────────────────────
  // Risk 1/8: verificación en runtime — no depende de fetch en tiempo de generación
  test('security headers', async ({ request }) => {
    const response = await request.get(TARGET_URL);
    const h = response.headers();

    const optional = ['strict-transport-security', 'content-security-policy',
                      'referrer-policy', 'permissions-policy'];
    const missing = optional.filter(name => !h[name]);
    if (missing.length > 0) {
      console.warn(`⚠️ Headers opcionales ausentes en Homebanking_Pago_ServiciosTesting: ${missing.join(', ')}`);
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

    // Risk 8: assertions reales — no debe retornar éxito ni error interno de BD
    expect(status, 'No debe responder 200 (éxito) ante SQLi').not.toBe(200);
    expect(status, 'No debe responder 201 (creado) ante SQLi').not.toBe(201);
    // Risk 6: 500 indica error SQL que llegó al cliente — también es un fallo
    expect(status, 'No debe retornar 500 (posible error SQL interno)').not.toBe(500);
  });

  // ── XSS ───────────────────────────────────────────────────────────────────
  test('XSS injection protection', async ({ page }) => {
    await page.goto(TARGET_URL);
    const payload = "<script>alert('xss')</script>";

    await smartFill(page, 'Usuario', payload);
    await smartFill(page, 'Contraseña', payload);
    await smartClick(page, 'Ingresar');

    const content = await page.content();
    expect(content, 'El payload XSS no debe aparecer sin escapar en el DOM').not.toContain(payload);
  });

});
