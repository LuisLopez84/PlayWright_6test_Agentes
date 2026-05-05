// Risk 6: dotenv solo se carga si aún no está cargado (idempotente en dotenv,
// pero evita la advertencia de "already loaded" en algunos setups).
if (!process.env.DOTENV_LOADED) {
  require('dotenv').config();
  process.env.DOTENV_LOADED = 'true';
}

import OpenAI from 'openai';

// Risk 3: formato mínimo de key válida — sk- o sk-proj- seguido de caracteres
const KEY_RE = /^sk-[A-Za-z0-9_-]{10,}$/;

// Risk 4: Singleton por diseño — la instancia se crea una vez por proceso.
// Si OPENAI_API_KEY cambia después de la primera importación, reinicia el proceso.
let _openai: OpenAI | null = null;

const rawKey = process.env.OPENAI_API_KEY ?? '';

if (rawKey) {
  if (!KEY_RE.test(rawKey)) {
    // Risk 3: key presente pero con formato inválido
    // Risk 2: solo advertir si OPENAI_WARN no está suprimido
    if (process.env.OPENAI_SUPPRESS_WARN !== 'true') {
      console.warn(
        '⚠️  OPENAI_API_KEY tiene formato inválido (esperado: sk-...) → healing por IA desactivado.\n' +
        '   Verifica que la key sea correcta en tu archivo .env.'
      );
    }
  } else {
    // Risk 5: timeout 15 s y máximo 1 reintento para no bloquear tests
    _openai = new OpenAI({
      apiKey: rawKey,
      maxRetries: 1,
      timeout: 15_000,
    });
  }
} else {
  // Risk 2: suprimible con OPENAI_SUPPRESS_WARN=true
  if (process.env.OPENAI_SUPPRESS_WARN !== 'true') {
    console.warn(
      '⚠️  OPENAI_API_KEY no definida → healing por IA desactivado.\n' +
      '   Agrega OPENAI_API_KEY=sk-... en tu archivo .env para habilitarlo.'
    );
  }
}

export const openai    = _openai;
export const hasOpenAI = _openai !== null;
