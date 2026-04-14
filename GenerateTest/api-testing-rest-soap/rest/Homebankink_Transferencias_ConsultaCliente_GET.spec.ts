import { test, expect } from '@playwright/test';
import { restRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test('GET /cliente/dashboard - éxito (200)', async ({ request }) => {
  const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/cliente/dashboard', {
    headers: { accept: 'application/json' }
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  // Ajusta la propiedad según lo que devuelva la API
  expect(body).toBeDefined();
});