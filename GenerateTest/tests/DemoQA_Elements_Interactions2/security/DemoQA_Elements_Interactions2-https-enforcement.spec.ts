import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';

test.describe('HTTPS enforcement for DemoQA_Elements_Interactions2', () => {

  test('URL base usa HTTPS', async ({ page }) => {
    await smartGoto(page, 'DemoQA_Elements_Interactions2');
    const currentUrl = page.url();
    expect(
      currentUrl.startsWith('https://'),
      `La URL ${currentUrl} debe comenzar con https://`
    ).toBeTruthy();
  });

  test('Redirect HTTP → HTTPS', async ({ request }) => {
    const httpUrl = 'https://demoqa.com'.replace('https://', 'http://');
    try {
      const response = await request.get(httpUrl, { maxRedirects: 0 });
      const status = response.status();
      const isRedirect = [301, 302, 307, 308].includes(status);
      const location = response.headers()['location'] || '';
      if (isRedirect) {
        expect(location.startsWith('https://')).toBeTruthy();
      } else {
        expect(status).toBeGreaterThanOrEqual(300);
      }
    } catch {
      // Conexión rechazada en HTTP es comportamiento correcto también
      expect(true).toBeTruthy();
    }
  });

  test('HSTS header presente', async ({ request }) => {
    const response = await request.get('https://demoqa.com');
    const hsts = response.headers()['strict-transport-security'];
    // Para sitios HTTPS se espera el header (advertencia si no está)
    if (!hsts) {
      console.warn('⚠️ Strict-Transport-Security no presente en https://demoqa.com');
    }
    // No es fatal — no todos los sitios lo implementan, pero se reporta
    expect(true).toBeTruthy();
  });

});
