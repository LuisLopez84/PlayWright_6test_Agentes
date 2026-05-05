import fs from 'fs';
import path from 'path';

// ─── URL helpers ──────────────────────────────────────────────────────────────

/**
 * Extrae la URL base de la grabación.
 * Risk 6: fallback a primera URL absoluta encontrada si no hay page.goto.
 */
function extractBaseUrl(content: string): string | null {
  const gotoM = content.match(/page\.goto\(['"`](.*?)['"`]\)/);
  if (gotoM) return gotoM[1];
  // Fallback: primera URL http/https literal en el archivo
  const absM = content.match(/['"`](https?:\/\/[^'"`\s]{4,})['"`]/);
  if (absM) { try { return new URL(absM[1]).origin; } catch {} }
  // Fallback env var
  return process.env.BASE_URL || null;
}

function resolveUrl(relative: string, base: string): string {
  try { return new URL(relative, base).href; } catch { return relative; }
}

/**
 * Risk 7: normaliza segmentos dinámicos para deduplicar endpoints parametrizados.
 * /api/users/123 y /api/users/456 → /api/users/{id}
 */
function normalizeUrlForDedup(url: string): string {
  const normalize = (s: string) =>
    s
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/{uuid}')
      .replace(/\/\d+/g, '/{id}');
  try {
    const u = new URL(url);
    return u.origin + normalize(u.pathname) + u.search;
  } catch {
    return normalize(url);
  }
}

function isStaticResource(url: string): boolean {
  return /\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico|map)(\?|$)/i.test(url);
}

// ─── Descubrimiento desde código de grabación ─────────────────────────────────

function discoverFromRecording(recordingPath: string): any[] {
  const content = fs.readFileSync(recordingPath, 'utf-8');
  const baseUrl = extractBaseUrl(content);
  const apiCalls: any[] = [];

  // ── Patrones de detección ────────────────────────────────────────────────
  const patterns: Array<{
    regex: RegExp;
    urlGroup: number;
    methodGroup: number;
    forcedMethod?: string;
    forcedType?: string;
  }> = [
    // fetch('/api', { method: 'POST', body: ... })
    {
      regex: /fetch\(['"`](.*?)['"`](?:\s*,\s*\{[^}]*?method:\s*['"`](\w+)['"`][^}]*?\})?/g,
      urlGroup: 1, methodGroup: 2,
    },
    // Risk 8: fetch a /graphql con body JSON.stringify({ query: — siempre POST
    {
      regex: /fetch\(['"`](.*?graphql.*?)['"`][^)]*?body:\s*JSON\.stringify\(\s*\{[^}]*?(?:query|operationName):/g,
      urlGroup: 1, methodGroup: -1, forcedMethod: 'POST', forcedType: 'graphql',
    },
    // XMLHttpRequest.open('POST', '/api/...')
    {
      regex: /xhr\.open\(['"`](\w+)['"`],\s*['"`](.*?)['"`]\)/g,
      methodGroup: 1, urlGroup: 2,
    },
    // axios.get/post/put/delete/patch('/api/...')
    {
      regex: /axios\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g,
      methodGroup: 1, urlGroup: 2,
    },
    // Risk 5: ky.get/post/...
    {
      regex: /ky\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g,
      methodGroup: 1, urlGroup: 2,
    },
    // Risk 5: got.get/post/...
    {
      regex: /got\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g,
      methodGroup: 1, urlGroup: 2,
    },
    // Risk 5: superagent / request .get/.post/...
    {
      regex: /(?:superagent|request)\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g,
      methodGroup: 1, urlGroup: 2,
    },
    // Risk 2: $.ajax({ url: '...', method: '...' }) — url primero
    {
      regex: /\$\.ajax\(\{[^}]*?url:\s*['"`](.*?)['"`][^}]*?method:\s*['"`](\w+)['"`]/g,
      urlGroup: 1, methodGroup: 2,
    },
    // Risk 2: $.ajax({ method: '...', url: '...' }) — method primero
    {
      regex: /\$\.ajax\(\{[^}]*?method:\s*['"`](\w+)['"`][^}]*?url:\s*['"`](.*?)['"`]/g,
      methodGroup: 1, urlGroup: 2,
    },
    // Risk 5: useSWR('/api/...') — siempre GET
    {
      regex: /useSWR\(['"`](\/[^'"`\s]+)['"`]/g,
      urlGroup: 1, methodGroup: -1, forcedMethod: 'GET',
    },
    // Risk 5: useQuery('/api/...') / useMutation('/api/...') de react-query/apollo
    {
      regex: /useMutation\(['"`](\/[^'"`\s]+)['"`]/g,
      urlGroup: 1, methodGroup: -1, forcedMethod: 'POST',
    },
    {
      regex: /useQuery\(['"`](\/[^'"`\s]+)['"`]/g,
      urlGroup: 1, methodGroup: -1, forcedMethod: 'GET',
    },
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    pattern.regex.lastIndex = 0;
    while ((match = pattern.regex.exec(content)) !== null) {
      let url = match[pattern.urlGroup];
      if (!url) continue;

      // Risk 3: fetch con body: pero sin method: explícito → inferir POST
      let method: string;
      if (pattern.forcedMethod) {
        method = pattern.forcedMethod;
      } else if (pattern.methodGroup !== -1 && match[pattern.methodGroup]) {
        method = match[pattern.methodGroup].toUpperCase();
      } else {
        // Detectar body implícito en fetch → POST
        const matchedStr = match[0];
        const hasBody = /body\s*:/.test(matchedStr);
        method = hasBody ? 'POST' : 'GET';
      }

      // Risk 6: resolver URL relativa
      if (!url.match(/^https?:\/\//)) {
        if (baseUrl) {
          url = resolveUrl(url, baseUrl);
        } else {
          console.warn(`⚠️ [API Discovery] URL relativa sin base URL — no resuelta: ${url}`);
        }
      }

      if (isStaticResource(url)) continue;

      // Risk 8: forzar POST para GraphQL
      const type = pattern.forcedType || (url.includes('/graphql') ? 'graphql' : 'rest');
      const finalMethod = (type === 'graphql') ? 'POST' : method;

      apiCalls.push({ url, method: finalMethod, type });
    }
  }

  return apiCalls;
}

// ─── Punto de entrada público ─────────────────────────────────────────────────

export function discoverApiCalls(recordingPath: string): any[] {
  const apiCalls: any[] = [];
  const flowName = path.basename(recordingPath, path.extname(recordingPath));

  // ── Estrategia 1: análisis estático del código de grabación ──────────────
  const fromRecording = discoverFromRecording(recordingPath);
  apiCalls.push(...fromRecording);

  // ── Estrategia 2: archivo de red capturado en ejecución previa ────────────
  // El archivo lo genera network-sniffer.ts al ejecutar los tests con captura activa,
  // o bien esta misma función lo crea al final (ver abajo) para activar Estrategia 2
  // en la PRÓXIMA ejecución de npm run generate.
  const networkDir  = path.join('BoxRecordings', 'network');
  const networkFile = path.join(networkDir, `${flowName}.json`);

  if (fs.existsSync(networkFile)) {
    try {
      const networkCalls: any[] = JSON.parse(fs.readFileSync(networkFile, 'utf-8'));
      networkCalls.forEach(call => {
        if (!call.url || isStaticResource(call.url)) return;
        const type = call.url.includes('/graphql') ? 'graphql' : 'rest';
        apiCalls.push({
          url:    call.url,
          method: type === 'graphql' ? 'POST' : (call.method || 'GET').toUpperCase(),
          type,
        });
      });
      // Risk 1: emoji corregido a ✅ (era ❌ incorrecto)
      console.log(`✅ [API Discovery] ${networkCalls.length} llamadas en archivo de red: ${networkFile}`);
    } catch (err: any) {
      console.warn(`⚠️ [API Discovery] Error leyendo archivo de red para ${flowName}:`, err.message);
    }
  }

  // Risk 7: deduplicar normalizando segmentos dinámicos (/{id}, /{uuid})
  const unique = new Map<string, any>();
  for (const call of apiCalls) {
    const key = `${call.method}:${normalizeUrlForDedup(call.url)}`;
    if (!unique.has(key)) unique.set(key, call);
  }

  const result = Array.from(unique.values());
  console.log(`📡 [API Discovery] ${result.length} endpoints únicos para "${flowName}"`);

  // Risk 4: persistir resultado en BoxRecordings/network/ para activar Estrategia 2
  // en la próxima generación (permite enriquecer con datos de network-sniffer).
  if (result.length > 0) {
    try {
      if (!fs.existsSync(networkDir)) fs.mkdirSync(networkDir, { recursive: true });
      // Solo escribir si no existe (no sobreescribir captura dinámica de network-sniffer)
      if (!fs.existsSync(networkFile)) {
        fs.writeFileSync(networkFile, JSON.stringify(result, null, 2), 'utf-8');
        console.log(`💾 [API Discovery] Endpoints guardados en ${networkFile} (Estrategia 2 activada)`);
      }
    } catch (err: any) {
      console.warn(`⚠️ [API Discovery] No se pudo guardar archivo de red:`, err.message);
    }
  }

  return result;
}
