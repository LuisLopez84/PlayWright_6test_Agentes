
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartFill, smartClick } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test.describe('Security tests for Homebanking_Transfer', () => {

  test('security headers', async ({ request }) => {
    const response = await request.get('https://homebanking-demo-tests.netlify.app');
  expect(response.headers()['strict-transport-security']).toBeDefined();

  });

  test('sql injection', async ({ request }) => {
    const response = await request.post('https://homebanking-demo-tests.netlify.app/login', {
      data: { username: "' OR '1'='1", password: "' OR '1'='1" }
    });
    expect(response.status()).not.toBe(200);
  });

  test('XSS injection protection', async ({ page }) => {
    await smartGoto(page, 'Homebanking_Transfer');
    const payload = "<script>alert('xss')</script>";

    await smartFill(page, 'Usuario', payload);
    await smartFill(page, 'Contraseña', payload);
    await smartClick(page, 'Ingresar');

    const content = await page.content();
    expect(content).not.toContain(payload);
  });

});
