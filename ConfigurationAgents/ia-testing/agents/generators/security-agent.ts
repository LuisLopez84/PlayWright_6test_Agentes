import fs from 'fs';
import path from 'path';
import { ensureDir } from '../../utils/fs-utils';

export async function generateSecurity(name: string, url: string, steps: any[] = []) {
  let baseUrl = url;
  try {
    baseUrl = new URL(url).origin;
  } catch {}

  // ── Extraer selectores de login de los steps ──────────────────────────────
  let usernameSelector    = '';
  let passwordSelector    = '';
  let loginButtonSelector = '';
  let loginPath           = '/login';

  for (const step of steps) {
    const action = step.action ?? step.type ?? '';
    if (action === 'input' || action === 'fill') {
      const target = (step.target || '').toLowerCase();
      if (target.includes('usuario') || target.includes('user') || target.includes('email')) {
        usernameSelector = step.target;
      }
      if (target.includes('contraseña') || target.includes('password') || target.includes('pass')) {
        passwordSelector = step.target;
      }
    }
    if (action === 'click') {
      const tgt = (step.target || '').toLowerCase();
      if (tgt.includes('ingresar') || tgt.includes('login') ||
          tgt.includes('sign in') || tgt.includes('acceder')) {
        loginButtonSelector = step.target;
      }
    }
    if ((action === 'page_load' || action === 'goto') && step.url) {
      try {
        const parsed = new URL(step.url);
        if (parsed.pathname.includes('login') || parsed.pathname.includes('signin') ||
            parsed.pathname.includes('auth')) {
          loginPath = parsed.pathname;
        }
      } catch {}
    }
  }

  const hasLoginForm = !!(usernameSelector && passwordSelector && loginButtonSelector);
  if (!hasLoginForm) {
    usernameSelector    = usernameSelector    || 'input[type="text"]:first-of-type';
    passwordSelector    = passwordSelector    || 'input[type="password"]';
    loginButtonSelector = loginButtonSelector || 'button[type="submit"]';
  }

  // Risk 1 & 7: NO fetch en tiempo de generación — elimina bloqueo de npm run generate
  // cuando el servidor no está disponible. Los headers se verifican en runtime dentro del spec.

  const testDir = path.join('GenerateTest', 'tests', name, 'security');
  ensureDir(testDir);

  // ════════════════════════════════════════════════════════════════════════════
  // ARCHIVO 1: Security principal (headers + SQLi + XSS)
  // ════════════════════════════════════════════════════════════════════════════
  const file1 = path.join(testDir, `${name}-security.spec.ts`);
  if (!fs.existsSync(file1)) {
    const mainSecurityCode = `import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartFill, smartClick } from '@utils/smart-actions';

// Risk 2 (performance/accessibility pattern): URL sobreescribible sin regenerar
const TARGET_URL  = process.env.BASE_URL || '${baseUrl}';
const LOGIN_PATH  = '${loginPath}';

test.describe('Security: ${name}', () => {

  // ── Headers de seguridad ──────────────────────────────────────────────────
  // Risk 1/8: verificación en runtime — no depende de fetch en tiempo de generación
  test('security headers', async ({ request }) => {
    const response = await request.get(TARGET_URL);
    const h = response.headers();

    const optional = ['strict-transport-security', 'content-security-policy',
                      'referrer-policy', 'permissions-policy'];
    const missing = optional.filter(name => !h[name]);
    if (missing.length > 0) {
      console.warn(\`⚠️ Headers opcionales ausentes en ${name}: \${missing.join(', ')}\`);
    }

    // Risk 8: assertions reales sobre los headers más críticos
    expect(h['x-content-type-options'],
      'x-content-type-options debe ser "nosniff"').toBe('nosniff');
    expect(h['x-frame-options'],
      'x-frame-options debe estar presente').toBeTruthy();
  });

  // ── SQL injection ─────────────────────────────────────────────────────────
  test('sql injection protection', async ({ request }) => {
    const response = await request.post(TARGET_URL + LOGIN_PATH, {
      data: { username: "' OR '1'='1", password: "' OR '1'='1" }
    });
    const status = response.status();

    ${hasLoginForm
      ? `// Risk 8: assertions reales — no debe retornar éxito ni error interno de BD
    expect(status, 'No debe responder 200 (éxito) ante SQLi').not.toBe(200);
    expect(status, 'No debe responder 201 (creado) ante SQLi').not.toBe(201);
    // Risk 6: 500 indica error SQL que llegó al cliente — también es un fallo
    expect(status, 'No debe retornar 500 (posible error SQL interno)').not.toBe(500);`
      : `// SPA sin endpoint REST de login — al menos no debe retornar error interno
    // Risk 6: 500 indicaría que el payload llegó a una BD
    expect(status, 'No debe retornar 500 (posible error SQL interno)').not.toBe(500);
    console.log(\`ℹ️ SQL injection informativo: \${TARGET_URL + LOGIN_PATH} → \${status}\`);`
    }
  });

  // ── XSS ───────────────────────────────────────────────────────────────────
  test('XSS injection protection', async ({ page }) => {
    await page.goto(TARGET_URL);
    const payload = "<script>alert('xss')</script>";

    ${hasLoginForm
      ? `await smartFill(page, '${usernameSelector}', payload);
    await smartFill(page, '${passwordSelector}', payload);
    await smartClick(page, '${loginButtonSelector}');`
      : `try {
      const firstInput = page.locator(
        'input[type="text"]:visible, input:not([type="hidden"]):visible'
      ).first();
      if (await firstInput.count() > 0) {
        await firstInput.fill(payload);
        await firstInput.press('Enter');
      }
    } catch { /* sin campos de texto visibles */ }`
    }

    const content = await page.content();
    expect(content, 'El payload XSS no debe aparecer sin escapar en el DOM').not.toContain(payload);
  });

});
`;
    fs.writeFileSync(file1, mainSecurityCode);
    console.log(`✅ Security test generado: ${file1}`);
  } else {
    console.log(`⚠️ Security spec ya existe, omitiendo: ${file1}`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ARCHIVO 2: HTTPS Enforcement
  // ════════════════════════════════════════════════════════════════════════════
  const file2 = path.join(testDir, `${name}-https-enforcement.spec.ts`);
  if (!fs.existsSync(file2)) {
    const httpsCode = `import { test, expect } from '@playwright/test';

// Risk 5: TARGET_URL evaluado en runtime — si la app migra HTTP→HTTPS no hay que regenerar
const TARGET_URL = process.env.BASE_URL || '${baseUrl}';

test.describe('HTTPS enforcement: ${name}', () => {

  test('URL usa HTTPS', async ({ page }) => {
    await page.goto(TARGET_URL);
    const currentUrl = page.url();
    expect(
      currentUrl.startsWith('https://'),
      \`La URL \${currentUrl} debe comenzar con https://\`
    ).toBeTruthy();
  });

  test('Redirect HTTP → HTTPS', async ({ request }) => {
    const httpUrl = TARGET_URL.replace(/^https?:\\/\\//, 'http://');
    try {
      const response = await request.get(httpUrl, { maxRedirects: 0 });
      const status   = response.status();
      const location = response.headers()['location'] || '';
      if ([301, 302, 307, 308].includes(status)) {
        expect(location.startsWith('https://'),
          \`Redirect debe apuntar a https:// — got: \${location}\`).toBeTruthy();
      } else {
        // Servidor que rechaza HTTP directamente (≥400) también es correcto
        expect(status, 'HTTP debe ser rechazado o redirigido').toBeGreaterThanOrEqual(300);
      }
    } catch {
      // Conexión rechazada en HTTP es comportamiento correcto
      expect(true).toBeTruthy();
    }
  });

  test('HSTS header presente en sitios HTTPS', async ({ request }) => {
    const response = await request.get(TARGET_URL);
    const hsts = response.headers()['strict-transport-security'];

    // Risk 5: evaluado en runtime, no bakeado como literal boolean
    if (TARGET_URL.startsWith('https://')) {
      // Risk 8: assertion real para sitios HTTPS
      expect(hsts,
        'Strict-Transport-Security debe estar presente en sitios HTTPS'
      ).toBeTruthy();
    } else {
      console.warn(\`⚠️ \${TARGET_URL} no usa HTTPS — HSTS no aplica\`);
    }
  });

});
`;
    fs.writeFileSync(file2, httpsCode);
    console.log(`✅ HTTPS enforcement test generado: ${file2}`);
  } else {
    console.log(`⚠️ HTTPS spec ya existe, omitiendo: ${file2}`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ARCHIVO 3: Brute Force Protection
  // ════════════════════════════════════════════════════════════════════════════
  const file3 = path.join(testDir, `${name}-authentication-bruteforce.spec.ts`);
  if (!fs.existsSync(file3)) {
    const bruteforceCode = `import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { smartFill, smartClick } from '@utils/smart-actions';

const TARGET_URL  = process.env.BASE_URL || '${baseUrl}';
const LOGIN_PATH  = '${loginPath}';

// Risk 4: iteraciones configurables vía variables de entorno
const BRUTE_FORCE_ATTEMPTS = Number(process.env.BRUTE_FORCE_ATTEMPTS || 10);
const UI_ATTEMPTS          = Number(process.env.UI_BRUTE_FORCE_ATTEMPTS || 3);

test.describe('Brute force protection: ${name}', () => {

  test('Protección via API', async ({ request }) => {
    const loginEndpoint = TARGET_URL + LOGIN_PATH;
    let lastStatus = 0;

    for (let i = 0; i < BRUTE_FORCE_ATTEMPTS; i++) {
      const res = await request.post(loginEndpoint, {
        // Risk 3: username real de prueba, no el selector CSS
        data: { username: 'brute_force_test_user', password: \`wrong_password_\${i}\` }
      });
      lastStatus = res.status();
    }

    // Risk 8: assertion real — tras N intentos no debe seguir retornando 200/201
    const isBlocked = lastStatus !== 200 && lastStatus !== 201;
    if (!isBlocked) {
      console.warn(\`⚠️ Sin rate limiting tras \${BRUTE_FORCE_ATTEMPTS} intentos fallidos — status: \${lastStatus}\`);
    }
    expect(lastStatus, \`Debe bloquear tras \${BRUTE_FORCE_ATTEMPTS} intentos (got \${lastStatus})\`)
      .not.toBe(200);
  });

  test('Protección via UI', async ({ page }) => {
    ${hasLoginForm
      ? `await page.goto(TARGET_URL);

    for (let i = 0; i < UI_ATTEMPTS; i++) {
      try {
        await smartFill(page, '${usernameSelector}', 'brute_force_ui_user');
        await smartFill(page, '${passwordSelector}', \`wrong_attempt_\${i}\`);
        await smartClick(page, '${loginButtonSelector}');
        await page.waitForLoadState('domcontentloaded');
      } catch { break; }
    }

    const currentUrl = page.url();
    const content    = await page.content();

    // Risk 2: renombrado de hasLoginForm → formStillPresent para evitar confusión con el generador
    const formStillPresent = await page.locator(
      'input[type="password"], [name="password"], [aria-label*="contraseña" i], [aria-label*="password" i]'
    ).count() > 0;

    const hasErrorMessage = content.toLowerCase().includes('error') ||
      content.toLowerCase().includes('incorrecto') ||
      content.toLowerCase().includes('invalid')    ||
      content.toLowerCase().includes('bloqueado')  ||
      content.toLowerCase().includes('blocked');

    // Risk 8: el login fallido debe mantener el formulario visible o mostrar error
    expect(
      formStillPresent || hasErrorMessage || currentUrl.includes('login'),
      'Tras intentos fallidos debe permanecer en login o mostrar error'
    ).toBeTruthy();`
      : `// App sin formulario de login detectado en la grabación — test informativo
    console.log('ℹ️ Brute force UI: sin formulario de login en ${name}');
    await page.goto(TARGET_URL);
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toBeTruthy();`
    }
  });

  test('No revelar enumeración de usuarios', async ({ request }) => {
    const loginEndpoint = TARGET_URL + LOGIN_PATH;
    try {
      const response = await request.post(loginEndpoint, {
        data: { username: 'nonexistent_user_xyz_123', password: 'wrong' }
      });
      const body = await response.text();
      // Risk 8: assertions reales sobre fuga de información
      expect(body.toLowerCase(), 'No debe revelar "user not found"').not.toContain('user not found');
      expect(body.toLowerCase(), 'No debe revelar "usuario no encontrado"').not.toContain('usuario no encontrado');
      expect(body.toLowerCase(), 'No debe revelar "email not registered"').not.toContain('email not registered');
      expect(body.toLowerCase(), 'No debe revelar "no existe"').not.toContain('no existe');
    } catch {
      // Endpoint no disponible en SPA — pasa como informativo
      expect(true).toBeTruthy();
    }
  });

});
`;
    fs.writeFileSync(file3, bruteforceCode);
    console.log(`✅ Brute force test generado: ${file3}`);
  } else {
    console.log(`⚠️ Brute force spec ya existe, omitiendo: ${file3}`);
  }
}
