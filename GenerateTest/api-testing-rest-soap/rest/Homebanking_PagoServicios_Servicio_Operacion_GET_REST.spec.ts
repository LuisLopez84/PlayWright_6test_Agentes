import { test, expect } from '@playwright/test';
import { restRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

// Credenciales de prueba (debes registrarte primero en la app)
const USER_EMAIL = 'pruebas@prue.com.co';   // ← Cámbialo por un email real registrado
const USER_PASSWORD = '1234567';        // ← Cámbialo por la contraseña real

test('GET /contacts - obtener lista de contactos (200)', async ({ request }) => {
  // 1. Login para obtener el token
  const loginResponse = await restRequest(request, 'POST', 'https://thinking-tester-contact-list.herokuapp.com/users/login', {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
    headers: { 'Content-Type': 'application/json' }
  });
  expect(loginResponse.status()).toBe(200);
  const { token } = await loginResponse.json();

  // 2. Obtener la lista de contactos
  const response = await restRequest(request, 'GET', 'https://thinking-tester-contact-list.herokuapp.com/contacts', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBeTruthy(); // debe ser un array
  console.log(`📞 Cantidad de contactos: ${body.length}`);
});