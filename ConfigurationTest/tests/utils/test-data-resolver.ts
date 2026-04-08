const usedValues: Record<string, string> = {};

export function resolveSmartValue(selector: string, value: string): string {

  // 🔥 Si ya se usó ese valor en otro campo similar → cambiarlo
  if (usedValues[selector] === value) {

    const alt = generateAlternative(value);

    usedValues[selector] = alt;
    return alt;
  }

  // 🔥 Evitar duplicados entre campos relacionados
  for (const key in usedValues) {
    if (usedValues[key] === value && key !== selector) {

      const alt = generateAlternative(value);

      usedValues[selector] = alt;
      return alt;
    }
  }

  usedValues[selector] = value;
  return value;
}

function generateAlternative(value: string): string {

  // 🔥 patrón tipo ACC001 → ACC002 → ACC003
  const match = value.match(/(\D+)(\d+)/);

  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2]) + 1;
    return `${prefix}${num.toString().padStart(match[2].length, '0')}`;
  }

  // fallback genérico
  return value + '_ALT';
}