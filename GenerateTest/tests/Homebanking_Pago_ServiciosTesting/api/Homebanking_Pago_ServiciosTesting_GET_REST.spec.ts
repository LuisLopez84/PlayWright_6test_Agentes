import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('Pruebas de API para el servicio de préstamos', () => {
  
  test('Éxito (2xx) — llamada normal al endpoint real', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/prestamos/');
    expect(response.status()).toBe(200);
    expect(response.body()).not.toBeNull();
  });

  test('Error técnico — URL no válida', async ({ request }) => {
    try {
      await restRequest(request, 'GET', 'https://error-tecnico.nonexistent.invalid/');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('Error de datos (4xx) — ID inválido', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/prestamos/id-invalido-test-99999');
    expect(response.status()).toBe(404);
    expect(response.body()).toContain('not found');
  });

});