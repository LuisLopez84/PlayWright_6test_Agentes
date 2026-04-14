import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartFill, smartClick } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test.describe('Security tests for Homebankink_Transferencias', () => {

  test('security headers', async ({ request }) => {
    const response = await request.get('https://homebanking-demo-tests.netlify.app');
    expect(response.headers()['strict-transport-security']).toBeDefined();
  });

  test('sql injection', async ({ request }) => {
    const response = await request.post('https://homebanking-demo-tests.netlify.app/login', {
      data: { username: "' OR '1'='1", password: "' OR '1'='1" }
    });
    const status = response.status();
    // No debe responder 200/201 (éxito) ante una inyección SQL.
    // 404 es aceptable en SPAs donde el endpoint /login no existe como API REST.
    expect(status).not.toBe(200);
    expect(status).not.toBe(201);
  });

  test('XSS injection protection', async ({ page }) => {
    await smartGoto(page, 'Homebankink_Transferencias');
    const payload = "<script>alert('xss')</script>";
    await smartFill(page, 'Usuario', payload);
    await smartFill(page, 'Contraseña', payload);
    await smartClick(page, 'Ingresar');

    const content = await page.content();
    expect(content).not.toContain(payload);
  });

});
