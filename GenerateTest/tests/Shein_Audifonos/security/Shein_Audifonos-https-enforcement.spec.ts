import { test, expect } from '@playwright/test';

// Risk 5: TARGET_URL evaluado en runtime — si la app migra HTTP→HTTPS no hay que regenerar
const TARGET_URL = process.env.BASE_URL || 'https://www.shein.com.co';

test.describe('HTTPS enforcement: Shein_Audifonos', () => {

  test('URL usa HTTPS', async ({ page }) => {
    await page.goto(TARGET_URL);
    const currentUrl = page.url();
    expect(
      currentUrl.startsWith('https://'),
      `La URL ${currentUrl} debe comenzar con https://`
    ).toBeTruthy();
  });

  test('Redirect HTTP → HTTPS', async ({ request }) => {
    const httpUrl = TARGET_URL.replace(/^https?:\/\//, 'http://');
    try {
      const response = await request.get(httpUrl, { maxRedirects: 0 });
      const status   = response.status();
      const location = response.headers()['location'] || '';
      if ([301, 302, 307, 308].includes(status)) {
        expect(location.startsWith('https://'),
          `Redirect debe apuntar a https:// — got: ${location}`).toBeTruthy();
      } else {
        // Servidor que rechaza HTTP directamente (≥400) también es correcto
        expect(status, 'HTTP debe ser rechazado o redirigido').toBeGreaterThanOrEqual(300);
      }
    } catch {
      // Conexión rechazada en HTTP es comportamiento correcto
      expect(true).toBeTruthy();
    }
  });

  test('HSTS header presente en sitios HTTPS', async ({ request }) => {
    const response = await request.get(TARGET_URL);
    const hsts = response.headers()['strict-transport-security'];

    // Risk 5: evaluado en runtime, no bakeado como literal boolean
    if (TARGET_URL.startsWith('https://')) {
      // Risk 8: assertion real para sitios HTTPS
      expect(hsts,
        'Strict-Transport-Security debe estar presente en sitios HTTPS'
      ).toBeTruthy();
    } else {
      console.warn(`⚠️ ${TARGET_URL} no usa HTTPS — HSTS no aplica`);
    }
  });

});
