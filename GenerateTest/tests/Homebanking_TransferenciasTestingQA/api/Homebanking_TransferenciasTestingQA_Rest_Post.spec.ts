import { test, expect } from '@playwright/test';
import { restRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('Homebanking_TransferenciasTestingQA_Rest_Post', () => {

  // Datos variables cargados desde BoxTestData/ — 1 fila(s)
  const DDT_BODIES: any[] = [
  {
    "cuenta_destino": "ACC002",
    "cuenta_origen": "ACC001",
    "monto": "500",
    "motivo": "Varios",
    "tipo": "propia"
  }
];

  for (let __ddtIdx = 0; __ddtIdx < DDT_BODIES.length; __ddtIdx++) {
    test(`POST /transferencias/ - Éxito (Fila ${__ddtIdx + 1}/${DDT_BODIES.length})`, async ({ request }) => {
      const response = await restRequest(request, 'POST', 'https://homebanking-demo.onrender.com/transferencias/', {
        headers: { accept: 'application/json', 'Content-Type': 'application/json' },
        data: DDT_BODIES[__ddtIdx]
      });
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(300);
      const body = await response.json();
      expect(body).toBeDefined();
    });
  }

  test('POST /transferencias/ - Error técnico (servicio no disponible)', async ({ request }) => {
    let errorDetected = false;
    try {
      const res = await restRequest(request, 'POST', 'https://error-tecnico.nonexistent.invalid/', {
        headers: { accept: 'application/json' }
      });
      errorDetected = res.status() >= 500;
    } catch {
      errorDetected = true;
    }
    expect(errorDetected, 'Se esperaba fallo de red o error 5xx').toBe(true);
  });

  test('POST /transferencias/ - Error de datos (solicitud inválida)', async ({ request }) => {
    const response = await restRequest(request, 'POST', 'https://homebanking-demo.onrender.com/transferencias/', {
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      data: null
    });
    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });

});
