import { openai } from '../../../ConfigurationAgents/ia-testing/utils/openai-client';

const usedValues: Record<string, string[]> = {};

export async function resolveSmartValue(selector: string, value: string): Promise<string> {
  const key = selector;
  const used = usedValues[key] || [];

  if (used.includes(value)) {
    console.log(`🤖 Dato duplicado para "${selector}" -> generando nuevo`);
    const newValue = await generateDynamicData(selector, value);
    if (!usedValues[key]) usedValues[key] = [];
    usedValues[key].push(newValue);
    return newValue;
  }

  if (!usedValues[key]) usedValues[key] = [];
  usedValues[key].push(value);
  return value;
}

// ─── Generadores offline (sin IA) ───────────────────────────────────────────

/** Genera un email único con formato válido garantizado */
function generateUniqueEmail(originalValue: string): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  // Intentar extraer el local-part del email original para mantener contexto
  const localPart = originalValue.includes('@')
    ? originalValue.split('@')[0].replace(/[^a-z0-9]/gi, '').substring(0, 12) || 'user'
    : 'user';
  return `${localPart}${rand}_${ts}@testmail.com`;
}

/** Genera un nombre de usuario único */
function generateUniqueUsername(originalValue: string): string {
  const ts = Date.now().toString().slice(-6);
  const base = originalValue.replace(/[^a-z0-9]/gi, '').substring(0, 8) || 'user';
  return `${base}${ts}`;
}

/** Genera una fecha futura en formato YYYY-MM-DD */
function generateFutureDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(Math.random() * 365) + 1);
  return d.toISOString().split('T')[0];
}

/** Genera un número de teléfono colombiano realista */
function generatePhone(): string {
  const prefix = ['300', '301', '302', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321', '322', '323'];
  const p = prefix[Math.floor(Math.random() * prefix.length)];
  const rest = Math.floor(Math.random() * 9000000) + 1000000;
  return `${p}${rest}`;
}

/** Genera un nombre completo aleatorio */
const FIRST_NAMES = ['Carlos', 'María', 'Juan', 'Ana', 'Pedro', 'Laura', 'Luis', 'Sofia', 'Diego', 'Valentina'];
const LAST_NAMES = ['García', 'Martínez', 'López', 'González', 'Rodríguez', 'Hernández', 'Pérez', 'Sánchez'];
function generateFullName(): string {
  const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${fn} ${ln}`;
}

/** Genera una contraseña segura */
function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let pass = '';
  for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

// ─── Clasificador de tipo de campo ───────────────────────────────────────────
function classifyField(selector: string): string {
  const s = selector.toLowerCase();
  if (s.includes('email') || s.includes('correo') || s.includes('mail')) return 'email';
  if (s.includes('password') || s.includes('contraseña') || s.includes('pass')) return 'password';
  if (s.includes('user') || s.includes('usuario') || s.includes('login')) return 'username';
  if (s.includes('nombre') || s.includes('name') || s.includes('apellido') || s.includes('lastname')) return 'name';
  if (s.includes('tel') || s.includes('phone') || s.includes('celular') || s.includes('movil')) return 'phone';
  if (s.includes('direccion') || s.includes('address')) return 'address';
  if (s.includes('fecha') || s.includes('date') || s.includes('nacimiento') || s.includes('birth')) return 'date';
  if (s.includes('tarjeta') || s.includes('card') || s.includes('numero') || s.includes('number')) return 'card';
  return 'generic';
}

async function generateDynamicData(selector: string, originalValue: string): Promise<string> {
  const fieldType = classifyField(selector);

  // Intentar primero con generadores offline (rápidos, sin coste de API)
  switch (fieldType) {
    case 'email':    return generateUniqueEmail(originalValue);
    case 'username': return generateUniqueUsername(originalValue);
    case 'date':     return generateFutureDate();
    case 'phone':    return generatePhone();
    case 'name':     return generateFullName();
    case 'password': return generatePassword();
  }

  // Para tipos sin generador offline, intentar IA con fallback
  if (!openai) {
    return `${originalValue}_${Date.now()}`;
  }

  try {
    const fieldLabel = {
      address: 'dirección postal colombiana',
      card:    'número de tarjeta de crédito (solo 16 dígitos)',
      generic: 'texto genérico único',
    }[fieldType] || 'texto genérico';

    const prompt = `Genera un valor realista y único para un campo de tipo "${fieldLabel}".
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