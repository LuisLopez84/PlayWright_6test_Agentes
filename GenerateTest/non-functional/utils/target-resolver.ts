/**
 * target-resolver.ts
 *
 * Resuelve targets (recordings + APIs) configurados en nf-config.ts
 * hacia objetos LoadTarget ejecutables por el motor de carga.
 *
 * Para recordings:
 *   1. Busca el metadata.json (contiene baseURL generado por el pipeline)
 *   2. Si no hay metadata, parsea el recording .ts para extraer page.goto()
 *
 * Para APIs:
 *   Usa directamente los datos de configuración del usuario.
 *
 * También exporta el tipo LoadTarget para que los specs generados puedan
 * importarlo y embeber el target en tiempo de generación.
 */

import fs from 'fs';
import path from 'path';
import { NFConfig, IncrementalParams, SpikeParams } from '../config/nf-config';

export interface LoadTarget {
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
  type: 'recording' | 'api';
  /** Tipo de prueba resuelto para este target (global o override por target). */
  testType: 'incremental' | 'spike';
  /** Parámetros incrementales resueltos (global o override por target). */
  incremental: IncrementalParams;
  /** Parámetros spike resueltos (global o override por target). */
  spike: SpikeParams;
}

// ─── Resolver para recordings ─────────────────────────────────────────────────

function resolveRecordingTarget(recordingName: string): { url: string } | null {
  // 1. Buscar metadata.json (fuente principal)
  const metadataCandidates = [
    path.join('GenerateTest', `${recordingName}.metadata.json`),
    path.join('GenerateTest', 'tests', recordingName, `${recordingName}.metadata.json`),
  ];

  for (const metaPath of metadataCandidates) {
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (meta.baseURL) {
          console.log(`  📄 Recording "${recordingName}" → baseURL desde metadata: ${meta.baseURL}`);
          return { url: meta.baseURL };
        }
      } catch (e) {
        console.warn(`  ⚠️  Error leyendo metadata ${metaPath}: ${e}`);
      }
    }
  }

  // 2. Fallback: parsear el archivo de grabación
  const recordingCandidates = [
    path.join('BoxRecordings', 'recordings', `${recordingName}.ts`),
    path.join('BoxRecordings', 'recordings', `${recordingName}.js`),
  ];

  for (const recPath of recordingCandidates) {
    if (fs.existsSync(recPath)) {
      const content = fs.readFileSync(recPath, 'utf-8');
      const match = content.match(/page\.goto\(['"`](https?:\/\/[^'"`]+)['"`]\)/);
      if (match) {
        try {
          const origin = new URL(match[1]).origin;
          console.log(`  📄 Recording "${recordingName}" → URL desde recording: ${origin}`);
          return { url: origin };
        } catch {
          console.warn(`  ⚠️  URL inválida en recording "${recordingName}": ${match[1]}`);
        }
      }
    }
  }

  console.error(
    `  ❌ No se encontró URL para recording "${recordingName}". ` +
    `Verifica que exista el metadata.json o el archivo en BoxRecordings/recordings/`,
  );
  return null;
}

// ─── Resolver principal ───────────────────────────────────────────────────────

/**
 * Convierte la configuración del usuario en una lista de LoadTargets ejecutables.
 * Cada target lleva su testType/incremental/spike resueltos (per-target o global).
 */
export function resolveTargets(config: typeof NFConfig): LoadTarget[] {
  const targets: LoadTarget[] = [];

  for (const t of config.targets) {
    // Resolver testType e incremental/spike: usa el override del target si existe, si no el global
    const testType   = t.testType   ?? config.testType;
    const incremental = t.incremental ?? config.incremental;
    const spike       = t.spike       ?? config.spike;

    if (t.type === 'recording') {
      const resolved = resolveRecordingTarget(t.recording.trim());
      if (!resolved) continue;
      targets.push({
        name: t.recording,
        url: resolved.url,
        method: 'GET',
        headers: {},
        body: undefined,
        type: 'recording',
        testType,
        incremental,
        spike,
      });
    } else if (t.type === 'api') {
      const ep = t.endpoint;
      if (!ep.url) {
        console.warn(`  ⚠️  API "${ep.name}" no tiene URL — omitida`);
        continue;
      }
      targets.push({
        name: ep.name,
        url: ep.url,
        method: ep.method,
        headers: ep.headers ?? {},
        body: ep.body,
        type: 'api',
        testType,
        incremental,
        spike,
      });
      console.log(`  📡 API "${ep.name}" → ${ep.url}`);
    }
  }

  return targets;
}
