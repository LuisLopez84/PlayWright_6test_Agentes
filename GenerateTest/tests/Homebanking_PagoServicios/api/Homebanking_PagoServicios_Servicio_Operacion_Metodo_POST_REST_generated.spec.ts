import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Tests for User Records', () => {
  test('POST - Create User Record - Success', async ({ request }) => {
    const response = await restRequest(request, 'POST', 'https://reqres.in/api/test-suite/collections/users/records', {
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      data: {
        name: "Jane Doe",
        email: "jane@example.com",
        role: "admin"
      }
    });

    expect(response.status()).toBe(201);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('name', 'Jane Doe');
    expect(responseBody).toHaveProperty('email', 'jane@example.com');
    expect(responseBody).toHaveProperty('role', 'admin');
  });

  test('POST - Create User Record - Error', async ({ request }) => {
    const response = await restRequest(request, 'POST', 'https://reqres.in/api/test-suite/collections/users/records', {
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      data: {
        name: "", // Invalid name
        email: "jane@example.com",
        role: "admin"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});