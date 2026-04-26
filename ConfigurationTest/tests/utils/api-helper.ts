import { APIRequestContext, test } from '@playwright/test';

export async function restRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  options?: {
    data?: any;
    headers?: Record<string, string>;
    params?: Record<string, string>;
  }
) {
  const startTime = Date.now();
  // Playwright serializa `data` como form-encoded a menos que se use la opción
  // `contentType: 'application/json'`. Detectamos el header y serializamos manualmente.
  const contentType = options?.headers?.['Content-Type'] || options?.headers?.['content-type'] || '';
  const rawData = (contentType.includes('application/json') && options?.data && typeof options.data === 'object')
    ? JSON.stringify(options.data)
    : options?.data;
  const response = await request[method.toLowerCase()](url, {
    data: rawData,
    headers: options?.headers,
    params: options?.params,
  });
  const duration = Date.now() - startTime;

  // ── Attach para el reporte HTML de Playwright ──────────────────────────────
  await test.info().attach('📤 API Request', {
    body: JSON.stringify({ method, url, options }, null, 2),
    contentType: 'application/json',
  });

  const responseBody = await response.text().catch(() => 'No se pudo leer el cuerpo');
  await test.info().attach('📥 API Response', {
    body: JSON.stringify({
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      body: responseBody,
      duration: `${duration}ms`,
    }, null, 2),
    contentType: 'application/json',
  });

  // ── Log estructurado → JUnit XML system-out (para el portal) ──────────────
  // Sanitizar headers sensibles
  const safeHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(options?.headers || {})) {
    safeHeaders[k] = k.toLowerCase() === 'authorization' ? '[REDACTED]' : v;
  }
  const reqBodyLog = rawData
    ? (typeof rawData === 'string' ? rawData.substring(0, 500) : JSON.stringify(rawData).substring(0, 500))
    : '(sin body)';

  let respBodyLog = responseBody;
  try {
    respBodyLog = JSON.stringify(JSON.parse(responseBody), null, 2).substring(0, 800);
  } catch { respBodyLog = responseBody.substring(0, 800); }

  const respHeaders = response.headers();
  const safeRespHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(respHeaders)) {
    safeRespHeaders[k] = v;
  }

  console.log(`\n@@API_REQUEST_START@@
METHOD: ${method}
URL: ${url}
HEADERS: ${JSON.stringify(safeHeaders)}
BODY: ${reqBodyLog}
@@API_REQUEST_END@@`);

  console.log(`@@API_RESPONSE_START@@
STATUS: ${response.status()} ${response.statusText()}
DURATION: ${duration}ms
HEADERS: ${JSON.stringify(safeRespHeaders)}
BODY: ${respBodyLog}
@@API_RESPONSE_END@@`);

  return response;
}

export async function soapRequest(
  request: APIRequestContext,
  url: string,
  xmlBody: string,
  soapAction?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'text/xml; charset=utf-8',
  };
  if (soapAction) {
    headers['SOAPAction'] = soapAction;
  }
  const startTime = Date.now();
  const response = await request.post(url, {
    data: xmlBody,
    headers,
  });
  const duration = Date.now() - startTime;

  // ── Attach para el reporte HTML de Playwright ──────────────────────────────
  await test.info().attach('📤 SOAP Request', {
    body: `URL: ${url}\nHeaders: ${JSON.stringify(headers)}\nBody:\n${xmlBody}`,
    contentType: 'text/plain',
  });

  const responseBody = await response.text().catch(() => 'No se pudo leer el cuerpo');
  await test.info().attach('📥 SOAP Response', {
    body: `Status: ${response.status()} (${response.statusText()})\nDuration: ${duration}ms\nBody:\n${responseBody}`,
    contentType: 'text/plain',
  });

  // ── Log estructurado → JUnit XML system-out (para el portal) ──────────────
  const bodyPreview = xmlBody.substring(0, 800);
  const respBodyLog = responseBody.substring(0, 800);
  const respHeaders = response.headers();

  console.log(`\n@@API_REQUEST_START@@
METHOD: POST (SOAP)
URL: ${url}
HEADERS: ${JSON.stringify(headers)}
SOAPACTION: ${soapAction || '(none)'}
BODY: ${bodyPreview}
@@API_REQUEST_END@@`);

  console.log(`@@API_RESPONSE_START@@
STATUS: ${response.status()} ${response.statusText()}
DURATION: ${duration}ms
HEADERS: ${JSON.stringify(respHeaders)}
BODY: ${respBodyLog}
@@API_RESPONSE_END@@`);

  return response;
}