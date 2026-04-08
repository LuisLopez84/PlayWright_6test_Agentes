import { test, expect } from '@playwright/test';
import { restRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test('POST /transferencias/ - éxito (200 o 201)', async ({ request }) => {
  const payload = {
    cuenta_destino: "ACC002",
    cuenta_origen: "ACC001",
    monto: 1500,
    motivo: "Varios",
    tipo: "propia"
  };
  const response = await restRequest(request, 'POST', 'https://homebanking-demo.onrender.com/transferencias/', {
    data: payload,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json'
    }
  });
  expect(response.status()).toBe(200); // o 201 según la API
  const body = await response.json();
  expect(body).toBeDefined();
});