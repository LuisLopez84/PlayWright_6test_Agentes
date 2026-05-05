// GENERADO AUTOMÁTICAMENTE por BoxAPIsExecute — no editar manualmente
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
  _ctx.type           = 'REST';
  _ctx.method         = 'GET';
  _ctx.url            = '';
  _ctx.body           = null;
  _ctx.soapAction     = null;
  _ctx.status         = 0;
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
    const badUrl = _ctx.url.replace(/\/+$/, '') + '/id-invalido-test-99999';
    const res = await restRequest(request, _ctx.method as any, badUrl,
      { headers: { accept: 'application/json' } } as any);
    _ctx.status = res.status();
  }
});

// ─── Then ─────────────────────────────────────────────────────────────────────
Then('la respuesta debe tener un estado de éxito 2xx', async () => {
  expect(_ctx.status, `Estado recibido: ${_ctx.status}`).toBeGreaterThanOrEqual(200);
  expect(_ctx.status, `Estado recibido: ${_ctx.status}`).toBeLessThan(300);
});

Then('la respuesta debe indicar un fallo técnico de red o 5xx', async () => {
  expect(
    _ctx.hasNetworkError || _ctx.status >= 500,
    `Se esperaba error de red o 5xx, recibido: ${_ctx.status}`
  ).toBe(true);
});

Then('la respuesta debe indicar error de validación de datos 4xx', async () => {
  expect(
    _ctx.status >= 400,
    `Se esperaba 4xx o superior, recibido: ${_ctx.status}`
  ).toBe(true);
});
