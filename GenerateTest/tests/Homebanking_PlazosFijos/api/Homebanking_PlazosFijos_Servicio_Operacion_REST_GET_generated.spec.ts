import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Tests for REST Service', () => {
  
  test('Éxito (2xx) - llamada normal al endpoint real', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/prestamos/');
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('data'); // Ajustar según la estructura esperada
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
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/prestamos/id-invalido-test-99999');
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

});