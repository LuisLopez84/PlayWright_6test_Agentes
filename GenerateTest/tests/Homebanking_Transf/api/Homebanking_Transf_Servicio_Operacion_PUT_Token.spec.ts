import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

// Credenciales registradas en thinking-tester-contact-list.herokuapp.com
const USER_EMAIL = 'luis_qa_test_2024@fake.com';
const USER_PASSWORD = 'TestPass123!';

test('PUT /contacts/{id} - actualizar contacto exitoso (200)', async ({ request }) => {
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

  // 3. Actualizar contacto
  const updatePayload = {
    firstName: "Amy",
    lastName: "Miller",
    birthdate: "1992-02-02",
    email: "amiller@fake.com",
    phone: "8005554242",
    street1: "13 School St.",
    street2: "Apt. 5",
    city: "Anytown",
    stateProvince: "KS",
    postalCode: "12345",
    country: "USA"
  };
  const updateRes = await restRequest(request, 'PUT', `https://thinking-tester-contact-list.herokuapp.com/contacts/${contactId}`, {
    data: updatePayload,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  expect(updateRes.status()).toBe(200);
  const updated = await updateRes.json();
  expect(updated.firstName).toBe('Amy');
  expect(updated.lastName).toBe('Miller');
});

test('PUT /contacts/{id} - fallo por ID inválido (404)', async ({ request }) => {
  const loginRes = await restRequest(request, 'POST', 'https://thinking-tester-contact-list.herokuapp.com/users/login', {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
    headers: { 'Content-Type': 'application/json' }
  });
  const { token } = await loginRes.json();

  // ID con formato ObjectId válido pero que no existe en la BD → esperar 404
  const invalidId = '000000000000000000000001';
  const updatePayload = {
    firstName: 'Test', lastName: 'User', birthdate: '1990-01-01',
    email: 'test@fake.com', phone: '8005550000', street1: '1 Test St.',
    street2: '', city: 'Anytown', stateProvince: 'KS', postalCode: '12345', country: 'USA'
  };
  const response = await restRequest(request, 'PUT', `https://thinking-tester-contact-list.herokuapp.com/contacts/${invalidId}`, {
    data: updatePayload,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  expect(response.status()).toBe(404);
});

test('PUT /contacts/{id} - fallo por token inválido (401)', async ({ request }) => {
  const invalidToken = 'invalid-token';
  const updatePayload = { firstName: 'Test' };
  const response = await restRequest(request, 'PUT', 'https://thinking-tester-contact-list.herokuapp.com/contacts/123', {
    data: updatePayload,
    headers: { 'Authorization': `Bearer ${invalidToken}`, 'Content-Type': 'application/json' }
  });
  expect(response.status()).toBe(401);
});