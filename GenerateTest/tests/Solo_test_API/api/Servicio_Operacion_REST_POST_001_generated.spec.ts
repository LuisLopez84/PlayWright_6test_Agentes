import { test, expect, APIRequestContext } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Tests - Transferencias', () => {
  test('Éxito (2xx) - Llamada normal al endpoint real', async ({ request }) => {
    const response = await restRequest(request, 'POST', 'https://homebanking-demo.onrender.com/transferencias/', {
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      data: {
        cuenta_destino: "ACC002",
        cuenta_origen: "ACC001",
        monto: 1500,
        motivo: "Varios",
        tipo: "propia"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('success', true);
    expect(responseBody).toHaveProperty('message', 'Transferencia realizada con éxito');
  });

  test('Error técnico (5xx) - Fallo de red', async ({ request }) => {
    try {
      await restRequest(request, 'POST', 'https://error-tecnico.nonexistent.invalid/', {
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        data: {
          cuenta_destino: "ACC002",
          cuenta_origen: "ACC001",
          monto: 1500,
          motivo: "Varios",
          tipo: "propia"
        }
      });
      expect(false).toBe(true); // Si no lanza error, falla el test
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('NetworkError');
    }
  });

  test('Error de datos (4xx) - Datos inválidos', async ({ request }) => {
    const response = await restRequest(request, 'POST', 'https://homebanking-demo.onrender.com/transferencias/', {
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      data: null
    });

    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });
});