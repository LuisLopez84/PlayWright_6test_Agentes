// GENERADO AUTOMÁTICAMENTE por BoxAPIsExecute — no editar manualmente
// Para customizar, agrega el comentario "// CUSTOMIZADO" en la primera línea
// y este archivo no será sobreescrito en el próximo npm run generate.
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../ConfigurationTest/tests/utils/api-helper';

const { Given, When, Then, Before } = createBdd();

const SOAP_BODIES: Record<string, string> = {
  'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName': `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<ListOfContinentsByName xmlns="http://www.oorsprong.org/websamples.countryinfo">
</ListOfContinentsByName>
</soap:Body>
</soap:Envelope>`,
  'http://www.dneonline.com/calculator.asmx': `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
<soapenv:Header/>
<soapenv:Body>
<tem:Add>
<tem:intA>5</tem:intA>
<tem:intB>2</tem:intB>
</tem:Add>
</soapenv:Body>
</soapenv:Envelope>`,
};

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
