import { test, expect } from '@playwright/test';
import { restRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

// Credenciales de prueba (debes registrarte primero en la app)
const USER_EMAIL = 'pruebas@prue.com.co';   // ← Cámbialo por un email real registrado
const USER_PASSWORD = '1234567';        // ← Cámbialo por la contraseña real

test('POST /contacts - crear contacto exitoso (201)', async ({ request }) => {
  // 1. Login para obtener el token
  const loginResponse = await restRequest(request, 'POST', 'https://thinking-tester-contact-list.herokuapp.com/users/login', {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
    headers: { 'Content-Type': 'application/json' }
  });
  expect(loginResponse.status()).toBe(200);
  const { token } = await loginResponse.json();

  // 2. Crear contacto
  const response = await restRequest(request, 'POST', 'https://thinking-tester-contact-list.herokuapp.com/contacts', {
    data: {
      firstName: "Luis",
      lastName: "Doe",
      birthdate: "1970-01-01",
      email: "luis@fake.com",
      phone: "8005555555",
      street1: "1 Main St.",
      street2: "Apartment A",
      city: "Anytown",
      stateProvince: "KS",
      postalCode: "12345",
      country: "USA"
    },
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toHaveProperty('_id');
});