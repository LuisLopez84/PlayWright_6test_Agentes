import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Tests for REST Service', () => {
  test('Success - GET request to the endpoint', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/prestamos/');
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('data'); // Ajustar según la estructura real de la respuesta
    expect(responseBody.data).toBeInstanceOf(Array); // Ajustar según la estructura real de la respuesta
  });

  test('Technical Error - Simulate network failure', async ({ request }) => {
    let errorDetected = false;
    try {
      await restRequest(request, 'GET', 'https://error-tecnico.nonexistent.invalid/');
    } catch (error) {
      errorDetected = true;
    }
    expect(errorDetected).toBe(true);
  });

  test('Data Error - Invalid ID for GET request', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/prestamos/id-invalido-test-99999');
    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });
});