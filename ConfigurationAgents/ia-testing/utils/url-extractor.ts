import fs from 'fs';

// Risk 7: exportado para que run-agents.ts lo importe en lugar de duplicarlo
export const GOTO_RE = /page\.goto\(\s*['"`](.*?)['"`]\s*\)/g;

/**
 * Extrae la primera URL de navegación válida de un recording de Playwright codegen.
 *
 * Risk 1: recorre TODAS las page.goto() y devuelve la primera con scheme http/https.
 * Risk 2: si no hay literal de string, usa process.env.BASE_URL como fallback.
 * Risk 3: about:blank y rutas relativas se descartan con advertencia explícita.
 * Risk 4: devuelve la URL completa con path — el llamador extrae .origin si lo necesita.
 * Risk 6: readFileSync síncrono — aceptable para recordings < 500 líneas.
 */
export function extractBaseURL(testPath: string): string | null {
  let content: string;
  try {
    content = fs.readFileSync(testPath, 'utf-8');
  } catch (err: any) {
    console.error(`❌ [url-extractor] No se pudo leer "${testPath}": ${err.message}`);
    return null;
  }

  // Risk 1: matchAll recorre todas las llamadas goto con literal string
  const matches = [...content.matchAll(GOTO_RE)].map(m => m[1]);

  for (const raw of matches) {
    // Risk 3: descartar about:blank explícitamente
    if (raw === 'about:blank' || raw === 'about:newtab') {
      console.warn(`[url-extractor] URL no navegable ignorada: "${raw}"`);
      continue;
    }
    // Risk 3: descartar rutas relativas
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      console.warn(`[url-extractor] URL relativa ignorada (se requiere URL absoluta): "${raw}"`);
      continue;
    }
    try {
      const parsed = new URL(raw);
      return parsed.href; // Risk 4: URL completa con path
    } catch {
      console.warn(`[url-extractor] URL inválida ignorada: "${raw}"`);
    }
  }

  // Risk 2: sin literal de string — fallback a variable de entorno
  if (process.env.BASE_URL) {
    console.warn('[url-extractor] Sin page.goto() literal — usando BASE_URL del entorno.');
    return process.env.BASE_URL;
  }

  return null;
}
