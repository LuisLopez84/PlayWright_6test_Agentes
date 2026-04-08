import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';

test('Login brute force protection', async ({ request }) => {

  for (let i = 0; i < 10; i++) {

    await request.post('/login', {
      data: {
        username: 'demo',
        password: 'wrongpassword'
      }
    });

  }

  const response = await request.post('/login', {
    data: {
      username: 'demo',
      password: 'wrongpassword'
    }
  });

  expect(response.status()).not.toBe(200);

});

