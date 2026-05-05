import fs from 'fs';
import path from 'path';
import { generateApiTests } from '../agents/network/api-test-generator.agent';
import { discoverApiCalls } from '../agents/network/api-discovery.agent';

const networkDir   = path.join('BoxRecordings', 'network');
const recordingDir = path.join('BoxRecordings', 'recordings');

// Risk 5: misma lógica de filtro que api-discovery.agent.ts
function isStaticResource(url: string): boolean {
  return /\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico|map)(\?|$)/i.test(url);
}

// Risk 4: deduplicar por método + URL antes de pasar a generateApiTests
function dedup(apis: any[]): any[] {
  const seen = new Set<string>();
  return apis.filter(a => {
    const key = `${(a.method ?? 'GET').toUpperCase()}:${a.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function run(): void {
  let processed = 0;

  // ── Estrategia 1: archivos de captura de red en BoxRecordings/network/ ──
  if (fs.existsSync(networkDir)) {
    const files = fs.readdirSync(networkDir).filter(f => f.endsWith('.json')); // Risk 1: ya aplicado

    for (const file of files) {
      const filePath = path.join(networkDir, file);
      let content: any[];
      try {
        content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (err: any) {
        console.error(`❌ Error parseando ${file}: ${err.message}`);
        continue;
      }

      if (!Array.isArray(content)) {
        console.warn(`⚠️ Contenido inesperado en ${file} — se omite`);
        continue;
      }

      const name = file.replace(/\.json$/, ''); // Risk 3: ya aplicado (ancla de sufijo)

      const apis = dedup( // Risk 4: deduplicación
        content
          .filter(c => c.url && !isStaticResource(c.url)) // Risk 5: filtrar recursos estáticos
          .map(c => ({
            url:    c.url,
            method: (c.method ?? 'GET').toUpperCase(), // Risk 6: fallback a GET
            type:   c.url?.includes('/graphql') ? 'graphql' : (c.type ?? 'rest'),
          }))
      );

      if (apis.length > 0) {
        generateApiTests(name, apis);
        processed++;
      }
    }
  }

  // Risk 8: fallback — BoxRecordings/network/ está vacío en el flujo estándar;
  // si no se procesó nada, descubrir APIs directamente desde las grabaciones.
  if (processed === 0 && fs.existsSync(recordingDir)) {
    console.log('ℹ️ [generate:api] Sin archivos de red — descubriendo APIs desde grabaciones...');
    const recordings = fs.readdirSync(recordingDir).filter(f => f.endsWith('.ts'));

    for (const rec of recordings) {
      const recPath = path.join(recordingDir, rec);
      const name    = rec.replace(/\.ts$/, '');
      try {
        const apis = discoverApiCalls(recPath);
        if (apis.length > 0) {
          generateApiTests(name, apis);
          processed++;
        }
      } catch (err: any) {
        console.warn(`⚠️ [generate:api] Error procesando "${rec}": ${err.message}`);
      }
    }
  }

  if (processed === 0) {
    console.log('ℹ️ [generate:api] No se encontraron datos de red ni grabaciones con APIs');
    console.log('   Ejecuta npm run generate primero para activar el descubrimiento de APIs');
  }
}

// Risk 2: capturar errores síncronos inesperados en el call site
try {
  run();
} catch (err: any) {
  console.error(`❌ [generate:api] Error inesperado: ${err.message}`);
  process.exit(1);
}
