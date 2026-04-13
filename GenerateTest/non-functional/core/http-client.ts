/**
 * http-client.ts
 *
 * Cliente HTTP nativo (sin dependencias externas).
 * Usa keep-alive para optimizar el rendimiento en pruebas de carga.
 * Compatible con Node.js 14+.
 */

import https from 'https';
import http from 'http';

// ─── Agentes con keep-alive para reutilizar conexiones TCP ───────────────────
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 500,
  maxFreeSockets: 100,
  timeout: 30000,
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 500,
  maxFreeSockets: 100,
  timeout: 30000,
});

export interface HttpResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Realiza una petición HTTP/HTTPS con timeout de 30 segundos.
 * Usa keep-alive para mejorar el rendimiento bajo carga.
 */
export function makeRequest(
  url: string,
  method = 'GET',
  headers: Record<string, string> = {},
  body?: string,
  timeoutMs = 30000,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return reject(new Error(`URL inválida: ${url}`));
    }

    const isHttps = urlObj.protocol === 'https:';
    const port = urlObj.port
      ? parseInt(urlObj.port, 10)
      : isHttps ? 443 : 80;

    const requestHeaders: Record<string, string> = {
      'User-Agent': 'PlaywrightNonFunctional/1.0',
      'Accept': '*/*',
      'Connection': 'keep-alive',
      ...headers,
    };

    if (body) {
      requestHeaders['Content-Length'] = Buffer.byteLength(body).toString();
      if (!requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }

    const options: http.RequestOptions = {
      hostname: urlObj.hostname,
      port,
      path: urlObj.pathname + (urlObj.search || ''),
      method: method.toUpperCase(),
      headers: requestHeaders,
      agent: isHttps ? httpsAgent : httpAgent,
    };

    const client = isHttps ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        // Limitar body acumulado a 64KB para no saturar memoria bajo carga
        if (data.length < 65536) data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: data,
          headers: res.headers as Record<string, string | string[] | undefined>,
        });
      });
      res.on('error', reject);
    });

    // Timeout
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout después de ${timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}
