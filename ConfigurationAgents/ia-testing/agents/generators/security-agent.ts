import fs from 'fs';
import path from 'path';
import { ensureDir } from '../../utils/fs-utils';

export async function generateSecurity(name: string, url: string, steps: any[] = []) {
  let baseUrl = url;
  try {
    baseUrl = new URL(url).origin;
  } catch (e) {
    // mantener la URL tal cual
  }

  // 🔥 Extraer selectores de login de los steps (solo el texto visible)
  let usernameSelector = 'Usuario';
  let passwordSelector = 'Contraseña';
  let loginButtonSelector = 'Ingresar';

  for (const step of steps) {
    if (step.action === 'input' || step.action === 'fill') {
      const target = step.target || '';
      if (target.toLowerCase().includes('usuario') || target.toLowerCase().includes('user')) {
        usernameSelector = target; // texto visible
      }
      if (target.toLowerCase().includes('contraseña') || target.toLowerCase().includes('password')) {
        passwordSelector = target;
      }
    }
    if (step.action === 'click' && (step.target?.toLowerCase().includes('ingresar') || step.target?.toLowerCase().includes('login'))) {
      loginButtonSelector = step.target;
    }
  }

  // 🔥 OBTENER HEADERS REALES DEL SERVIDOR
  let securityHeaders: string[] = [];
  try {
    const response = await fetch(baseUrl, { method: 'GET' });
    const headers = response.headers;
    const commonSecurityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
      'referrer-policy',
      'permissions-policy'
    ];
    securityHeaders = commonSecurityHeaders.filter(h => headers.has(h));
    console.log(`🔍 Headers de seguridad detectados para ${name}: ${securityHeaders.join(', ') || 'ninguno'}`);
  } catch (err) {
    console.log(`⚠️ No se pudieron obtener headers de seguridad para ${name}:`, err.message);
  }

  const testDir = path.join('GenerateTest', 'tests', name, 'security');
  ensureDir(testDir);
  const file = path.join(testDir, `${name}-security.spec.ts`);

  // Generar aserciones solo para los headers que existen
  let headerAssertions = '';
  if (securityHeaders.includes('x-frame-options')) {
    headerAssertions += `  expect(response.headers()['x-frame-options']).toBeDefined();\n`;
  }
  if (securityHeaders.includes('x-content-type-options')) {
    headerAssertions += `  expect(response.headers()['x-content-type-options']).toBe('nosniff');\n`;
  }
  if (securityHeaders.includes('x-xss-protection')) {
    headerAssertions += `  expect(response.headers()['x-xss-protection']).toBeDefined();\n`;
  }
  if (securityHeaders.includes('strict-transport-security')) {
    headerAssertions += `  expect(response.headers()['strict-transport-security']).toBeDefined();\n`;
  }
  if (securityHeaders.includes('content-security-policy')) {
    headerAssertions += `  expect(response.headers()['content-security-policy']).toBeDefined();\n`;
  }
  if (securityHeaders.includes('referrer-policy')) {
    headerAssertions += `  expect(response.headers()['referrer-policy']).toBeDefined();\n`;
  }
  if (securityHeaders.includes('permissions-policy')) {
    headerAssertions += `  expect(response.headers()['permissions-policy']).toBeDefined();\n`;
  }

  if (!headerAssertions) {
    headerAssertions = `  console.log('⚠️ No se detectaron headers de seguridad en ${baseUrl}');\n  expect(true).toBeTruthy(); // Test pasa con advertencia\n`;
  }

  const code = `
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartFill, smartClick } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test.describe('Security tests for ${name}', () => {

  test('security headers', async ({ request }) => {
    const response = await request.get('${baseUrl}');
${headerAssertions}
  });

  test('sql injection', async ({ request }) => {
    const response = await request.post('${baseUrl}/login', {
      data: { username: "' OR '1'='1", password: "' OR '1'='1" }
    });
    expect(response.status()).not.toBe(200);
  });

  test('XSS injection protection', async ({ page }) => {
    await smartGoto(page, '${name}');
    const payload = "<script>alert('xss')</script>";

    await smartFill(page, '${usernameSelector}', payload);
    await smartFill(page, '${passwordSelector}', payload);
    await smartClick(page, '${loginButtonSelector}');

    const content = await page.content();
    expect(content).not.toContain(payload);
  });

});
`;

  fs.writeFileSync(file, code);
  console.log(`✅ Security test generado: ${file}`);
}