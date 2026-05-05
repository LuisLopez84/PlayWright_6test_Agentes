import { openai, hasOpenAI } from '../../utils/openai-client';
import { Action } from '../../types/action.types';

// Risk 5: log silenciable — solo activo con DEBUG_RESOLVER=true para no ensuciar CI
const DEBUG = process.env.DEBUG_RESOLVER === 'true';
function log(msg: string): void { if (DEBUG) console.log(`[data-resolver] ${msg}`); }

/**
 * Corrige conflictos de valores duplicados entre acciones select del flujo.
 *
 * Risk 1: elimina el break — ahora compara contra TODOS los valores previos usados.
 * Risk 2: Baja severidad — la lógica se limita a select por diseño; fill legítimo
 *         puede repetir valores (contraseñas, códigos) y no debe alterarse.
 * Risk 4: structuredClone — copia profunda para no compartir referencias con el caller.
 */
export async function resolveDataConflicts(actions: Action[]): Promise<Action[]> {
  // Risk 4: copia profunda — Action.raw u objetos anidados no comparten referencia
  const resolved: Action[] = structuredClone(actions);

  const selectIndices: number[] = [];
  for (let i = 0; i < resolved.length; i++) {
    if (resolved[i].action === 'select' || resolved[i].type === 'select') {
      selectIndices.push(i);
    }
  }

  for (let i = 0; i < selectIndices.length; i++) {
    const idx     = selectIndices[i];
    const current = resolved[idx];
    if (!current.value) continue;

    // Risk 1: acumular TODOS los valores usados por selects anteriores en selectores distintos
    const usedValues = new Set<string>();
    for (let j = 0; j < i; j++) {
      const prev = resolved[selectIndices[j]];
      if (prev.selector !== current.selector && prev.value) {
        usedValues.add(prev.value);
      }
    }

    if (usedValues.has(current.value)) {
      log(`Conflicto en "${current.selector}" — valor "${current.value}" ya usado.`);
      // Risk 3: busca el primer valor numérico que NO esté en usedValues
      const newValue = await generateUniqueAlternative(current.value, usedValues);
      if (newValue && newValue !== current.value) {
        resolved[idx] = { ...current, value: newValue };
        log(`Valor cambiado: "${current.value}" → "${newValue}"`);
      }
    }
  }

  return resolved;
}

/**
 * Genera un valor alternativo que no colisione con ninguno de usedValues.
 *
 * Risk 3: en lugar de num-1 fijo, busca el primer delta positivo no usado,
 *         luego negativo, luego delega a OpenAI, luego usa sufijo _ALT_N.
 */
async function generateUniqueAlternative(
  original: string,
  usedValues: Set<string>
): Promise<string> {
  // Caso: string con prefijo alfanumérico + número (p.ej. "ENT01", "Item_02")
  const mixedM = original.match(/^(\D*)(\d+)(\D*)$/);
  if (mixedM) {
    const [, pre, numStr, suf] = mixedM;
    const base   = parseInt(numStr, 10);
    const padLen = numStr.length;
    // Risk 3: delta positivo primero, luego negativo
    for (let d = 1; d <= 100; d++) {
      const c = `${pre}${String(base + d).padStart(padLen, '0')}${suf}`;
      if (!usedValues.has(c)) return c;
    }
    for (let d = 1; d < base; d++) {
      const c = `${pre}${String(base - d).padStart(padLen, '0')}${suf}`;
      if (!usedValues.has(c)) return c;
    }
  }

  // Caso: número puro
  if (/^\d+$/.test(original)) {
    const base = parseInt(original, 10);
    for (let d = 1; d <= 100; d++) {
      const c = String(base + d);
      if (!usedValues.has(c)) return c;
    }
  }

  // Delegación a OpenAI (null guard — no crash si no hay API key)
  if (hasOpenAI && openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Genera un valor alternativo para "${original}". Devuelve solo el valor, sin explicación.`,
        }],
        temperature: 0.1,
        max_tokens: 50,
      });
      const candidate = response.choices[0]?.message?.content?.trim() ?? '';
      if (candidate && !usedValues.has(candidate)) return candidate;
    } catch (err: any) {
      log(`OpenAI error generando alternativa: ${err.message}`);
    }
  }

  // Último recurso: sufijo _ALT_N incremental
  let n = 2;
  while (usedValues.has(`${original}_ALT${n}`)) n++;
  return `${original}_ALT${n}`;
}
