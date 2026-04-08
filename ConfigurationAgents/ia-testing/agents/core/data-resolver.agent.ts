import { openai } from '../../utils/openai-client';
import { Action } from '../../types/action.types';

export async function resolveDataConflicts(actions: Action[]): Promise<Action[]> {
  const resolved = [...actions];

  // 🔥 Identificar selects con valores duplicados
  const selectIndices: number[] = [];
  for (let i = 0; i < resolved.length; i++) {
    if (resolved[i].type === 'select') {
      selectIndices.push(i);
    }
  }

  for (let i = 0; i < selectIndices.length; i++) {
    const idx = selectIndices[i];
    const current = resolved[idx];
    const currentValue = current.value;

    // Buscar el mismo valor en selects anteriores (puede ser el mismo elemento)
    for (let j = i - 1; j >= 0; j--) {
      const prevIdx = selectIndices[j];
      const prev = resolved[prevIdx];
      if (prev.value === currentValue && prev.selector !== current.selector) {
        console.log(`🤖 Conflicto: select en "${current.selector}" con valor "${currentValue}" ya usado en "${prev.selector}"`);
        const newValue = await generateAlternativeValue(currentValue);
        if (newValue && newValue !== currentValue) {
          resolved[idx] = { ...current, value: newValue };
          console.log(`🤖 Valor cambiado a: ${newValue}`);
        }
        break;
      }
    }
  }

  return resolved;
}

async function generateAlternativeValue(original: string): Promise<string> {
  const match = original.match(/(\D+)(\d+)/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2]);
    const newNum = num === 1 ? 2 : num - 1; // alterna entre 1 y 2
    return `${prefix}${newNum.toString().padStart(match[2].length, '0')}`;
  }
  if (/^\d+$/.test(original)) {
    const num = parseInt(original);
    return (num + 1).toString();
  }
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Genera un valor alternativo para "${original}". Devuelve solo el valor.` }],
      temperature: 0.1,
      max_tokens: 50
    });
    return response.choices[0]?.message?.content?.trim() || `${original}_ALT`;
  } catch {
    return `${original}_ALT`;
  }
}