import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

// Credenciales (cámbialas por las tuyas)
const USER_EMAIL = 'pruebas@prue.com.co';
const USER_PASSWORD = '1234567';

test('DELETE /contacts/{id} - eliminar contacto exitoso (200)', async ({ request }) => {
  // 1. Login
  const loginRes = await restRequest(request, 'POST', 'https://thinking-tester-contact-list.herokuapp.com/users/login', {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
    headers: { 'Content-Type': 'application/json' }
  });
  expect(loginRes.status()).toBe(200);
  const { token } = await loginRes.json();

  // 2. Crear contacto temporal
  const createPayload = {
    firstName: "John",
    lastName: "Doe",
    birthdate: "1970-01-01",
    email: "jdoe@fake.com",
    phone: "8005555555",
    street1: "1 Main St.",
    street2: "Apartment A",
    city: "Anytown",
    stateProvince: "KS",
    postalCode: "12345",
    country: "USA"
  };
  const createRes = await restRequest(request, 'POST', 'https://thinking-tester-contact-list.herokuapp.com/contacts', {
    data: createPayload,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  expect(createRes.status()).toBe(201);
  const { _id: contactId } = await createRes.json();

  // 3. Eliminar contacto
  const deleteRes = await restRequest(request, 'DELETE', `https://thinking-tester-contact-list.herokuapp.com/contacts/${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  expect(deleteRes.status()).toBe(200); // Algunas APIs devuelven 204, aquí se espera 200 según documentación

  // 4. Verificar que ya no existe (GET debería dar 404)
  const getRes = await restRequest(request, 'GET', `https://thinking-tester-contact-list.herokuapp.com/contacts/${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  expect(getRes.status()).toBe(404);
});

test('DELETE /contacts/{id} - fallo por ID inválido (404)', async ({ request }) => {
  const loginRes = await restRequest(request, 'POST', 'https://thinking-tester-contact-list.herokuapp.com/users/login', {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
    headers: { 'Content-Type': 'application/json' }
  });
  const { token } = await loginRes.json();

  const invalidId = '000000000000000000000000';
  const response = await restRequest(request, 'DELETE', `https://thinking-tester-contact-list.herokuapp.com/contacts/${invalidId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  expect(response.status()).toBe(404);
});

test('DELETE /contacts/{id} - fallo por token inválido (401)', async ({ request }) => {
  const invalidToken = 'invalid-token';
  const response = await restRequest(request, 'DELETE', 'https://thinking-tester-contact-list.herokuapp.com/contacts/123', {
    headers: { 'Authorization': `Bearer ${invalidToken}` }
  });
  expect(response.status()).toBe(401);
});