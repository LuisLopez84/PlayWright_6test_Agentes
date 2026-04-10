import 'dotenv/config';
import OpenAI from 'openai';

// ✅ Graceful degradation: si no hay API key el framework funciona sin IA
let _openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn(
    '⚠️  OPENAI_API_KEY no definida → healing por IA desactivado.\n' +
    '   Agrega OPENAI_API_KEY=sk-... en tu archivo .env para habilitarlo.'
  );
}

export const openai = _openai;
export const hasOpenAI = !!_openai;
