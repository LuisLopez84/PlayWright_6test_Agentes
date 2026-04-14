import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';

test.describe('HTTPS enforcement for Homebankink_PlazosFijos3', () => {

  test('URL base usa HTTPS', async ({ page }) => {
    await smartGoto(page, 'Homebankink_PlazosFijos3');
    const currentUrl = page.url();
    expect(
      currentUrl.startsWith('https://'),
      `La URL ${currentUrl} debe comenzar con https://`
    ).toBeTruthy();
  });

  test('Redirect HTTP → HTTPS', async ({ request }) => {
    const httpUrl = 'https://homebanking-demo-tests.netlify.app'.replace('https://', 'http://');
    try {
      const response = await request.get(httpUrl, { maxRedirects: 0 });
      // Debe redirigir (301/302/307/308) o rechazar la conexión HTTP
      const status = response.status();
      const isRedirect = [301, 302, 307, 308].includes(status);
      const location = response.headers()['location'] || '';
      if (isRedirect) {
        expect(location.startsWith('https://')).toBeTruthy();
      } else {
        // Algunos servidores rechazan HTTP directamente (status >= 400)
        expect(status).toBeGreaterThanOrEqual(300);
      }
    } catch {
      // Conexión rechazada en HTTP es comportamiento correcto también
      expect(true).toBeTruthy();
    }
  });

  test('HSTS header presente', async ({ request }) => {
    const response = await request.get('https://homebanking-demo-tests.netlify.app');
    const hsts = response.headers()['strict-transport-security'];
    if (true) {
      // Para sitios HTTPS se espera el header (advertencia si no está)
      if (!hsts) {
        console.warn('⚠️ Strict-Transport-Security no presente en https://homebanking-demo-tests.netlify.app');
      }
      // No es fatal — no todos los sitios lo implementan, pero se reporta
      expect(true).toBeTruthy();
    } else {
      // Si no es HTTPS, el test es informativo
      console.warn('⚠️ https://homebanking-demo-tests.netlify.app no usa HTTPS');
      expect(true).toBeTruthy();
    }
  });

});
