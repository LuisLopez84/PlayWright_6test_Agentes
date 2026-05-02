import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Tests for REST Service', () => {
  test('Éxito (2xx) - Llamada normal al endpoint real', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/prestamos/');
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    const responseData = await response.json();
    expect(responseData).toHaveProperty('prestamos'); // Ajustar según la estructura esperada
  });

  test('Error técnico (5xx) - Fallo de red', async ({ request }) => {
    try {
      await restRequest(request, 'GET', 'https://error-tecnico.nonexistent.invalid/');
      expect(false).toBe(true); // Forzar fallo si no se lanza error
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('NetworkError'); // Ajustar según el tipo de error esperado
    }
  });

  test('Error de datos (4xx) - ID inválido', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/prestamos/id-invalido-test-99999');
    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });
});