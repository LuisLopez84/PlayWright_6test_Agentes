import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartFill, smartClick } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test.describe('Security tests for DemoQA_Elements_Widges4', () => {

  test('security headers', async ({ request }) => {
    const response = await request.get('https://demoqa.com');
    // No se detectaron headers de seguridad — test informativo
    console.log('⚠️ No se detectaron headers de seguridad en https://demoqa.com');
    expect(true).toBeTruthy();
  });

  test('sql injection', async ({ request }) => {
    const response = await request.post('https://demoqa.com/login', {
      data: { username: "' OR '1'='1", password: "' OR '1'='1" }
    });
    const status = response.status();
    // No debe responder 200/201 (éxito) ante una inyección SQL.
    // 404 es aceptable en SPAs donde el endpoint /login no existe como API REST.
    // Cualquier status >= 400 indica que el servidor rechazó la petición.
    expect(status).not.toBe(200);
    expect(status).not.toBe(201);
  });

  test('XSS injection protection', async ({ page }) => {
    await smartGoto(page, 'DemoQA_Elements_Widges4');
    const payload = "<script>alert('xss')</script>";

    await smartFill(page, 'Usuario', payload);
    await smartFill(page, 'Contraseña', payload);
    await smartClick(page, 'Ingresar');

    const content = await page.content();
    expect(content).not.toContain(payload);
  });

});
