import { openai } from '../../../ConfigurationAgents/ia-testing/utils/openai-client';

const usedValues: Record<string, string[]> = {};

export async function resolveSmartValue(selector: string, value: string): Promise<string> {
  const key = selector;
  const used = usedValues[key] || [];

  if (used.includes(value)) {
    console.log(`🤖 Dato duplicado para "${selector}" -> generando nuevo con IA`);
    const newValue = await generateDynamicData(selector, value);
    if (!usedValues[key]) usedValues[key] = [];
    usedValues[key].push(newValue);
    return newValue;
  }

  if (!usedValues[key]) usedValues[key] = [];
  usedValues[key].push(value);
  return value;
}

async function generateDynamicData(selector: string, originalValue: string): Promise<string> {
  let fieldType = 'texto genérico';
  const lowerSelector = selector.toLowerCase();
  if (lowerSelector.includes('email') || lowerSelector.includes('correo')) fieldType = 'correo electrónico';
  else if (lowerSelector.includes('user') || lowerSelector.includes('usuario')) fieldType = 'nombre de usuario';
  else if (lowerSelector.includes('password') || lowerSelector.includes('contraseña')) fieldType = 'contraseña segura';
  else if (lowerSelector.includes('nombre') || lowerSelector.includes('name')) fieldType = 'nombre completo';
  else if (lowerSelector.includes('tel') || lowerSelector.includes('phone')) fieldType = 'número de teléfono colombiano';
  else if (lowerSelector.includes('direccion') || lowerSelector.includes('address')) fieldType = 'dirección';
  else if (lowerSelector.includes('fecha')) fieldType = 'fecha (YYYY-MM-DD)';
  else if (lowerSelector.includes('tarjeta') || lowerSelector.includes('card')) fieldType = 'número de tarjeta de crédito (solo dígitos)';

  try {
    const prompt = `Genera un valor realista y único para un campo de tipo "${fieldType}".
    No repitas el valor "${originalValue}". Devuelve SOLO el valor, sin explicaciones.`;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 50,
    });
    let newValue = response.choices[0]?.message?.content?.trim() || `${originalValue}_${Date.now()}`;
    newValue = newValue.replace(/^["']|["']$/g, '');
    return newValue;
  } catch (error) {
    console.log(`⚠️ Error generando dato con IA, usando fallback: ${error}`);
    return `${originalValue}_${Date.now()}`;
  }
}