import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';

test('SQL Injection protection', async ({ request }) => {

  const response = await request.post('/login', {
    data: {
      username: "' OR '1'='1",
      password: "' OR '1'='1"
    }
  });

  expect(response.status()).not.toBe(200);

});

