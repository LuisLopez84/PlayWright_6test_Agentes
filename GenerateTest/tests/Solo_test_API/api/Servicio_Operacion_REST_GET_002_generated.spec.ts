import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Testing - REST', () => {
  test('Éxito (2xx) - Llamada normal al endpoint real', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/cuentas/');
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    const responseData = await response.json();
    expect(responseData).toHaveProperty('data'); // Ajustar según la estructura esperada
  });

  test('Error técnico (fallo de red / 5xx)', async ({ request }) => {
    try {
      await restRequest(request, 'GET', 'https://error-tecnico.nonexistent.invalid/');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('NetworkError');
    }
  });

  test('Error de datos (4xx)', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/cuentas/id-invalido-test-99999');
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});