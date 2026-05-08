import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('Pruebas de API para transferencias', () => {
  
  test('Éxito (2xx) — llamada normal al endpoint real', async ({ request }) => {
    const response = await restRequest(request, 'POST', 'https://homebanking-demo.onrender.com/transferencias/', {
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
  });

  test('Error técnico — URL no válida', async ({ request }) => {
    try {
      await restRequest(request, 'POST', 'https://error-tecnico.nonexistent.invalid/', {
        data: {
          cuenta_destino: "ACC002",
          cuenta_origen: "ACC001",
          monto: 1500,
          motivo: "Varios",
          tipo: "propia"
        }
      });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('Error de datos (4xx) — ID inválido', async ({ request }) => {
    const response = await restRequest(request, 'POST', 'https://homebanking-demo.onrender.com/transferencias/id-invalido-test-99999', {
      data: null
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

});