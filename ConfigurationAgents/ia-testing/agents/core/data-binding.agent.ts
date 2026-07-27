/**
 * data-binding.agent.ts
 *
 * Empareja columnas de un archivo de datos (BoxTestData/<Suite>.csv|.txt|.xlsx)
 * con los campos de un flujo UI grabado o con las claves del body de una API.
 *
 * Mismo patrón "match local normalizado → fallback a IA (gpt-4o-mini, temperature 0)"
 * que ya usan findMatchingSuite/findMatchingSuiteWithAI en box-api-executor.agent.ts —
 * aquí se generaliza en matchColumnsToTargets() para reutilizarlo desde UI y API.
 */

import { openai as sharedOpenai, hasOpenAI } from '../../utils/openai-client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MatchTarget {
  id: string;    // identificador estable del campo/clave (índice de step, o nombre de key JSON/XML)
  label: string; // etiqueta humana para comparar contra el header de columna
}

// ─── Normalización ────────────────────────────────────────────────────────────

function normalizeLabel(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function invertMap(map: Record<string, string>): Record<string, string> {
  const inverted: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) inverted[v] = k;
  return inverted;
}

// ─── Matcher genérico columna → target ────────────────────────────────────────

/**
 * Empareja headers de un archivo de datos contra "targets" (campos UI o claves de API).
 *   1) match exacto normalizado
 *   2) match por contención (substring en cualquier dirección)
 *   3) fallback a IA — UNA sola llamada por archivo, para lo que quede sin resolver
 * Columnas que no logran match tras los 3 pasos quedan sin usar (se loguea cuáles).
 * Devuelve { columnName: targetId }.
 */
export async function matchColumnsToTargets(
  headers: string[],
  targets: MatchTarget[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const usedTargetIds = new Set<string>();
  const normalizedTargets = targets.map(t => ({ ...t, norm: normalizeLabel(t.label) }));

  // 1) Match exacto normalizado
  const afterExact: string[] = [];
  for (const header of headers) {
    const nh = normalizeLabel(header);
    const exact = normalizedTargets.find(t => t.norm === nh && t.norm.length > 0 && !usedTargetIds.has(t.id));
    if (exact) { result[header] = exact.id; usedTargetIds.add(exact.id); }
    else afterExact.push(header);
  }

  // 2) Match por contención
  const afterContains: string[] = [];
  for (const header of afterExact) {
    const nh = normalizeLabel(header);
    const contained = normalizedTargets.find(t =>
      !usedTargetIds.has(t.id) && nh.length > 0 && t.norm.length > 0 &&
      (t.norm.includes(nh) || nh.includes(t.norm))
    );
    if (contained) { result[header] = contained.id; usedTargetIds.add(contained.id); }
    else afterContains.push(header);
  }

  // 3) Fallback IA — una sola llamada para lo que quede
  const remainingTargets = normalizedTargets.filter(t => !usedTargetIds.has(t.id));
  if (afterContains.length > 0 && remainingTargets.length > 0 && hasOpenAI && sharedOpenai) {
    try {
      const aiMap = await matchWithAI(afterContains, remainingTargets.map(t => ({ id: t.id, label: t.label })));
      for (const [header, targetId] of Object.entries(aiMap)) {
        if (targetId && !usedTargetIds.has(targetId) && normalizedTargets.some(t => t.id === targetId)) {
          result[header] = targetId;
          usedTargetIds.add(targetId);
        }
      }
    } catch (err) {
      console.warn('⚠️ [data-binding] Error en match IA de columnas:', err);
    }
  }

  const unmatched = headers.filter(h => !(h in result));
  if (unmatched.length > 0) {
    console.warn(`⚠️ [data-binding] Columnas sin campo/clave correspondiente (se ignoran): ${unmatched.join(', ')}`);
  }

  return result;
}

async function matchWithAI(
  headers: string[],
  targets: { id: string; label: string }[],
): Promise<Record<string, string | null>> {
  const prompt = `Eres un asistente que empareja columnas de un archivo de datos de pruebas con campos de un formulario o claves de una API.

Columnas sin emparejar: ${JSON.stringify(headers)}
Campos/claves disponibles: ${JSON.stringify(targets)}

Responde ÚNICAMENTE un objeto JSON válido {"columna": "id_del_campo_o_null", ...} usando exactamente los "id" dados.
Si una columna no corresponde a ningún campo, usa null. No agregues explicaciones ni texto adicional.`;

  const response = await sharedOpenai!.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '{}';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  }
}

// ─── Binding para UI ──────────────────────────────────────────────────────────

const DDT_FIELD_ACTIONS = new Set(['fill', 'input', 'select', 'selectOption']);

/**
 * Extrae una etiqueta humana legible de un selector grabado, para comparar contra
 * columnas del archivo de datos (ej. `page.getByRole('textbox', { name: 'Usuario' })` → "Usuario").
 * Si el selector no tiene una etiqueta semántica (ej. `#source-account`), se deriva
 * una pseudo-etiqueta limpiando el selector crudo.
 */
function extractFieldLabel(step: any): string {
  const raw = String(step.selector || step.target || '');
  const nameMatch = raw.match(/name:\s*['"]([^'"]+)['"]/);
  if (nameMatch) return nameMatch[1];
  const labelMatch = raw.match(/getByLabel\(\s*['"]([^'"]+)['"]/);
  if (labelMatch) return labelMatch[1];
  const placeholderMatch = raw.match(/getByPlaceholder\(\s*['"]([^'"]+)['"]/);
  if (placeholderMatch) return placeholderMatch[1];
  // Fallback: limpiar el selector crudo (#id, .clase, kebab_case) como pseudo-etiqueta.
  return raw.replace(/^[#.[]/, '').replace(/[\]'"()]/g, '').replace(/[-_]/g, ' ').trim();
}

/**
 * Empareja columnas del archivo de datos con los steps fill/input/select del flujo
 * PRINCIPAL (no dentro de popups — limitación de esta primera versión).
 * Devuelve { stepIndex(string): columnName }.
 */
export async function bindUiColumns(steps: any[], headers: string[]): Promise<Record<string, string>> {
  const targets: MatchTarget[] = [];
  steps.forEach((step, idx) => {
    if (!DDT_FIELD_ACTIONS.has(step.action) || step.pageRef === 'popup') return;
    const label = extractFieldLabel(step);
    if (label) targets.push({ id: String(idx), label });
  });

  if (targets.length === 0) return {};

  const columnToTargetId = await matchColumnsToTargets(headers, targets);
  return invertMap(columnToTargetId); // { stepIndex: columnName }
}

// ─── Binding para API (REST body / SOAP tags) ─────────────────────────────────

/**
 * Empareja columnas del archivo de datos con las claves top-level de un body JSON
 * (REST) o los tags hoja de un XML (SOAP). Devuelve { bodyKey: columnName }.
 */
export async function bindApiColumns(bodyKeys: string[], headers: string[]): Promise<Record<string, string>> {
  if (bodyKeys.length === 0) return {};
  const targets: MatchTarget[] = bodyKeys.map(k => ({ id: k, label: k }));
  const columnToTargetId = await matchColumnsToTargets(headers, targets);
  return invertMap(columnToTargetId); // { bodyKey: columnName }
}
