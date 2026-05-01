import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Tests for REST Service', () => {
  test('Éxito (2xx) - llamada normal al endpoint real', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/prestamos/');
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    const responseData = await response.json();
    expect(responseData).toHaveProperty('prestamos'); // Ajustar según la estructura esperada
  });

  test('Error técnico (fallo de red / 5xx)', async ({ request }) => {
    let errorDetected = false;
    try {
      await restRequest(request, 'GET', 'https://error-tecnico.nonexistent.invalid/');
    } catch (error) {
      errorDetected = true;
    }
    expect(errorDetected).toBe(true);
  });

  test('Error de datos (4xx)', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/prestamos/id-invalido-test-99999');
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});