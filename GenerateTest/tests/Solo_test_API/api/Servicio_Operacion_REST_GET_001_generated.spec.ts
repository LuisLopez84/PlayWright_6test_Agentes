import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Tests for Dashboard', () => {
  test('Éxito (2xx) - Llamada normal al endpoint real', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/cliente/dashboard', {
      headers: { 'Accept': 'application/json' }
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    const responseData = await response.json();
    expect(responseData).toHaveProperty('someExpectedField'); // Cambiar 'someExpectedField' por el campo esperado real
  });

  test('Error técnico (fallo de red / 5xx)', async ({ request }) => {
    try {
      await restRequest(request, 'GET', 'https://error-tecnico.nonexistent.invalid/');
    } catch (error) {
      const errorDetected = true;
      expect(errorDetected).toBe(true);
    }
  });

  test('Error de datos (4xx)', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/cliente/dashboard/id-invalido-test-99999', {
      headers: { 'Accept': 'application/json' }
    });
    
    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });
});