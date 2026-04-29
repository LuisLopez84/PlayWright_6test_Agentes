/**
 * box-api-executor.agent.ts
 *
 * Escanea BoxAPIsExecute/ (REST, SOAP y cualquier subcarpeta futura),
 * usa OpenAI para analizar cada servicio y genera specs Playwright válidas
 * en GenerateTest/tests/<Suite>/api/ o GenerateTest/tests/Solo_test_API/api/.
 *
 * Formato de los archivos fuente (.spec.ts en BoxAPIsExecute):
 *   Línea 1 : URL / endpoint
 *   Línea 2 : (vacía, opcional)
 *   Línea 3+: body (JSON o XML)
 *   Si hay SoapAction se puede indicar en un comentario // SOAPAction: <valor>
 */

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { ensureDir } from '../../utils/fs-utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ServiceType = 'REST' | 'SOAP' | 'GraphQL' | 'gRPC' | 'UNKNOWN';
export type HttpMethod  = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface BoxApiSpec {
  filePath: string;
  fileName: string;
  serviceType: ServiceType;
  method: HttpMethod;
  url: string;
  body: string | null;
  soapAction: string | null;
  suiteName: string | null;  // null → Solo_test_API
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function detectServiceType(folderPath: string, body: string | null): ServiceType {
  const upper = folderPath.toUpperCase();
  if (upper.includes(`${path.sep}SOAP${path.sep}`) || upper.includes('/SOAP/')) return 'SOAP';
  if (upper.includes(`${path.sep}GRAPHQL${path.sep}`) || upper.includes('/GRAPHQL/')) return 'GraphQL';
  if (upper.includes(`${path.sep}GRPC${path.sep}`) || upper.includes('/GRPC/')) return 'gRPC';
  if (body && body.trim().startsWith('<') && body.includes('soapenv:') || body?.includes('soap:')) return 'SOAP';
  return 'REST';
}

function detectMethod(folderName: string, fileName: string): HttpMethod {
  const upper = (folderName + '_' + fileName).toUpperCase();
  if (upper.includes('DELETE')) return 'DELETE';
  if (upper.includes('PATCH'))  return 'PATCH';
  if (upper.includes('PUT'))    return 'PUT';
  if (upper.includes('POST'))   return 'POST';
  if (upper.includes('HEAD'))   return 'HEAD';
  if (upper.includes('OPTIONS')) return 'OPTIONS';
  return 'GET';
}

function extractSoapAction(content: string, xmlBody: string): string | null {
  // Prioridad 1: comentario explícito // SOAPAction: <valor>
  const commentMatch = content.match(/\/\/\s*SOAPAction[:\s]+(.+)/i);
  if (commentMatch) return commentMatch[1].trim();

  // Prioridad 2: namespace específico del servicio (no el estándar soap/wsdl)
  // Busca xmlns:prefix="<ns>" donde el prefix se usa en la operación Body
  const nsPrefixMatch = xmlBody.match(/<[a-zA-Z]+:Body[^>]*>[\s\S]*?<([a-zA-Z]+):([A-Za-z0-9_]+)/);
  if (nsPrefixMatch) {
    const prefix = nsPrefixMatch[1];
    const operation = nsPrefixMatch[2];
    const nsForPrefix = xmlBody.match(new RegExp(`xmlns:${prefix}="([^"]+)"`));
    if (nsForPrefix) {
      const ns = nsForPrefix[1].replace(/\/$/, '');
      // Ignorar namespaces estándar soap/wsdl
      if (!ns.includes('xmlsoap.org') && !ns.includes('w3.org')) {
        return `${ns}/${operation}`;
      }
    }
    // Si no hay namespace específico o es genérico, retornar solo la operación
    return operation;
  }

  // Prioridad 3: operación dentro de Body sin prefijo
  const bareOpMatch = xmlBody.match(/<[a-zA-Z]+:Body[^>]*>[\s\S]*?<([A-Za-z0-9_]+)\s+xmlns="([^"]+)"/);
  if (bareOpMatch) {
    const operation = bareOpMatch[1];
    const ns = bareOpMatch[2].replace(/\/$/, '');
    return `${ns}/${operation}`;
  }

  return null;
}

// ─── Curl parser ─────────────────────────────────────────────────────────────

/**
 * Extrae el body del flag -d / --data(-raw) de un comando curl.
 * Maneja bodies multi-línea envueltos en comillas simples o dobles.
 */
function extractCurlBody(raw: string): string | null {
  const dMatch = raw.match(/(?:^|\s)(?:-d|--data(?:-raw)?)[ \t]+/m);
  if (!dMatch || dMatch.index === undefined) return null;

  const start = dMatch.index + dMatch[0].length;
  const rest  = raw.slice(start);
  if (!rest) return null;

  const q = rest[0];
  if (q !== "'" && q !== '"') {
    // Sin comillas: tomar hasta fin de línea
    return rest.match(/^([^\r\n]+)/)?.[1]?.trim() ?? null;
  }

  // Buscar la comilla de cierre carácter a carácter.
  // JSON/XML no contienen el mismo tipo de comilla que el shell usa como wrapper.
  for (let i = 1; i < rest.length; i++) {
    if (rest[i] === q) return rest.slice(1, i).trim();
  }
  return null;
}

/**
 * Parsea un archivo cuyo contenido es un comando curl estándar (multi-línea).
 * Extrae método HTTP, URL, body y headers relevantes.
 */
function parseCurlCommand(filePath: string, raw: string): BoxApiSpec | null {
  // Método HTTP: -X 'POST' / -X POST
  const methodMatch = raw.match(/-X\s+['"]?(\w+)['"]?/i);
  let method: HttpMethod = methodMatch
    ? (methodMatch[1].toUpperCase() as HttpMethod)
    : detectMethod(path.basename(path.dirname(filePath)), path.basename(filePath));

  // URL: primer patrón https?://... entre comillas o sin ellas
  let url = '';
  const quotedUrl = raw.match(/['"`](https?:\/\/[^'"`\s\\]+(?:\?[^'"`\s\\]*)?)[`'"]/);
  if (quotedUrl) {
    url = quotedUrl[1];
  } else {
    const bareUrl = raw.match(/(https?:\/\/\S+)/);
    if (bareUrl) url = bareUrl[1].replace(/[\\,;'"]+$/, '');
  }

  if (!url) {
    console.warn(`⚠️  No se encontró URL en comando curl: ${filePath}`);
    return null;
  }

  const body        = extractCurlBody(raw);
  const svcType     = detectServiceType(filePath, body);
  const soapAction  = svcType === 'SOAP' && body ? extractSoapAction(raw, body) : null;

  return {
    filePath,
    fileName: path.basename(filePath),
    serviceType: svcType,
    method,
    url,
    body,
    soapAction,
    suiteName: null,
  };
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseBoxApiFile(filePath: string): BoxApiSpec | null {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) {
    console.warn(`⚠️  Archivo vacío, se omite: ${filePath}`);
    return null;
  }

  // Detectar formato curl (comienza con "curl")
  if (/^curl\b/i.test(raw)) {
    console.log(`🔧 Formato curl detectado en: ${path.basename(filePath)}`);
    return parseCurlCommand(filePath, raw);
  }

  // Formato estándar: línea 1 = URL, línea 2 = vacía, líneas 3+ = body
  const lines = raw.split(/\r?\n/);
  const url = lines[0].trim();
  if (!url || !url.startsWith('http')) {
    console.warn(`⚠️  Sin URL válida en línea 1 de: ${filePath}`);
    return null;
  }

  const bodyLines = lines.slice(2).join('\n').trim();
  const body = bodyLines || null;

  const dir      = path.dirname(filePath);
  const method   = detectMethod(path.basename(dir), path.basename(filePath));
  const svcType  = detectServiceType(filePath, body);
  const soapAction = svcType === 'SOAP' && body ? extractSoapAction(raw, body) : null;

  return {
    filePath,
    fileName: path.basename(filePath),
    serviceType: svcType,
    method,
    url,
    body,
    soapAction,
    suiteName: null,
  };
}

// ─── Matching de suite ────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .replace(/\.spec\.(ts|js)$/, '')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

function extractSuitePrefix(fileName: string): string {
  const noExt = fileName.replace(/\.spec\.(ts|js)$/, '');
  const match = noExt.match(/^(.+?)_(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|SOAP)(?:_|$)/i);
  if (match) return match[1];
  const parts = noExt.split('_');
  if (parts.length > 2) {
    // Si es genérico como "Servicio_Operacion_Metodo" → sin suite
    if (/^servicio|operacion|metodo$/i.test(parts[0])) return '';
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

async function findMatchingSuiteWithAI(
  spec: BoxApiSpec,
  suites: string[],
  openai: OpenAI
): Promise<string | null> {
  try {
    const prompt = `Eres un asistente que mapea archivos de tests de API a suites de Playwright.

Archivo: "${spec.fileName}"
URL: "${spec.url}"
Tipo: ${spec.serviceType}
Método: ${spec.method}
Suites disponibles: ${JSON.stringify(suites)}

Responde ÚNICAMENTE con el nombre exacto de la suite del array, o null si ninguna coincide.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 80,
    });

    const answer = response.choices[0]?.message?.content?.trim() ?? '';
    if (!answer || answer === 'null') return null;

    const matched = suites.find(s => s === answer || normalizeName(s) === normalizeName(answer));
    if (matched) {
      console.log(`🤖 IA → suite: "${matched}" para "${spec.fileName}"`);
      return matched;
    }
    return null;
  } catch (err) {
    console.error('⚠️ Error IA suite matching:', err);
    return null;
  }
}

// ─── Generación de spec Playwright ───────────────────────────────────────────

const IMPORT_PATH = `'../../../../ConfigurationTest/tests/utils/api-helper'`;

function buildRestSpec(spec: BoxApiSpec): string {
  const urlPath = spec.url.replace(/https?:\/\/[^/]+/, '') || '/';
  const isJson = spec.body && !spec.body.trim().startsWith('<');
  let bodyJson: object | null = null;
  if (isJson && spec.body) {
    try { bodyJson = JSON.parse(spec.body); } catch { /* keep raw */ }
  }

  const hasBody  = spec.method !== 'GET' && spec.method !== 'DELETE' && spec.body;
  const bodyDecl = hasBody
    ? `const requestBody = ${bodyJson ? JSON.stringify(bodyJson, null, 2) : JSON.stringify(spec.body)};\n\n`
    : '';

  const successHeaders = `accept: 'application/json'${hasBody ? `, 'Content-Type': 'application/json'` : ''}`;
  const successOpts    = hasBody
    ? `{\n      headers: { ${successHeaders} },\n      data: requestBody\n    }`
    : `{\n      headers: { ${successHeaders} }\n    }`;

  const descName = spec.fileName.replace(/\.spec\.ts$/, '');

  // Error de datos: POST/PUT/PATCH → body nulo; GET/DELETE → ruta con ID inválido
  const dataErrUrl  = hasBody ? `'${spec.url}'` : `baseUrl + '/id-invalido-test-99999'`;
  const dataErrBody = hasBody
    ? `{\n      headers: { accept: 'application/json', 'Content-Type': 'application/json' },\n      data: null\n    }`
    : `{\n      headers: { accept: 'application/json' }\n    }`;
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
  const xmlBody = spec.body ?? '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body/></soap:Envelope>';
  const soapAction = spec.soapAction ?? '';
  const bodyContentMatch = xmlBody.match(/<(?:[a-zA-Z]+:)?Body[^>]*>[\s\S]*?<(?:[a-zA-Z]+:)?([A-Za-z0-9_]+)/);
  const opName = bodyContentMatch?.[1] ?? 'Operation';
  const soapActionArg = soapAction ? `, '${soapAction}'` : '';
  const descName = spec.fileName.replace(/\.spec\.ts$/, '');

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
    expect(text).toContain('${opName}');
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

async function buildSpecWithAI(spec: BoxApiSpec, openai: OpenAI): Promise<string> {
  const restSignature = `restRequest(request: APIRequestContext, method: 'GET'|'POST'|'PUT'|'DELETE'|'PATCH', url: string, options?: { data?: any; headers?: Record<string,string>; params?: Record<string,string> }): Promise<APIResponse>`;
  const soapSignature = `soapRequest(request: APIRequestContext, url: string, xmlBody: string, soapAction?: string): Promise<APIResponse>`;

  const prompt = `Eres un experto en pruebas de APIs con Playwright. Genera un archivo TypeScript (.spec.ts) completo y válido.

FIRMAS EXACTAS DE LAS FUNCIONES (no cambiar):
- REST: ${restSignature}
- SOAP: ${soapSignature}

IMPORTS REQUERIDOS (exactamente así):
import { test, expect } from '@playwright/test';
import { restRequest${spec.serviceType === 'SOAP' ? ', soapRequest' : ''} } from ${IMPORT_PATH};

Datos del servicio:
- Tipo: ${spec.serviceType}
- Método HTTP: ${spec.method}
- URL/Endpoint: ${spec.url}
${spec.body ? `- Body:\n${spec.body}` : '- Sin body'}
${spec.soapAction ? `- SOAPAction: ${spec.soapAction}` : ''}

Ejemplo correcto para REST POST:
  const response = await restRequest(request, 'POST', 'https://api.example.com/users', {
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    data: { name: 'John' }
  });

Ejemplo correcto para SOAP:
  const response = await soapRequest(request, 'http://service.com/api', xmlBody, 'http://ns/Action');

Requisitos:
1. Primer parámetro de restRequest/soapRequest SIEMPRE es 'request' (el fixture de Playwright).
2. Incluir exactamente 3 tests dentro de un test.describe:
   a) Éxito (2xx) — llamada normal al endpoint real.
   b) Error técnico (fallo de red / 5xx) — usar URL 'https://error-tecnico.nonexistent.invalid/' + try/catch, esperar errorDetected=true.
   c) Error de datos (4xx) — para GET/DELETE: URL+'/id-invalido-test-99999'; para POST/PUT/PATCH: data:null, esperar [400,404,405,415,422,500].
3. Para REST con body JSON, incluir aserciones de campos devueltos en el test de éxito.
4. Para SOAP, validar tag XML de respuesta esperado en el test de éxito.
5. NO incluir explicaciones — solo código TypeScript.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? '';
    // Extraer código del bloque markdown si lo envuelve
    const codeMatch = content.match(/```(?:typescript|ts)?\n?([\s\S]+?)```/);
    const code = codeMatch ? codeMatch[1].trim() : content;

    // Asegurar que el import de api-helper sea la ruta correcta
    const fixed = code.replace(
      /import\s*\{[^}]*\}\s*from\s*['"][^'"]*api-helper[^'"]*['"]\s*;?/g,
      `import { restRequest, soapRequest } from ${IMPORT_PATH};`
    );

    // Verificar firma correcta: el primer arg de restRequest/soapRequest debe ser 'request'
    const hasCorrectRestSig   = !fixed.includes('restRequest(') || /restRequest\(\s*request\s*,/.test(fixed);
    const hasCorrectSoapSig   = !fixed.includes('soapRequest(') || /soapRequest\(\s*request\s*,/.test(fixed);
    const hasTestAndExpect    = fixed.includes('test(') && fixed.includes('expect(');

    if (hasTestAndExpect && hasCorrectRestSig && hasCorrectSoapSig) return fixed;
    console.warn('⚠️ Respuesta de IA con firma incorrecta, usando fallback local');
  } catch (err) {
    console.error('⚠️ Error generando spec con IA:', err);
  }

  // Fallback local
  return spec.serviceType === 'SOAP' ? buildSoapSpec(spec) : buildRestSpec(spec);
}

// ─── Generación de Feature BDD ────────────────────────────────────────────────

/**
 * Genera el contenido del archivo .feature para un servicio API dado.
 * Los patrones de steps son fijos para coincidir exactamente con api-generated.steps.ts.
 */
function buildApiFeature(spec: BoxApiSpec, baseName: string): string {
  const displayName  = baseName.replace(/_/g, ' ');
  const isSOAP       = spec.serviceType === 'SOAP';

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
 * Genera el contenido del archivo de steps compartido para todos los features de API.
 * Este archivo se regenera en cada ejecución (es 100% machine-generated).
 */
function buildApiGeneratedSteps(): string {
  return `// GENERADO AUTOMÁTICAMENTE por BoxAPIsExecute — no editar manualmente
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../ConfigurationTest/tests/utils/api-helper';

const { Given, When, Then, Before } = createBdd();

// ─── Estado por escenario ────────────────────────────────────────────────────
// Seguro en ejecución paralela: cada worker de Playwright tiene su propio módulo.
const _ctx: {
  type: 'REST' | 'SOAP';
  method: string;
  url: string;
  body: string | null;
  soapAction: string | null;
  status: number;
  hasNetworkError: boolean;
} = { type: 'REST', method: 'GET', url: '', body: null, soapAction: null, status: 0, hasNetworkError: false };

Before(async () => {
  _ctx.status = 0;
  _ctx.hasNetworkError = false;
});

// ─── Given ────────────────────────────────────────────────────────────────────
Given('el servicio REST {string} {string} está configurado para pruebas API',
  async ({}, method: string, url: string) => {
    _ctx.type = 'REST';
    _ctx.method = method;
    _ctx.url = url;
  });

Given('el servicio SOAP {string} con acción {string} está configurado para pruebas API',
  async ({}, url: string, soapAction: string) => {
    _ctx.type = 'SOAP';
    _ctx.url = url;
    _ctx.soapAction = soapAction;
    _ctx.body = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body/></soap:Envelope>';
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
    _ctx.status = res.status();
    _ctx.hasNetworkError = _ctx.status >= 500;
  } catch {
    _ctx.hasNetworkError = true;
    _ctx.status = 503;
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
  openaiKey?: string
): Promise<void> {
  const projectRoot   = process.cwd();
  const boxRoot       = path.join(projectRoot, 'BoxAPIsExecute');
  const featuresDir   = path.join(projectRoot, 'GenerateTest', 'features');
  const stepsDir      = path.join(projectRoot, 'GenerateTest', 'steps');

  if (!fs.existsSync(boxRoot)) {
    console.log('ℹ️  BoxAPIsExecute/ no encontrado — se omite procesamiento');
    return;
  }

  const openai: OpenAI | null = openaiKey
    ? new OpenAI({ apiKey: openaiKey })
    : null;

  if (openai) {
    console.log('🤖 OpenAI disponible — generación de tramas asistida por IA activada');
  } else {
    console.log('⚙️  Sin OPENAI_API_KEY — generando tramas con lógica local');
  }

  // Recopilar todos los .spec.ts dentro de BoxAPIsExecute (recursivo)
  const specFiles: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
        specFiles.push(full);
      }
    }
  }
  walk(boxRoot);

  if (!specFiles.length) {
    console.log('ℹ️  No se encontraron archivos .spec.ts en BoxAPIsExecute/');
    return;
  }

  console.log(`\n📦 BoxAPIsExecute: ${specFiles.length} archivo(s) encontrado(s)\n`);

  const SOLO_API_DIR = 'Solo_test_API';

  for (const filePath of specFiles) {
    console.log(`\n🔍 Procesando: ${path.relative(projectRoot, filePath)}`);

    const spec = parseBoxApiFile(filePath);
    if (!spec) continue;

    // Matching de suite
    let suite = findMatchingSuite(spec.fileName, suiteNames);
    if (!suite && openai) {
      suite = await findMatchingSuiteWithAI(spec, suiteNames, openai);
    }

    const targetSuite = suite ?? SOLO_API_DIR;
    spec.suiteName = targetSuite;

    if (!suite) {
      console.log(`📁 Sin suite coincidente → generando en "${SOLO_API_DIR}"`);
    } else {
      console.log(`✅ Suite detectada: "${suite}"`);
    }

    // Generar spec content
    let specContent: string;
    if (openai) {
      console.log(`🤖 Generando trama con OpenAI para ${spec.fileName}...`);
      specContent = await buildSpecWithAI(spec, openai);
    } else {
      specContent = spec.serviceType === 'SOAP' ? buildSoapSpec(spec) : buildRestSpec(spec);
    }

    // Determinar nombre del archivo de salida — incluye tipo+método para evitar colisiones
    const baseName = spec.fileName.replace(/\.spec\.ts$/, '');
    // Si el nombre ya contiene el método/tipo evitar duplicarlo
    const methodTag  = baseName.toUpperCase().includes(spec.method)    ? '' : `_${spec.method}`;
    const typeTag    = baseName.toUpperCase().includes(spec.serviceType) ? '' : `_${spec.serviceType}`;
    const outFileName = `${baseName}${typeTag}${methodTag}_generated.spec.ts`;

    const targetDir = path.join(testsOutputDir, targetSuite, 'api');
    ensureDir(targetDir);

    const outPath = path.join(targetDir, outFileName);
    fs.writeFileSync(outPath, specContent, 'utf-8');
    console.log(`✅ Spec generada: ${path.relative(projectRoot, outPath)}`);

    // ── Generar feature BDD ─────────────────────────────────────────────────
    ensureDir(featuresDir);
    const featureContent  = buildApiFeature(spec, baseName);
    const featurePath     = path.join(featuresDir, `${baseName}_api.feature`);
    fs.writeFileSync(featurePath, featureContent, 'utf-8');
    console.log(`📄 Feature generado: ${path.relative(projectRoot, featurePath)}`);
  }

  // ── Generar/actualizar steps compartidos para todos los features de API ───
  ensureDir(stepsDir);
  const stepsPath = path.join(stepsDir, 'api-generated.steps.ts');
  fs.writeFileSync(stepsPath, buildApiGeneratedSteps(), 'utf-8');
  console.log(`📄 Steps API generados: ${path.relative(projectRoot, stepsPath)}`);

  console.log('\n🎉 BoxAPIsExecute procesado correctamente');
}
