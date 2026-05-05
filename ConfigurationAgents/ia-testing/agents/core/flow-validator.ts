import fs from 'fs';
import { openai, hasOpenAI } from '../../utils/openai-client';
import { Action } from '../../types/action.types';

// ─── Contrato de retorno ──────────────────────────────────────────────────────

export interface ValidationResult {
  hasMissingSteps: boolean;
  missingSteps: string[];
  correctedFeature: string | null;
  skipped: boolean;  // true si no había IA disponible o hubo error irrecuperable
}

// ─── Punto de entrada público ─────────────────────────────────────────────────

/**
 * Valida que el Gherkin generado cubra todos los pasos de la grabación.
 * Si detecta pasos faltantes genera una versión corregida del feature.
 *
 * @param recordingSteps  Pasos normalizados de la grabación (Action[])
 * @param gherkin         Contenido del .feature generado
 * @param featurePath     Ruta del .feature en disco. Si se proporciona y hay
 *                        correcciones, sobreescribe el archivo automáticamente.
 */
export async function validateFlow(
  recordingSteps: Action[],
  gherkin: string,
  featurePath?: string
): Promise<ValidationResult> {
  const SKIP_RESULT: ValidationResult = {
    hasMissingSteps: false,
    missingSteps: [],
    correctedFeature: null,
    skipped: true,
  };

  // Guard: sin cliente IA disponible
  if (!hasOpenAI || !openai) {
    console.log('⚠️ [flow-validator] Sin OPENAI_API_KEY — validación omitida');
    return SKIP_RESULT;
  }

  // Resumen legible de los pasos (evita enviar JSON crudo con campos internos ruidosos)
  const stepSummary = recordingSteps
    .map((s, i) => {
      const tipo = s.action ?? 'unknown';
      const desc = s.target ?? s.value ?? s.selector ?? '';
      return `${i + 1}. [${tipo}] ${desc}`;
    })
    .join('\n');

  // ── Llamada 1: detectar pasos faltantes (rápida, pocos tokens) ───────────────
  const detectPrompt = `Compara los pasos de una grabación Playwright con el feature Gherkin generado.
Responde SOLO con JSON válido, sin explicaciones ni bloques markdown.

PASOS DE LA GRABACIÓN:
${stepSummary}

FEATURE GHERKIN GENERADO:
${gherkin}

Responde con exactamente este JSON (sin texto adicional):
{"hasMissingSteps": true, "missingSteps": ["descripción breve del paso faltante"]}
o si no faltan pasos:
{"hasMissingSteps": false, "missingSteps": []}`;

  let detection = { hasMissingSteps: false, missingSteps: [] as string[] };

  try {
    const detectRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: detectPrompt }],
      temperature: 0,
      max_tokens: 300,
    });

    const raw = detectRes.choices[0]?.message?.content?.trim() ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      detection = {
        hasMissingSteps: !!parsed.hasMissingSteps,
        missingSteps: Array.isArray(parsed.missingSteps) ? parsed.missingSteps : [],
      };
    } else {
      console.warn('⚠️ [flow-validator] Respuesta de detección no contiene JSON válido');
    }
  } catch (err: any) {
    console.error('⚠️ [flow-validator] Error en detección de pasos faltantes:', err?.message ?? err);
    return SKIP_RESULT;
  }

  if (!detection.hasMissingSteps) {
    console.log('✅ [flow-validator] Feature completo — sin pasos faltantes');
    return { ...detection, correctedFeature: null, skipped: false };
  }

  console.log(`⚠️ [flow-validator] Pasos faltantes: ${detection.missingSteps.join(' | ')}`);

  // ── Llamada 2: corregir el feature (solo si hay pasos faltantes) ─────────────
  let correctedFeature: string | null = null;

  const correctPrompt = `Corrige el siguiente feature Gherkin añadiendo los pasos faltantes indicados.
Responde SOLO con el feature Gherkin corregido completo, sin explicaciones ni bloques markdown.

FEATURE ORIGINAL:
${gherkin}

PASOS FALTANTES A INCLUIR:
${detection.missingSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

  try {
    const correctRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: correctPrompt }],
      temperature: 0,
      max_tokens: 2_000,
    });

    correctedFeature = correctRes.choices[0]?.message?.content?.trim() ?? null;
  } catch (err: any) {
    console.error('⚠️ [flow-validator] Error al generar feature corregido:', err?.message ?? err);
  }

  // ── Escribir a disco si se proporcionó la ruta ────────────────────────────────
  if (correctedFeature && featurePath) {
    try {
      fs.writeFileSync(featurePath, correctedFeature, 'utf-8');
      console.log(`✅ [flow-validator] Feature corregido escrito en: ${featurePath}`);
    } catch (writeErr: any) {
      console.error('⚠️ [flow-validator] Error escribiendo feature corregido:', writeErr?.message);
    }
  }

  return {
    hasMissingSteps: detection.hasMissingSteps,
    missingSteps: detection.missingSteps,
    correctedFeature,
    skipped: false,
  };
}
