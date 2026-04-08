import fs from 'fs';
import path from 'path';

/**
* Extrae la URL base de la primera navegación en la grabación.
*/
function extractBaseUrl(recordingContent: string): string | null {
  const match = recordingContent.match(/page\.goto\(['"`](.*?)['"`]\)/);
  return match ? match[1] : null;
}

/**
 * Convierte una ruta relativa a absoluta usando la base URL.
 */
function resolveUrl(relative: string, base: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

/**
 * Detecta llamadas a API en el código de la grabación.
 */
function discoverFromRecording(recordingPath: string): any[] {
  const content = fs.readFileSync(recordingPath, 'utf-8');
  const baseUrl = extractBaseUrl(content);
  const apiCalls: any[] = [];

  // Patrones de búsqueda
  const patterns = [
    // fetch(url, {method: 'POST'})
    {
      regex: /fetch\(['"`](.*?)['"`](?:\s*,\s*\{[^}]*method:\s*['"`](\w+)['"`][^}]*\})?/g,
      methodGroup: 2,
      urlGroup: 1,
    },
    // XMLHttpRequest.open('GET', url)
    {
      regex: /xhr\.open\(['"`](\w+)['"`],\s*['"`](.*?)['"`]\)/g,
      methodGroup: 1,
      urlGroup: 2,
    },
    // axios.get(url), axios.post(url, ...)
    {
      regex: /axios\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g,
      methodGroup: 1,
      urlGroup: 2,
    },
    // $.ajax({url, method})
    {
      regex: /\$\.ajax\(\{[^}]*url:\s*['"`](.*?)['"`][^}]*method:\s*['"`](\w+)['"`]/g,
      methodGroup: 2,
      urlGroup: 1,
    },
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      let url = match[pattern.urlGroup];
      const method = (match[pattern.methodGroup] || 'GET').toUpperCase();

      if (baseUrl && !url.match(/^https?:\/\//)) {
        url = resolveUrl(url, baseUrl);
      }

      // Excluir recursos estáticos comunes (opcional)
      if (url.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)(\?|$)/i)) {
        continue;
      }

      apiCalls.push({ url, method, type: url.includes('/graphql') ? 'graphql' : 'rest' });
    }
  }

  return apiCalls;
}

export function discoverApiCalls(recordingPath: string): any[] {
  const apiCalls: any[] = [];
  const flowName = path.basename(recordingPath, path.extname(recordingPath));

  // 1. Buscar en el código de la grabación
  const fromRecording = discoverFromRecording(recordingPath);
  apiCalls.push(...fromRecording);

  // 2. Buscar archivos de red guardados previamente (si existen)
  const networkDir = path.join('BoxRecordings', 'network');
  const networkFile = path.join(networkDir, `${flowName}.json`);

  if (fs.existsSync(networkFile)) {
    try {
      const networkCalls = JSON.parse(fs.readFileSync(networkFile, 'utf-8'));
      networkCalls.forEach((call: any) => {
        // Filtrar recursos estáticos
        if (!call.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)(\?|$)/i)) {
          apiCalls.push({
            url: call.url,
            method: call.method || 'GET',
            type: call.url.includes('/graphql') ? 'graphql' : 'rest',
          });
        }
      });
      console.log(` ❌ [API Discovery] Encontradas ${networkCalls.length} llamadas en archivo de red`);
    } catch (e) {
      console.log(`⚠️ Error reading network file for ${flowName}:`, e.message);
    }
  } else {
    console.log(`[API Discovery] No se encontró archivo de red para ${flowName}`);
  }

  // Eliminar duplicados
  const unique = new Map();
  apiCalls.forEach(call => {
    const key = `${call.method}:${call.url}`;
    if (!unique.has(key)) {
      unique.set(key, call);
    }
  });

  return Array.from(unique.values());
}