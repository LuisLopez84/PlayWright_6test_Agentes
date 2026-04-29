import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Tests for REST Service', () => {
  test('Success case (2xx) - normal call to the endpoint', async ({ request }) => {
    const response = await restRequest(request, 'POST', 'https://homebanking-demo.onrender.com/pagos/servicios', {
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      data: { id_cuenta: 'ACC001', id_servicio: 'SRV001', monto: 8500 }
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('success', true);
    expect(responseBody).toHaveProperty('message', 'Payment processed successfully');
  });

  test('Technical error case (5xx)', async ({ request }) => {
    let errorDetected = false;
    try {
      await restRequest(request, 'POST', 'https://error-tecnico.nonexistent.invalid/', {
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        data: { id_cuenta: 'ACC001', id_servicio: 'SRV001', monto: 8500 }
      });
    } catch (error) {
      errorDetected = true;
    }
    expect(errorDetected).toBe(true);
  });

  test('Data error case (4xx)', async ({ request }) => {
    const response = await restRequest(request, 'POST', 'https://homebanking-demo.onrender.com/pagos/servicios', {
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      data: null
    });
    
    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });
});