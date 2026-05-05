import fs from 'fs';
import path from 'path';
import { ensureDir } from '../../utils/fs-utils';

// Métodos soportados directamente por la API de request de Playwright
const PLAYWRIGHT_DIRECT_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch']);

export function generateApiTests(flowName: string, apis: any[]): void {
  if (!apis.length) {
    console.log('ℹ️ No API calls discovered, skipping API tests');
    return;
  }

  // Risk 7: path relativo consistente con el resto de generadores
  const testDir = path.join('GenerateTest', 'tests', flowName, 'api');
  ensureDir(testDir);

  const restApis     = apis.filter(a => (a.type ?? 'rest') !== 'graphql');
  const graphqlApis  = apis.filter(a => a.type === 'graphql');

  // ── Preamble del spec generado ─────────────────────────────────────────────
  let tests = `import { test, expect } from '@playwright/test';

// Risk 5: autenticación configurable via variables de entorno
// Configura API_TOKEN (Bearer) o API_KEY según los requisitos del API bajo prueba.
const AUTH_TOKEN = process.env.API_TOKEN || process.env.BEARER_TOKEN || '';
const API_KEY    = process.env.API_KEY || '';
const AUTH_HEADERS: Record<string, string> = {
  ...(AUTH_TOKEN ? { Authorization: \`Bearer \${AUTH_TOKEN}\` } : {}),
  ...(API_KEY    ? { 'x-api-key': API_KEY }                    : {}),
};

test.describe('API tests: ${flowName}', () => {
  test.describe.configure({ retries: 2 }); // Risk 6: reintentar ante 5xx (CLAUDE.md #4)

`;

  // ── Tests REST ─────────────────────────────────────────────────────────────
  for (const api of restApis) {
    // Risk 2: null guard para api.method
    const methodRaw = (api.method ?? 'GET').toString().toLowerCase();

    // Risk 3 & 4: método no estándar → request.fetch; mutaciones → body + Content-Type
    const isPlaywrightDirect = PLAYWRIGHT_DIRECT_METHODS.has(methodRaw);
    const isMutation         = ['post', 'put', 'patch'].includes(methodRaw);
    let requestCall: string;
    if (!isPlaywrightDirect) {
      requestCall = `request.fetch(\`${api.url}\`, { method: '${methodRaw.toUpperCase()}', headers: AUTH_HEADERS })`;
    } else if (isMutation) {
      // Risk 4: body vacío con Content-Type evita 400 por falta de payload
      requestCall = `request.${methodRaw}(\`${api.url}\`, {\n      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },\n      data: {},\n    })`;
    } else {
      requestCall = `request.${methodRaw}(\`${api.url}\`, { headers: AUTH_HEADERS })`;
    }

    tests += `  test('${methodRaw.toUpperCase()} ${api.url}', async ({ request }) => {
    const response = await ${requestCall};
    const status   = response.status();

    // Risk 5: informar si el endpoint requiere autenticación
    if (status === 401 || status === 403) {
      console.warn(\`⚠️ Auth requerida para ${methodRaw.toUpperCase()} ${api.url} — configura API_TOKEN o API_KEY\`);
    }

    // Risk 9: 404 = endpoint eliminado — debe fallar para detectar regresiones
    expect(status, '${methodRaw.toUpperCase()} ${api.url} no debe ser 404 (endpoint eliminado)').not.toBe(404);
    expect(status, '${methodRaw.toUpperCase()} ${api.url} no debe retornar error de servidor').toBeLessThan(500);
  });

`;
  }

  // ── Tests GraphQL (Risk 8) ─────────────────────────────────────────────────
  for (const api of graphqlApis) {
    tests += `  test('GraphQL ${api.url}', async ({ request }) => {
    // Risk 8: GraphQL siempre usa POST con body JSON; query de introspección mínima
    const response = await request.post(\`${api.url}\`, {
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      data: JSON.stringify({ query: '{ __typename }' }),
    });
    const status = response.status();

    if (status === 401 || status === 403) {
      console.warn(\`⚠️ Auth requerida para GraphQL ${api.url} — configura API_TOKEN o API_KEY\`);
    }

    expect(status, 'GraphQL debe responder con 200').toBe(200);

    const body = await response.json().catch(() => null);
    expect(body, 'Respuesta GraphQL debe contener campo data o errors').toBeTruthy();
    // Una respuesta GraphQL válida tiene { data: ... } o { errors: [...] }
    const hasDataOrErrors = body && ('data' in body || 'errors' in body);
    expect(hasDataOrErrors, 'Respuesta GraphQL debe tener estructura { data } o { errors }').toBeTruthy();
  });

`;
  }

  tests += `});\n`;

  const filePath = path.join(testDir, `${flowName}-api.spec.ts`);
  fs.writeFileSync(filePath, tests);
  console.log(`✅ API tests generados: ${filePath} (${restApis.length} REST + ${graphqlApis.length} GraphQL)`);
}

