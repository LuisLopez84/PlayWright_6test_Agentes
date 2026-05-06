import fs from 'fs';
import { openai, hasOpenAI } from '../../utils/openai-client';
import { Action } from '../../types/action.types';

// ─── Contrato de retorno ──────────────────────────────────────────────────────

export interface ValidationResult {
  hasMissingSteps: boolean;
  missingSteps: string[];
  correctedFeature: string | null;
  skipped: boolean;
}

// ─── Catálogo canónico ────────────────────────────────────────────────────────
// Estos textos deben coincidir EXACTAMENTE con las definiciones de common.steps.ts.
// NUNCA inyectar texto libre: toda corrección usa únicamente este catálogo.

const CANONICAL_GIVEN  = 'Given el usuario está en la aplicación';
const CANONICAL_LOAD   = 'And page_load';
const CANONICAL_VERIFY = 'And verify';
const CANONICAL_THEN   = 'Then la página está disponible sin errores';

/**
 * Mapea una descripción libre generada por la IA al paso canónico más cercano.
 * Garantiza que el feature nunca contendrá texto sin implementación.
 */
function toCanonical(description: string): string {
  const d = description.toLowerCase();
  if (d.includes('usuario') || d.includes('aplicación') || d.includes('inicio') ||
      d.includes('initial') || d.includes('given')) {
    return CANONICAL_GIVEN;
  }
  if (d.includes('page_load') || d.includes('carga') || d.includes('load') ||
      d.includes('navega') || d.includes('navigation')) {
    return CANONICAL_LOAD;
  }
  if (d === 'verify' || d === 'page_load') {
    return d === 'verify' ? CANONICAL_VERIFY : CANONICAL_LOAD;
  }
  // Cualquier verificación de resultado, éxito o disponibilidad → Then final
  return CANONICAL_THEN;
}

/**
 * Aplica correcciones deterministas al Gherkin usando SOLO pasos canónicos.
 * Garantiza que el feature nunca contendrá pasos sin implementación.
 */
function applyCanonicalCorrections(
  gherkin: string,
  missingDescriptions: string[],
): { corrected: string; addedCount: number } {
  const toInject = new Set<string>();

  // Mapear cada descripción detectada por la IA a un canónico
  for (const desc of missingDescriptions) {
    const canonical = toCanonical(desc);
    const stepText = canonical.replace(/^(Given|When|Then|And) /, '');
    if (!gherkin.includes(stepText)) {
      toInject.add(canonical);
    }
  }

  // Garantizar siempre el Then de cierre
  if (!gherkin.includes('la página está disponible sin errores')) {
    toInject.add(CANONICAL_THEN);
  }

  if (toInject.size === 0) return { corrected: gherkin, addedCount: 0 };

  const lines = gherkin.split('\n').map(l => l.trimEnd());
  let addedCount = 0;

  for (const step of toInject) {
    if (step === CANONICAL_GIVEN) {
      const scenarioIdx = lines.findIndex(l => l.trim().startsWith('Scenario:'));
      if (scenarioIdx >= 0 && !lines[scenarioIdx + 1]?.includes('el usuario está en la aplicación')) {
        lines.splice(scenarioIdx + 1, 0, '  ' + step);
        addedCount++;
      }
    } else if (step.startsWith('Then')) {
      // Solo añadir si no existe ya
      if (!lines.some(l => l.includes('la página está disponible sin errores'))) {
        lines.push('  ' + step);
        addedCount++;
      }
    } else {
      // And page_load / And verify: insertar después del primer Given
      const givenIdx = lines.findIndex(l => l.trim().startsWith('Given'));
      if (givenIdx >= 0) {
        lines.splice(givenIdx + 1, 0, '  ' + step);
        addedCount++;
      }
    }
  }

  return { corrected: lines.join('\n'), addedCount };
}

// ─── Punto de entrada público ─────────────────────────────────────────────────

/**
 * Valida que el Gherkin generado cubra todos los pasos de la grabación.
 *
 * Fase 1 — Determinista (siempre): garantiza Given de apertura y Then de cierre.
 * Fase 2 — IA opcional: detecta pasos faltantes y los mapea al catálogo canónico.
 *           NO realiza segunda llamada a IA para "corregir" con texto libre.
 */
export async function validateFlow(
  recordingSteps: Action[],
  gherkin: string,
  featurePath?: string,
): Promise<ValidationResult> {
  const SKIP_RESULT: ValidationResult = {
    hasMissingSteps: false,
    missingSteps: [],
    correctedFeature: null,
    skipped: true,
  };

  // ── Fase 1: correcciones deterministas (sin IA) ───────────────────────────
  const { corrected: phase1Feature, addedCount: phase1Count } =
    applyCanonicalCorrections(gherkin, []);

  let currentGherkin = phase1Feature;

  if (phase1Count > 0) {
    if (featurePath) {
      try { fs.writeFileSync(featurePath, currentGherkin, 'utf-8'); } catch { /* ignorar */ }
    }
    console.log(`🔧 [flow-validator] ${phase1Count} paso(s) canónico(s) añadido(s) (fase determinista)`);
  }

  // ── Fase 2: detección por IA (solo si está disponible) ───────────────────
  if (!hasOpenAI || !openai) {
    console.log('⚠️ [flow-validator] Sin OPENAI_API_KEY — validación IA omitida');
    return phase1Count > 0
      ? { hasMissingSteps: true, missingSteps: [], correctedFeature: currentGherkin, skipped: false }
      : SKIP_RESULT;
  }

  const stepSummary = recordingSteps
    .map((s, i) => `${i + 1}. [${s.action ?? 'unknown'}] ${s.target ?? s.value ?? s.selector ?? ''}`)
    .join('\n');

  const detectPrompt = `Compara los pasos de una grabación Playwright con el feature Gherkin generado.
Responde SOLO con JSON válido, sin explicaciones ni bloques markdown.

PASOS DE LA GRABACIÓN:
${stepSummary}

FEATURE GHERKIN GENERADO:
${currentGherkin}

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
      console.warn('⚠️ [flow-validator] Respuesta sin JSON válido — omitiendo fase IA');
    }
  } catch (err: any) {
    console.error('⚠️ [flow-validator] Error en detección IA:', err?.message ?? err);
    return {
      hasMissingSteps: phase1Count > 0,
      missingSteps: [],
      correctedFeature: phase1Count > 0 ? currentGherkin : null,
      skipped: false,
    };
  }

  if (!detection.hasMissingSteps) {
    console.log('✅ [flow-validator] Feature completo — sin pasos faltantes');
    return {
      hasMissingSteps: false,
      missingSteps: [],
      correctedFeature: phase1Count > 0 ? currentGherkin : null,
      skipped: false,
    };
  }

  console.log(`⚠️ [flow-validator] Pasos faltantes detectados: ${detection.missingSteps.join(' | ')}`);

  // ── Fase 2b: corrección canónica (SIN segunda llamada a IA) ──────────────
  // Los pasos detectados se mapean al catálogo canónico, nunca texto libre.
  const { corrected: phase2Feature, addedCount: phase2Count } =
    applyCanonicalCorrections(currentGherkin, detection.missingSteps);

  const totalAdded = phase1Count + phase2Count;

  if (phase2Count > 0) {
    currentGherkin = phase2Feature;
    if (featurePath) {
      try {
        fs.writeFileSync(featurePath, currentGherkin, 'utf-8');
        console.log(`✅ [flow-validator] Feature corregido escrito en: ${featurePath}`);
      } catch (writeErr: any) {
        console.error('⚠️ [flow-validator] Error escribiendo feature:', writeErr?.message);
      }
    }
    console.log(`🔧 Feature corregido con ${phase2Count} paso(s) canónico(s) añadido(s)`);
  } else {
    console.log('✅ [flow-validator] Feature ya contiene todos los pasos canónicos necesarios');
  }

  return {
    hasMissingSteps: detection.hasMissingSteps,
    missingSteps: detection.missingSteps,
    correctedFeature: totalAdded > 0 ? currentGherkin : null,
    skipped: false,
  };
}
