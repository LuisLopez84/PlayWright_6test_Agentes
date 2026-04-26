import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Tests', () => {
  test('PUT request - success', async ({ request }) => {
    const response = await restRequest(request, 'PUT', 'https://reqres.in/api/test-suite/collections/users/records/rec_eawy3i3s', {
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      data: {
        name: "Jane Doe",
        email: "jane@example.com",
        role: "superadmin"
      }
    });

    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('name', 'Jane Doe');
    expect(responseBody).toHaveProperty('email', 'jane@example.com');
    expect(responseBody).toHaveProperty('role', 'superadmin');
  });

  test('PUT request - error', async ({ request }) => {
    const response = await restRequest(request, 'PUT', 'https://reqres.in/api/test-suite/collections/users/records/invalid_id', {
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      data: {
        name: "Jane Doe",
        email: "jane@example.com",
        role: "superadmin"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});