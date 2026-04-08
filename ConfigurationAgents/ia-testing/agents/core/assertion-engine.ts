import { openai } from '../../utils/openai-client';

export async function generateAssertions(steps: any[]) {

  const prompt = `
Based on these steps, generate Playwright assertions.

Steps:
${JSON.stringify(steps, null, 2)}

Rules:
- Validate final state
- Use expect()
- Prefer visible text

Return ONLY code
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content || '';
}