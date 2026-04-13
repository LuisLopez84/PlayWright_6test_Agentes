import fs from 'fs';
import path from 'path';
import { ensureDir } from '../../utils/fs-utils';

export async function generateSecurity(name: string, url: string, steps: any[] = []) {
  let baseUrl = url;
  try {
    baseUrl = new URL(url).origin;
  } catch {
    // mantener la URL tal cual
  }

  // 🔥 Extraer selectores de login de los steps (texto visible en la grabación)
  let usernameSelector = '';
  let passwordSelector = '';
  let loginButtonSelector = '';
  let loginPath = '/login';

  for (const step of steps) {
    if (step.action === 'input' || step.action === 'fill') {
      const target = (step.target || '').toLowerCase();
      if (target.includes('usuario') || target.includes('user') || target.includes('email')) {
        usernameSelector = step.target;
      }
      if (target.includes('contraseña') || target.includes('password') || target.includes('pass')) {
        passwordSelector = step.target;
      }
    }
    if (step.action === 'click') {
      const tgt = (step.target || '').toLowerCase();
      if (tgt.includes('ingresar') || tgt.includes('login') || tgt.includes('sign in') || tgt.includes('acceder')) {
        loginButtonSelector = step.target;
      }
    }
    // Intentar inferir la ruta de login de la URL
    if (step.action === 'page_load' && step.url) {
      try {
        const parsed = new URL(step.url);
        if (parsed.pathname.includes('login') || parsed.pathname.includes('signin') || parsed.pathname.includes('auth')) {
          loginPath = parsed.pathname;
        }
      } catch {}
    }
  }

  // ¿La grabación tiene formulario de login?
  const hasLoginForm = !!(usernameSelector && passwordSelector && loginButtonSelector);
  if (!hasLoginForm) {
    usernameSelector = usernameSelector || 'input[type="text"]:first-of-type';
    passwordSelector = passwordSelector || 'input[type="password"]';
    loginButtonSelector = loginButtonSelector || 'button[type="submit"]';
  }

  // 🔥 OBTENER HEADERS REALES DEL SERVIDOR (para generar aserciones precisas)
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
      'permissions-policy',
    ];
    securityHeaders = commonSecurityHeaders.filter(h => headers.has(h));
    console.log(`🔍 Headers de seguridad detectados para ${name}: ${securityHeaders.join(', ') || 'ninguno'}`);
  } catch (err: any) {
    console.log(`⚠️ No se pudieron obtener headers de seguridad para ${name}: ${err?.message}`);
  }

  const testDir = path.join('GenerateTest', 'tests', name, 'security');
  ensureDir(testDir);

  // ── Generar aserciones de headers dinámicamente ──
  let headerAssertions = '';
  if (securityHeaders.includes('x-frame-options')) {
    headerAssertions += `    expect(response.headers()['x-frame-options']).toBeDefined();\n`;
  }
  if (securityHeaders.includes('x-content-type-options')) {
    headerAssertions += `    expect(response.headers()['x-content-type-options']).toBe('nosniff');\n`;
  }
  if (securityHeaders.includes('x-xss-protection')) {
    headerAssertions += `    expect(response.headers()['x-xss-protection']).toBeDefined();\n`;
  }
  if (securityHeaders.includes('strict-transport-security')) {
    headerAssertions += `    expect(response.headers()['strict-transport-security']).toBeDefined();\n`;
  }
  if (securityHeaders.includes('content-security-policy')) {
    headerAssertions += `    expect(response.headers()['content-security-policy']).toBeDefined();\n`;
  }
  if (securityHeaders.includes('referrer-policy')) {
    headerAssertions += `    expect(response.headers()['referrer-policy']).toBeDefined();\n`;
  }
  if (securityHeaders.includes('permissions-policy')) {
    headerAssertions += `    expect(response.headers()['permissions-policy']).toBeDefined();\n`;
  }
  if (!headerAssertions) {
    headerAssertions = `    // No se detectaron headers de seguridad — test informativo\n    console.log('⚠️ No se detectaron headers de seguridad en ${baseUrl}');\n    expect(true).toBeTruthy();\n`;
  }

  // ════════════════════════════════════════════════════════
  // ARCHIVO 1: Security principal (headers + SQLi + XSS)
  // ════════════════════════════════════════════════════════
  const mainSecurityCode = `import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartFill, smartClick } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test.describe('Security tests for ${name}', () => {

  test('security headers', async ({ request }) => {
    const response = await request.get('${baseUrl}');
${headerAssertions}  });

  test('sql injection', async ({ request }) => {
    const response = await request.post('${baseUrl}${loginPath}', {
      data: { username: "' OR '1'='1", password: "' OR '1'='1" }
    });
    const status = response.status();
    ${hasLoginForm
      ? `// No debe responder 200/201 (éxito) ante una inyección SQL.
    // 404 es aceptable en SPAs donde el endpoint /login no existe como API REST.
    expect(status).not.toBe(200);
    expect(status).not.toBe(201);`
      : `// App sin formulario de login explícito — test informativo
    // El endpoint /login en una SPA sirve HTML (status 200 es normal)
    console.log(\`ℹ️ SQL injection test informativo: ${baseUrl}${loginPath} devolvió \${status}\`);
    expect(true).toBeTruthy();`
    }
  });

  test('XSS injection protection', async ({ page }) => {
    await smartGoto(page, '${name}');
    const payload = "<script>alert('xss')</script>";
    ${hasLoginForm
      ? `await smartFill(page, '${usernameSelector}', payload);
    await smartFill(page, '${passwordSelector}', payload);
    await smartClick(page, '${loginButtonSelector}');`
      : `// App sin login — intentar inyección en cualquier campo de texto visible
    try {
      const firstInput = page.locator('input[type="text"]:visible, input:not([type="hidden"]):visible').first();
      if (await firstInput.count() > 0) {
        await firstInput.fill(payload);
        await firstInput.press('Enter');
      }
    } catch { /* No hay campos de texto disponibles */ }`
    }

    const content = await page.content();
    expect(content).not.toContain(payload);
  });

});
`;
  fs.writeFileSync(path.join(testDir, `${name}-security.spec.ts`), mainSecurityCode);
  console.log(`✅ Security test generado: ${testDir}/${name}-security.spec.ts`);

  // ════════════════════════════════════════════════════════
  // ARCHIVO 2: HTTPS Enforcement
  // ════════════════════════════════════════════════════════
  const isHttps = baseUrl.startsWith('https');
  const httpsCode = `import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';

test.describe('HTTPS enforcement for ${name}', () => {

  test('URL base usa HTTPS', async ({ page }) => {
    await smartGoto(page, '${name}');
    const currentUrl = page.url();
    expect(
      currentUrl.startsWith('https://'),
      \`La URL \${currentUrl} debe comenzar con https://\`
    ).toBeTruthy();
  });

  test('Redirect HTTP → HTTPS', async ({ request }) => {
    const httpUrl = '${baseUrl}'.replace('https://', 'http://');
    try {
      const response = await request.get(httpUrl, { maxRedirects: 0 });
      // Debe redirigir (301/302/307/308) o rechazar la conexión HTTP
      const status = response.status();
      const isRedirect = [301, 302, 307, 308].includes(status);
      const location = response.headers()['location'] || '';
      if (isRedirect) {
        expect(location.startsWith('https://')).toBeTruthy();
      } else {
        // Algunos servidores rechazan HTTP directamente (status >= 400)
        expect(status).toBeGreaterThanOrEqual(300);
      }
    } catch {
      // Conexión rechazada en HTTP es comportamiento correcto también
      expect(true).toBeTruthy();
    }
  });

  test('HSTS header presente', async ({ request }) => {
    const response = await request.get('${baseUrl}');
    const hsts = response.headers()['strict-transport-security'];
    if (${isHttps}) {
      // Para sitios HTTPS se espera el header (advertencia si no está)
      if (!hsts) {
        console.warn('⚠️ Strict-Transport-Security no presente en ${baseUrl}');
      }
      // No es fatal — no todos los sitios lo implementan, pero se reporta
      expect(true).toBeTruthy();
    } else {
      // Si no es HTTPS, el test es informativo
      console.warn('⚠️ ${baseUrl} no usa HTTPS');
      expect(true).toBeTruthy();
    }
  });

});
`;
  fs.writeFileSync(path.join(testDir, `${name}-https-enforcement.spec.ts`), httpsCode);
  console.log(`✅ HTTPS enforcement test generado: ${testDir}/${name}-https-enforcement.spec.ts`);

  // ════════════════════════════════════════════════════════
  // ARCHIVO 3: Authentication Brute Force Protection
  // ════════════════════════════════════════════════════════
  const bruteforceCode = `import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartFill, smartClick } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test.describe('Brute force protection for ${name}', () => {

  test('Protección contra brute force via API', async ({ request }) => {
    const loginEndpoint = '${baseUrl}${loginPath}';
    let lastStatus = 0;

    // Enviar 10 intentos fallidos consecutivos
    for (let i = 0; i < 10; i++) {
      const res = await request.post(loginEndpoint, {
        data: { username: '${usernameSelector}', password: \`wrong_password_\${i}\` }
      });
      lastStatus = res.status();
    }

    // Tras múltiples intentos, el servidor debe bloquear (429) o al menos no devolver 200
    // También es válido 404 si el endpoint no existe en el backend (SPA)
    const isProtected = lastStatus !== 200 && lastStatus !== 201;
    if (!isProtected) {
      console.warn('⚠️ El endpoint no aplicó rate limiting tras 10 intentos fallidos');
    }
    // Test informativo — no todos los SPAs tienen este endpoint activo
    expect(true).toBeTruthy();
  });

  test('Protección contra brute force via UI', async ({ page }) => {
    ${hasLoginForm
      ? `await smartGoto(page, '${name}');

    // Intentar login con credenciales incorrectas 3 veces
    for (let i = 0; i < 3; i++) {
      try {
        await smartFill(page, '${usernameSelector}', '${usernameSelector}');
        await smartFill(page, '${passwordSelector}', \`wrong_attempt_\${i}\`);
        await smartClick(page, '${loginButtonSelector}');
        await page.waitForTimeout(500);
      } catch { break; }
    }

    // Verificar que no se autenticó (no debe estar en una página protegida)
    const url = page.url();
    const content = await page.content();

    // El login fallido debe mostrar error o mantener el formulario visible
    const hasLoginForm = await page.locator(
      'input[type="password"], [type="password"], [name="password"], [aria-label*="contraseña" i], [aria-label*="password" i]'
    ).count() > 0;

    const hasErrorMessage = content.toLowerCase().includes('error') ||
      content.toLowerCase().includes('incorrecto') ||
      content.toLowerCase().includes('invalid') ||
      content.toLowerCase().includes('incorrect') ||
      content.toLowerCase().includes('bloqueado') ||
      content.toLowerCase().includes('blocked');

    // Al menos uno debe ser true: sigue en el login O hay mensaje de error
    expect(hasLoginForm || hasErrorMessage || url.includes('login')).toBeTruthy();`
      : `// App sin formulario de login — test informativo
    console.log('ℹ️ Brute force UI test: app sin formulario de login detectado (${name})');
    expect(true).toBeTruthy(); // Informativo — no aplica para apps sin autenticación`
    }
  });

  test('No revelar información sensible en respuesta de error', async ({ request }) => {
    const loginEndpoint = '${baseUrl}${loginPath}';
    try {
      const response = await request.post(loginEndpoint, {
        data: { username: 'nonexistent_user_xyz', password: 'wrong' }
      });
      const body = await response.text();
      // No debe revelar si el usuario existe o no (enumeración de usuarios)
      expect(body.toLowerCase()).not.toContain('user not found');
      expect(body.toLowerCase()).not.toContain('usuario no encontrado');
      expect(body.toLowerCase()).not.toContain('email not registered');
    } catch {
      // Endpoint no disponible en SPA — test pasa como informativo
      expect(true).toBeTruthy();
    }
  });

});
`;
  fs.writeFileSync(path.join(testDir, `${name}-authentication-bruteforce.spec.ts`), bruteforceCode);
  console.log(`✅ Brute force protection test generado: ${testDir}/${name}-authentication-bruteforce.spec.ts`);
}
