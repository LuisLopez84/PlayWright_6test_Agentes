import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';

test('Security Headers Validation', async ({ request }) => {

  const response = await request.get('/');

  const headers = response.headers();

  expect(headers['x-frame-options']).toBeTruthy();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-xss-protection']).toBeTruthy();
  expect(headers['strict-transport-security']).toBeTruthy();
  expect(headers['content-security-policy']).toBeTruthy();

});






