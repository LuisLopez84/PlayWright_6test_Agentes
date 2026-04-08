import { openai } from '../../utils/openai-client';

export async function validateFlow(recordingSteps: any[], gherkin: string) {

  const prompt = `
Compara estos pasos reales vs el feature generado.

PASOS REALES:
${JSON.stringify(recordingSteps, null, 2)}

FEATURE:
${gherkin}

Responde:
- ¿Faltan pasos? (sí/no)
- Lista de pasos faltantes
- Feature corregido

NO expliques.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content || '';
}