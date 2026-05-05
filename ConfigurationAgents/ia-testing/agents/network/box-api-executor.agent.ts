/**
 * box-api-executor.agent.ts
 *
 * Escanea BoxAPIsExecute/ (REST, SOAP y subcarpetas futuras),
 * analiza cada servicio y genera specs Playwright en GenerateTest/tests/<Suite>/api/.
 *
 * Formato de archivos fuente (.spec.ts en BoxAPIsExecute):
 *   Línea 1 : URL / endpoint
 *   Línea 2 : (vacía, opcional)
 *   Línea 3+: body (JSON o XML)
 *   Si hay SoapAction: comentario // SOAPAction: <valor>
 */

import fs from 'fs';
import path from 'path';
// Risk 3: usar singleton compartido en lugar de instanciar OpenAI directamente
import type OpenAI from 'openai';
import { openai as sharedOpenai, hasOpenAI } from '../../utils/openai-client';
import { ensureDir } from '../../utils/fs-utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ServiceType = 'REST' | 'SOAP' | 'GraphQL' | 'gRPC' | 'UNKNOWN';
export type HttpMethod  = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface BoxApiSpec {
  filePath:    string;
  fileName:    string;
  serviceType: ServiceType;
  method:      HttpMethod;
  url:         string;
  body:        string | null;
  soapAction:  string | null;
  suiteName:   string | null;
  headers?:    Record<string, string>; // Risk 7: headers extraídos de curl -H
}

// ─── Detección de tipo / método ───────────────────────────────────────────────

function detectServiceType(folderPath: string, body: string | null): ServiceType {
  const upper = folderPath.toUpperCase();
  if (upper.includes(`${path.sep}SOAP${path.sep}`) || upper.includes('/SOAP/')) return 'SOAP';
  if (upper.includes(`${path.sep}GRAPHQL${path.sep}`) || upper.includes('/GRAPHQL/')) return 'GraphQL';
  if (upper.includes(`${path.sep}GRPC${path.sep}`) || upper.includes('/GRPC/')) return 'gRPC';
  // Risk 1 (ya corregido): OR dentro de paréntesis para que la guarda startsWith aplique a ambos
  if (body && body.trim().startsWith('<') && (body.includes('soapenv:') || body.includes('soap:'))) return 'SOAP';
  return 'REST';
}

function detectMethod(folderName: string, fileName: string): HttpMethod {
  const upper = (folderName + '_' + fileName).toUpperCase();
  if (upper.includes('DELETE'))  return 'DELETE';
  if (upper.includes('PATCH'))   return 'PATCH';
  if (upper.includes('PUT'))     return 'PUT';
  if (upper.includes('POST'))    return 'POST';
  if (upper.includes('HEAD'))    return 'HEAD';
  if (upper.includes('OPTIONS')) return 'OPTIONS';
  return 'GET';
}

function extractSoapAction(content: string, xmlBody: string): string | null {
  const commentMatch = content.match(/\/\/\s*SOAPAction[:\s]+(.+)/i);
  if (commentMatch) return commentMatch[1].trim();

  const nsPrefixMatch = xmlBody.match(/<[a-zA-Z]+:Body[^>]*>[\s\S]*?<([a-zA-Z]+):([A-Za-z0-9_]+)/);
  if (nsPrefixMatch) {
    const prefix    = nsPrefixMatch[1];
    const operation = nsPrefixMatch[2];
    const nsForPrefix = xmlBody.match(new RegExp(`xmlns:${prefix}="([^"]+)"`));
    if (nsForPrefix) {
      const ns = nsForPrefix[1].replace(/\/$/, '');
      if (!ns.includes('xmlsoap.org') && !ns.includes('w3.org')) return `${ns}/${operation}`;
    }
    return operation;
  }

  const bareOpMatch = xmlBody.match(/<[a-zA-Z]+:Body[^>]*>[\s\S]*?<([A-Za-z0-9_]+)\s+xmlns="([^"]+)"/);
  if (bareOpMatch) {
    const operation = bareOpMatch[1];
    const ns = bareOpMatch[2].replace(/\/$/, '');
    return `${ns}/${operation}`;
  }
  return null;
}

// ─── Curl parser ──────────────────────────────────────────────────────────────

function extractCurlBody(raw: string): string | null {
  const dMatch = raw.match(/(?:^|\s)(?:-d|--data(?:-raw)?)[ \t]+/m);
  if (!dMatch || dMatch.index === undefined) return null;
  const start = dMatch.index + dMatch[0].length;
  const rest  = raw.slice(start);
  if (!rest) return null;
  const q = rest[0];
  if (q !== "'" && q !== '"') return rest.match(/^([^\r\n]+)/)?.[1]?.trim() ?? null;
  for (let i = 1; i < rest.length; i++) {
    if (rest[i] === q) return rest.slice(1, i).trim();
  }
  return null;
}

/**
 * Risk 7: extrae headers del flag -H 'Name: Value' en comandos curl.
 */
function extractCurlHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const re = /-H\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const idx = m[1].indexOf(': ');
    if (idx !== -1) {
      const key = m[1].slice(0, idx).trim().toLowerCase();
      headers[key] = m[1].slice(idx + 2).trim();
    }
  }
  return headers;
}

function parseCurlCommand(filePath: string, raw: string): BoxApiSpec | null {
  const methodMatch = raw.match(/-X\s+['"]?(\w+)['"]?/i);
  const method: HttpMethod = methodMatch
    ? (methodMatch[1].toUpperCase() as HttpMethod)
    : detectMethod(path.basename(path.dirname(filePath)), path.basename(filePath));

  let url = '';
  const quotedUrl = raw.match(/['"`](https?:\/\/[^'"`\s\\]+(?:\?[^'"`\s\\]*)?)[`'"]/);
  if (quotedUrl) {
    url = quotedUrl[1];
  } else {
    const bareUrl = raw.match(/(https?:\/\/\S+)/);
    if (bareUrl) url = bareUrl[1].replace(/[\\,;'"]+$/, '');
  }

  if (!url) { console.warn(`⚠️ No se encontró URL en comando curl: ${filePath}`); return null; }

  const body       = extractCurlBody(raw);
  const headers    = extractCurlHeaders(raw); // Risk 7
  const svcType    = detectServiceType(filePath, body);
  const soapAction = svcType === 'SOAP' && body ? extractSoapAction(raw, body) : null;

  return { filePath, fileName: path.basename(filePath), serviceType: svcType, method, url, body, soapAction, suiteName: null, headers };
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseBoxApiFile(filePath: string): BoxApiSpec | null {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) { console.warn(`⚠️ Archivo vacío, se omite: ${filePath}`); return null; }

  if (/^curl\b/i.test(raw)) {
    console.log(`🔧 Formato curl detectado en: ${path.basename(filePath)}`);
    return parseCurlCommand(filePath, raw);
  }

  const lines = raw.split(/\r?\n/);
  const url   = lines[0].trim();
  if (!url || !url.startsWith('http')) { console.warn(`⚠️ Sin URL válida en línea 1 de: ${filePath}`); return null; }

  const bodyLines  = lines.slice(2).join('\n').trim();
  const body       = bodyLines || null;
  const dir        = path.dirname(filePath);
  const method     = detectMethod(path.basename(dir), path.basename(filePath));
  const svcType    = detectServiceType(filePath, body);
  const soapAction = svcType === 'SOAP' && body ? extractSoapAction(raw, body) : null;

  return { filePath, fileName: path.basename(filePath), serviceType: svcType, method, url, body, soapAction, suiteName: null };
}

// ─── Matching de suite ────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.replace(/\.spec\.(ts|js)$/, '').replace(/[-\s]+/g, '_').toLowerCase();
}

function extractSuitePrefix(fileName: string): string {
  const noExt = fileName.replace(/\.spec\.(ts|js)$/, '');
  const match = noExt.match(/^(.+?)_(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|SOAP)(?:_|$)/i);
  if (match) return match[1];
  const parts = noExt.split('_');
  if (parts.length > 2) {
    // Risk 6: excluir tanto keywords ES como EN genéricos
    if (/^(?:servicio|operacion|metodo|service|operation|method)$/i.test(parts[0])) return '';
    parts.pop();
    return parts.join('_');
  }
  return '';
}

function prefixSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  let i = 0;
  while (i < na.length && i < nb.length && na[i] === nb[i]) i++;
  return i / Math.max(na.length, nb.length, 1);
}

function findMatchingSuite(fileName: string, suites: string[], threshold = 0.70): string | null {
  const prefix = extractSuitePrefix(fileName);
  if (!prefix) return null;
  const normalizedPrefix = normalizeName(prefix);
  const sorted = [...suites].sort((a, b) => b.length - a.length);
  for (const suite of sorted) {
    const ns = normalizeName(suite);
    if (normalizedPrefix === ns || normalizedPrefix.startsWith(ns + '_')) return suite;
  }
  let best: { suite: string; score: number } | null = null;
  for (const suite of sorted) {
    const score = prefixSimilarity(prefix, suite);
    if (score >= threshold && (!best || score > best.score)) best = { suite, score };
  }
  return best?.suite ?? null;
}

// Risk 3: usa sharedOpenai en lugar de recibir instancia como parámetro
async function findMatchingSuiteWithAI(spec: BoxApiSpec, suites: string[]): Promise<string | null> {
  if (!hasOpenAI || !sharedOpenai) return null;
  try {
    const prompt = `Eres un asistente que mapea archivos de tests de API a suites de Playwright.

Archivo: "${spec.fileName}"
URL: "${spec.url}"
Tipo: ${spec.serviceType}
Método: ${spec.method}
Suites disponibles: ${JSON.stringify(suites)}

Responde ÚNICAMENTE con el nombre exacto de la suite del array, o null si ninguna coincide.`;

    const response = await sharedOpenai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 80,
    });

    const answer = response.choices[0]?.message?.content?.trim() ?? '';
    if (!answer || answer === 'null') return null;
    const matched = suites.find(s => s === answer || normalizeName(s) === normalizeName(answer));
    if (matched) { console.log(`🤖 IA → suite: "${matched}" para "${spec.fileName}"`); return matched; }
    return null;
  } catch (err) {
    console.error('⚠️ Error IA suite matching:', err);
    return null;
  }
}

// ─── Generación de spec Playwright ───────────────────────────────────────────

const IMPORT_PATH = `'../../../../ConfigurationTest/tests/utils/api-helper'`;

function buildRestSpec(spec: BoxApiSpec): string {
  const urlPath  = spec.url.replace(/https?:\/\/[^/]+/, '') || '/';
  const isJson   = spec.body && !spec.body.trim().startsWith('<');
  let bodyJson: object | null = null;
  if (isJson && spec.body) { try { bodyJson = JSON.parse(spec.body); } catch {} }

  const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && spec.body;
  const bodyDecl = hasBody
    ? `const requestBody = ${bodyJson ? JSON.stringify(bodyJson, null, 2) : JSON.stringify(spec.body)};\n\n`
    : '';

  // Risk 7: incluir headers extraídos del curl si existen
  const curlHeaders   = spec.headers ?? {};
  const authHeaderStr = curlHeaders['authorization'] ? `, 'Authorization': '${curlHeaders['authorization']}'` : '';
  const successHeaders = `accept: 'application/json'${hasBody ? `, 'Content-Type': 'application/json'` : ''}${authHeaderStr}`;
  const successOpts   = hasBody
    ? `{\n      headers: { ${successHeaders} },\n      data: requestBody\n    }`
    : `{\n      headers: { ${successHeaders} }\n    }`;

  const descName    = spec.fileName.replace(/\.spec\.ts$/, '');
  const dataErrUrl  = hasBody ? `'${spec.url}'` : `baseUrl + '/id-invalido-test-99999'`;
  const dataErrBody = hasBody
    ? `{\n      headers: { accept: 'application/json', 'Content-Type': 'application/json'${authHeaderStr} },\n      data: null\n    }`
    : `{\n      headers: { accept: 'application/json'${authHeaderStr} }\n    }`;
  const baseUrlDecl = !hasBody ? `    const baseUrl = '${spec.url}'.replace(/\\/+$/, '');\n` : '';

  return `import { test, expect } from '@playwright/test';
import { restRequest } from ${IMPORT_PATH};

${bodyDecl}test.describe('${descName}', () => {

  test('${spec.method} ${urlPath} - Éxito', async ({ request }) => {
    const response = await restRequest(request, '${spec.method}', '${spec.url}', ${successOpts});
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    ${spec.method !== 'DELETE' ? `const body = await response.json();\n    expect(body).toBeDefined();` : ''}
  });

  test('${spec.method} ${urlPath} - Error técnico (servicio no disponible)', async ({ request }) => {
    let errorDetected = false;
    try {
      const res = await restRequest(request, '${spec.method}', 'https://error-tecnico.nonexistent.invalid/', {
        headers: { accept: 'application/json' }
      });
      errorDetected = res.status() >= 500;
    } catch {
      errorDetected = true;
    }
    expect(errorDetected, 'Se esperaba fallo de red o error 5xx').toBe(true);
  });

  test('${spec.method} ${urlPath} - Error de datos (solicitud inválida)', async ({ request }) => {
${baseUrlDecl}    const response = await restRequest(request, '${spec.method}', ${dataErrUrl}, ${dataErrBody});
    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });

});
`;
}

function buildSoapSpec(spec: BoxApiSpec): string {
  const xmlBody    = spec.body ?? '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body/></soap:Envelope>';
  const soapAction = spec.soapAction ?? '';
  const bodyContentMatch = xmlBody.match(/<(?:[a-zA-Z]+:)?Body[^>]*>[\s\S]*?<(?:[a-zA-Z]+:)?([A-Za-z0-9_]+)/);
  const opName     = bodyContentMatch?.[1] ?? 'Operation';
  const soapActionArg = soapAction ? `, '${soapAction}'` : '';
  const descName   = spec.fileName.replace(/\.spec\.ts$/, '');
  const malformedXml = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><InvalidRequest/></soap:Body></soap:Envelope>';

  return `import { test, expect } from '@playwright/test';
import { soapRequest } from ${IMPORT_PATH};

const xmlBody = \`${xmlBody}\`;
const malformedXml = \`${malformedXml}\`;

test.describe('${descName}', () => {

  test('SOAP ${opName} - Éxito', async ({ request }) => {
    const response = await soapRequest(request, '${spec.url}', xmlBody${soapActionArg});
    expect(response.status()).toBe(200);
    const text = await response.text();
    // Risk 8: WSDL puede usar ${opName} o ${opName}Response como tag de respuesta
    expect(
      text.includes('${opName}'),
      'Respuesta debe contener tag ${opName} o ${opName}Response'
    ).toBe(true);
  });

  test('SOAP ${opName} - Error técnico (endpoint no disponible)', async ({ request }) => {
    let errorDetected = false;
    try {
      const res = await soapRequest(request, 'https://error-tecnico.nonexistent.invalid/', xmlBody${soapActionArg});
      errorDetected = res.status() >= 500;
    } catch {
      errorDetected = true;
    }
    expect(errorDetected, 'Se esperaba fallo de red o error 5xx').toBe(true);
  });

  test('SOAP ${opName} - Error de datos (body SOAP malformado)', async ({ request }) => {
    const response = await soapRequest(request, '${spec.url}', malformedXml${soapActionArg});
    expect([400, 500]).toContain(response.status());
  });

});
`;
}

// Risk 3: buildSpecWithAI usa sharedOpenai en lugar de parámetro OpenAI
async function buildSpecWithAI(spec: BoxApiSpec): Promise<string> {
  if (!hasOpenAI || !sharedOpenai) {
    return spec.serviceType === 'SOAP' ? buildSoapSpec(spec) : buildRestSpec(spec);
  }

  const restSignature = `restRequest(request, method, url, options?)`;
  const soapSignature = `soapRequest(request, url, xmlBody, soapAction?)`;

  const prompt = `Eres un experto en pruebas de APIs con Playwright. Genera un archivo TypeScript (.spec.ts) completo y válido.

FIRMAS EXACTAS (no cambiar):
- REST: ${restSignature}
- SOAP: ${soapSignature}

IMPORTS REQUERIDOS:
import { test, expect } from '@playwright/test';
import { restRequest${spec.serviceType === 'SOAP' ? ', soapRequest' : ''} } from ${IMPORT_PATH};

Datos del servicio:
- Tipo: ${spec.serviceType}
- Método HTTP: ${spec.method}
- URL/Endpoint: ${spec.url}
${spec.body ? `- Body:\n${spec.body}` : '- Sin body'}
${spec.soapAction ? `- SOAPAction: ${spec.soapAction}` : ''}

Requisitos:
1. Primer parámetro de restRequest/soapRequest SIEMPRE es 'request'.
2. Incluir EXACTAMENTE 3 tests dentro de un test.describe:
   a) Éxito (2xx) — llamada normal al endpoint real.
   b) Error técnico — URL 'https://error-tecnico.nonexistent.invalid/' + try/catch.
   c) Error de datos (4xx) — data:null o URL+'/id-invalido-test-99999'.
3. NO incluir explicaciones — solo código TypeScript.`;

  try {
    const response = await sharedOpenai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 800,
    });

    const content  = response.choices[0]?.message?.content?.trim() ?? '';
    const codeMatch = content.match(/```(?:typescript|ts)?\n?([\s\S]+?)```/);
    const code     = codeMatch ? codeMatch[1].trim() : content;

    const fixed = code.replace(
      /import\s*\{[^}]*\}\s*from\s*['"][^'"]*api-helper[^'"]*['"]\s*;?/g,
      `import { restRequest, soapRequest } from ${IMPORT_PATH};`
    );

    const hasCorrectRestSig = !fixed.includes('restRequest(') || /restRequest\(\s*request\s*,/.test(fixed);
    const hasCorrectSoapSig = !fixed.includes('soapRequest(') || /soapRequest\(\s*request\s*,/.test(fixed);
    const hasTestAndExpect  = fixed.includes('test(') && fixed.includes('expect(');

    // Risk 5: verificar que la IA generó exactamente 3 tests
    const testCount = (fixed.match(/\btest\s*\(/g) || []).length;
    if (testCount < 3) {
      console.warn(`⚠️ IA generó ${testCount}/3 tests esperados para ${spec.fileName} — usando fallback local`);
      return spec.serviceType === 'SOAP' ? buildSoapSpec(spec) : buildRestSpec(spec);
    }

    if (hasTestAndExpect && hasCorrectRestSig && hasCorrectSoapSig) return fixed;
    console.warn('⚠️ Respuesta de IA con firma incorrecta, usando fallback local');
  } catch (err) {
    console.error('⚠️ Error generando spec con IA:', err);
  }

  return spec.serviceType === 'SOAP' ? buildSoapSpec(spec) : buildRestSpec(spec);
}

// ─── Feature BDD ──────────────────────────────────────────────────────────────

function buildApiFeature(spec: BoxApiSpec, baseName: string): string {
  const displayName = baseName.replace(/_/g, ' ');
  const isSOAP      = spec.serviceType === 'SOAP';

  const givenStep = isSOAP
    ? `el servicio SOAP "${spec.url}" con acción "${spec.soapAction ?? ''}" está configurado para pruebas API`
    : `el servicio REST "${spec.method}" "${spec.url}" está configurado para pruebas API`;

  return `# GENERADO AUTOMÁTICAMENTE por BoxAPIsExecute — no editar manualmente
# Endpoint : ${spec.url}
# Tipo     : ${spec.serviceType} | Método: ${spec.method}
Feature: API ${spec.serviceType} ${spec.method} - ${displayName}

  Background:
    Given ${givenStep}

  Scenario: ${displayName} - Petición exitosa
    When ejecuto la petición API configurada
    Then la respuesta debe tener un estado de éxito 2xx

  Scenario: ${displayName} - Error técnico del servidor
    When ejecuto la petición API a un endpoint con error técnico
    Then la respuesta debe indicar un fallo técnico de red o 5xx

  Scenario: ${displayName} - Error por datos inválidos
    When ejecuto la petición API con datos inválidos
    Then la respuesta debe indicar error de validación de datos 4xx
`;
}

/**
 * Risk 9: recibe specs para embeber los body SOAP reales en un lookup table.
 * Así el Given BDD usa el XML real del archivo fuente, no uno genérico.
 */
function buildApiGeneratedSteps(specs: BoxApiSpec[]): string {
  // Lookup url → body SOAP real (escapado para template literal)
  const soapEntries = specs
    .filter(s => s.serviceType === 'SOAP' && s.body)
    .map(s => {
      const safe = (s.body ?? '').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      return `  '${s.url}': \`${safe}\`,`;
    })
    .join('\n');

  const soapBodiesBlock = soapEntries
    ? `\nconst SOAP_BODIES: Record<string, string> = {\n${soapEntries}\n};\n`
    : `\nconst SOAP_BODIES: Record<string, string> = {};\n`;

  return `// GENERADO AUTOMÁTICAMENTE por BoxAPIsExecute — no editar manualmente
// Para customizar, agrega el comentario "// CUSTOMIZADO" en la primera línea
// y este archivo no será sobreescrito en el próximo npm run generate.
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../ConfigurationTest/tests/utils/api-helper';

const { Given, When, Then, Before } = createBdd();
${soapBodiesBlock}
// ─── Estado por escenario ────────────────────────────────────────────────────
const _ctx: {
  type: 'REST' | 'SOAP';
  method: string;
  url: string;
  body: string | null;
  soapAction: string | null;
  status: number;
  hasNetworkError: boolean;
} = { type: 'REST', method: 'GET', url: '', body: null, soapAction: null, status: 0, hasNetworkError: false };

// Risk 4 (ya corregido): Before resetea TODOS los campos
Before(async () => {
  _ctx.type            = 'REST';
  _ctx.method          = 'GET';
  _ctx.url             = '';
  _ctx.body            = null;
  _ctx.soapAction      = null;
  _ctx.status          = 0;
  _ctx.hasNetworkError = false;
});

// ─── Given ────────────────────────────────────────────────────────────────────
Given('el servicio REST {string} {string} está configurado para pruebas API',
  async ({}, method: string, url: string) => {
    _ctx.type   = 'REST';
    _ctx.method = method;
    _ctx.url    = url;
  });

Given('el servicio SOAP {string} con acción {string} está configurado para pruebas API',
  async ({}, url: string, soapAction: string) => {
    _ctx.type       = 'SOAP';
    _ctx.url        = url;
    _ctx.soapAction = soapAction;
    // Risk 9: usar body real del archivo fuente si está disponible
    _ctx.body = SOAP_BODIES[url]
      ?? '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body/></soap:Envelope>';
  });

// ─── When ─────────────────────────────────────────────────────────────────────
When('ejecuto la petición API configurada', async ({ request }) => {
  if (_ctx.type === 'SOAP') {
    const res = await soapRequest(request, _ctx.url, _ctx.body ?? '', _ctx.soapAction ?? undefined);
    _ctx.status = res.status();
  } else {
    const opts: Record<string, unknown> = { headers: { accept: 'application/json' } };
    if (_ctx.body) (opts as any).data = _ctx.body;
    const res = await restRequest(request, _ctx.method as any, _ctx.url, opts as any);
    _ctx.status = res.status();
  }
});

When('ejecuto la petición API a un endpoint con error técnico', async ({ request }) => {
  _ctx.hasNetworkError = false;
  try {
    const res = await restRequest(request, _ctx.method as any,
      'https://error-tecnico.nonexistent.invalid/',
      { headers: { accept: 'application/json' } } as any);
    _ctx.status          = res.status();
    _ctx.hasNetworkError = _ctx.status >= 500;
  } catch {
    _ctx.hasNetworkError = true;
    _ctx.status          = 503;
  }
});

When('ejecuto la petición API con datos inválidos', async ({ request }) => {
  if (_ctx.type === 'SOAP') {
    const malformed = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><InvalidRequest/></soap:Body></soap:Envelope>';
    const res = await soapRequest(request, _ctx.url, malformed, _ctx.soapAction ?? undefined);
    _ctx.status = res.status();
  } else {
    const badUrl = _ctx.url.replace(/\\/+$/, '') + '/id-invalido-test-99999';
    const res = await restRequest(request, _ctx.method as any, badUrl,
      { headers: { accept: 'application/json' } } as any);
    _ctx.status = res.status();
  }
});

// ─── Then ─────────────────────────────────────────────────────────────────────
Then('la respuesta debe tener un estado de éxito 2xx', async () => {
  expect(_ctx.status, \`Estado recibido: \${_ctx.status}\`).toBeGreaterThanOrEqual(200);
  expect(_ctx.status, \`Estado recibido: \${_ctx.status}\`).toBeLessThan(300);
});

Then('la respuesta debe indicar un fallo técnico de red o 5xx', async () => {
  expect(
    _ctx.hasNetworkError || _ctx.status >= 500,
    \`Se esperaba error de red o 5xx, recibido: \${_ctx.status}\`
  ).toBe(true);
});

Then('la respuesta debe indicar error de validación de datos 4xx', async () => {
  expect(
    _ctx.status >= 400,
    \`Se esperaba 4xx o superior, recibido: \${_ctx.status}\`
  ).toBe(true);
});
`;
}

// ─── Punto de entrada principal ───────────────────────────────────────────────

export async function processBoxAPIsExecute(
  suiteNames: string[],
  testsOutputDir: string,
  _openaiKey?: string  // Risk 3: ignorado — se usa el singleton de openai-client.ts
): Promise<void> {
  const projectRoot = process.cwd();
  const boxRoot     = path.join(projectRoot, 'BoxAPIsExecute');
  const featuresDir = path.join(projectRoot, 'GenerateTest', 'features');
  const stepsDir    = path.join(projectRoot, 'GenerateTest', 'steps');

  if (!fs.existsSync(boxRoot)) {
    console.log('ℹ️ BoxAPIsExecute/ no encontrado — se omite procesamiento');
    return;
  }

  // Risk 3: usar singleton compartido
  const hasAI = hasOpenAI && !!sharedOpenai;
  console.log(hasAI
    ? '🤖 OpenAI disponible — generación asistida por IA activada'
    : '⚙️  Sin OPENAI_API_KEY — generando con lógica local');

  // Recopilar todos los .spec.ts en BoxAPIsExecute (recursivo)
  const specFiles: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.spec.ts')) specFiles.push(full);
    }
  }
  walk(boxRoot);

  if (!specFiles.length) { console.log('ℹ️ No se encontraron .spec.ts en BoxAPIsExecute/'); return; }
  console.log(`\n📦 BoxAPIsExecute: ${specFiles.length} archivo(s)\n`);

  const SOLO_API_DIR = 'Solo_test_API';
  const collectedSpecs: BoxApiSpec[] = []; // Risk 9: acumular para SOAP_BODIES

  for (const filePath of specFiles) {
    console.log(`\n🔍 Procesando: ${path.relative(projectRoot, filePath)}`);

    const spec = parseBoxApiFile(filePath);
    if (!spec) continue;

    // Matching de suite
    let suite = findMatchingSuite(spec.fileName, suiteNames);
    if (!suite && hasAI) suite = await findMatchingSuiteWithAI(spec, suiteNames);

    const targetSuite = suite ?? SOLO_API_DIR;
    spec.suiteName = targetSuite;
    console.log(suite ? `✅ Suite detectada: "${suite}"` : `📁 Sin suite → "${SOLO_API_DIR}"`);

    // Generar spec content
    let specContent: string;
    if (hasAI) {
      console.log(`🤖 Generando trama con OpenAI para ${spec.fileName}...`);
      specContent = await buildSpecWithAI(spec);
    } else {
      specContent = spec.serviceType === 'SOAP' ? buildSoapSpec(spec) : buildRestSpec(spec);
    }

    // Risk 10: nombre sin sufijo _generated
    const baseName    = spec.fileName.replace(/\.spec\.ts$/, '');
    const methodTag   = baseName.toUpperCase().includes(spec.method)      ? '' : `_${spec.method}`;
    const typeTag     = baseName.toUpperCase().includes(spec.serviceType)  ? '' : `_${spec.serviceType}`;
    const outFileName = `${baseName}${typeTag}${methodTag}.spec.ts`;

    const targetDir = path.join(testsOutputDir, targetSuite, 'api');
    ensureDir(targetDir);
    fs.writeFileSync(path.join(targetDir, outFileName), specContent, 'utf-8');
    console.log(`✅ Spec generada: ${path.relative(projectRoot, path.join(targetDir, outFileName))}`);

    // Feature BDD
    ensureDir(featuresDir);
    const featurePath = path.join(featuresDir, `${baseName}_api.feature`);
    fs.writeFileSync(featurePath, buildApiFeature(spec, baseName), 'utf-8');
    console.log(`📄 Feature generado: ${path.relative(projectRoot, featurePath)}`);

    collectedSpecs.push(spec); // Risk 9: acumular
  }

  // Risk 2: no sobreescribir api-generated.steps.ts si tiene contenido customizado
  ensureDir(stepsDir);
  const stepsPath = path.join(stepsDir, 'api-generated.steps.ts');
  if (fs.existsSync(stepsPath)) {
    const existing = fs.readFileSync(stepsPath, 'utf-8');
    if (existing.includes('// CUSTOMIZADO')) {
      console.log('⚠️ api-generated.steps.ts tiene contenido customizado — omitiendo regeneración');
    } else {
      // Risk 9: pasar specs para embeber SOAP bodies reales
      fs.writeFileSync(stepsPath, buildApiGeneratedSteps(collectedSpecs), 'utf-8');
      console.log(`📄 Steps API regenerados: ${path.relative(projectRoot, stepsPath)}`);
    }
  } else {
    fs.writeFileSync(stepsPath, buildApiGeneratedSteps(collectedSpecs), 'utf-8');
    console.log(`📄 Steps API generados: ${path.relative(projectRoot, stepsPath)}`);
  }

  console.log('\n🎉 BoxAPIsExecute procesado correctamente');
}
