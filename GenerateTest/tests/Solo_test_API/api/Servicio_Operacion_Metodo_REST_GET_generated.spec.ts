import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('API Tests for Users Records', () => {
  test('GET users records - success', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://reqres.in/api/test-suite/collections/users/records', {
      headers: { 'Accept': 'application/json' }
    });

    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('data');
    expect(Array.isArray(responseBody.data)).toBe(true);
  });

  test('GET users records - not found', async ({ request }) => {
    const response = await restRequest(request, 'GET', 'https://reqres.in/api/test-suite/collections/users/invalid', {
      headers: { 'Accept': 'application/json' }
    });

    expect(response.status()).toBe(404);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('error', 'Not Found');
  });
});