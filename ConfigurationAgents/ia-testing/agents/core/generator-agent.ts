import fs from "fs";
import path from "path";
import { ensureDir } from "../../utils/fs-utils";
import { detectIntent } from './intent-detector';
import { normalizeActions } from '../core/action-normalizer';
import { Action } from '../../types/action.types';
import { resolveDataConflicts } from './data-resolver.agent';

// ─── Rutas centralizadas (evita hardcodeos dispersos) ─────────────────────────
const FEATURES_DIR = path.join(process.cwd(), 'GenerateTest', 'features');
const STEPS_DIR    = path.join(process.cwd(), 'GenerateTest', 'steps');

// ─── buildFeature ─────────────────────────────────────────────────────────────

export async function buildFeature(name: string, rawActions: Action[]): Promise<string> {
  let actions: Action[] = normalizeActions(rawActions);
  console.log(`📊 buildFeature: acciones normalizadas: ${actions.length}`);

  try {
    actions = await resolveDataConflicts(actions);
    console.log('✅ Data conflicts resolved');
  } catch (err) {
    console.warn('⚠️ Error en data resolver, continuando sin resolver:', err);
  }

  // Eliminar selects duplicados consecutivos
  // Acepta tanto 'select' (parser antiguo) como 'select_option' (detectIntent)
  const uniqueActions: Action[] = [];
  let lastSelectTarget: string | null = null;
  let lastSelectValue: string | null = null;

  for (const action of actions) {
    const isSelect = action.action === 'select' || action.action === 'select_option';
    if (isSelect) {
      const target = action.target || '';
      const value  = action.value  || '';
      if (lastSelectTarget === target && lastSelectValue === value) {
        console.log(`⚠️ Duplicado select ignorado: ${target} = ${value}`);
        continue;
      }
      lastSelectTarget = target;
      lastSelectValue  = value;
    }
    uniqueActions.push(action);
  }
  actions = uniqueActions;
  console.log(`📊 buildFeature: después de eliminar duplicados: ${actions.length} acciones`);

  const steps: string[] = [];

  for (const action of actions) {
    const intent = detectIntent(action);
    const target = action.target || 'elemento';
    const value  = action.value  || '';

    // Captura selects con cualquiera de los dos tipos posibles
    if (action.action === 'select' || action.action === 'select_option') {
      steps.push(`And selecciona "${value}" en "${target}"`);
      continue;
    }

    if (!value && intent !== 'click_button' && intent !== 'navigate') continue;

    switch (intent) {
      case 'input_user':
        steps.push(`When el usuario ingresa "${value}" en "${target}"`);
        break;
      case 'input_password':
        steps.push(`And ingresa "${value}" en "${target}"`);
        break;
      case 'navigate': {
        const isRealUrl = target.startsWith('http') || target.startsWith('/') ||
                          target.includes('.com') || target.includes('localhost');
        if (isRealUrl) steps.push(`When navega a "${target}"`);
        else           steps.push(`And hace clic en "${target}"`);
        break;
      }
      case 'input_text':
        steps.push(`And completa "${target}" con "${value}"`);
        break;
      case 'click_button':
        steps.push(`And hace clic en "${target}"`);
        break;
    }
  }

  // Eliminar pasos duplicados consecutivos
  const uniqueSteps: string[] = [];
  let lastStep = '';
  for (const step of steps) {
    if (step !== lastStep) {
      uniqueSteps.push(step);
      lastStep = step;
    }
  }

  return `
Feature: ${name}

Scenario: Flujo ${name}
  Given el usuario está en la aplicación
  ${uniqueSteps.join('\n  ')}
  Then la página está disponible sin errores
`;
}

// ─── Common steps (transversal) ───────────────────────────────────────────────

/**
 * Retorna true si el paso debe ir a common.steps.ts en lugar del archivo por-suite.
 * Un paso es "común" cuando su implementación es idéntica para cualquier suite:
 *   • pasos de inicio/cierre fijos
 *   • pasos Then (siempre la misma aserción body+URL)
 *   • pasos When/And con keywords conocidos que delegan en smartActions
 */
function isCommonStep(stepKey: string, rawStep: string): boolean {
  const FIXED = new Set([
    'el usuario está en la aplicación',
    'la página está disponible sin errores',
    'page_load',
    'verify',
  ]);
  if (FIXED.has(stepKey)) return true;
  // Then steps only son comunes si coinciden exactamente con un patrón fijo
  // (los Then específicos de suite, como verificaciones de negocio, NO son comunes)
  if (rawStep.startsWith('When') || rawStep.startsWith('And') || rawStep.startsWith('Given')) {
    return (
      rawStep.includes('selecciona') ||
      rawStep.includes('ingresa')    ||
      rawStep.includes('completa')   ||
      rawStep.includes('clic')       ||
      rawStep.includes('navega')
    );
  }
  return false;
}

/** Escribe GenerateTest/steps/common.steps.ts con todos los pasos genéricos.
 *  Respeta "// CUSTOMIZADO" en la primera línea para no sobreescribir ediciones. */
function writeCommonStepsFile(stepsDir: string): void {
  const filePath = path.join(stepsDir, 'common.steps.ts');
  if (fs.existsSync(filePath)) {
    const firstLine = fs.readFileSync(filePath, 'utf-8').split('\n')[0] ?? '';
    if (firstLine.includes('CUSTOMIZADO')) return;
  }
  const content = `// AUTO-GENERADO — agrega "// CUSTOMIZADO" en esta línea para proteger el archivo de sobreescrituras.
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { smartClick, smartFill, smartSelect } from '@utils/smart-actions';

const { Given, When, Then } = createBdd();

// ── Inicio de sesión / estado inicial ─────────────────────────────────────────
Given('el usuario está en la aplicación', async ({ page }) => {
  // La navegación inicial la realiza smartGoto en el spec generado.
});

// ── Clicks genéricos ──────────────────────────────────────────────────────────
When('hace clic en {string}', async ({ page }, target: string) => {
  await smartClick(page, target);
});

// ── Fill / entrada de datos ───────────────────────────────────────────────────
When('el usuario ingresa {string} en {string}', async ({ page }, value: string, target: string) => {
  await smartFill(page, target, value);
});

When('ingresa {string} en {string}', async ({ page }, value: string, target: string) => {
  await smartFill(page, target, value);
});

When('completa {string} con {string}', async ({ page }, value: string, target: string) => {
  await smartFill(page, target, value);
});

// ── Select ────────────────────────────────────────────────────────────────────
When('selecciona {string} en {string}', async ({ page }, value: string, target: string) => {
  await smartSelect(page, target, value);
});

// ── Navegación ────────────────────────────────────────────────────────────────
When('navega a {string}', async ({ page }, target: string) => {
  const isUrl = target.startsWith('http') || target.startsWith('/') ||
                target.includes('.com')    || target.includes('localhost');
  if (isUrl) { await page.goto(target); } else { await smartClick(page, target); }
});

// ── Pasos emitidos por el validador de flujo (sin acción en el spec) ──────────
When('page_load', async () => {});
When('verify',    async () => {});

// ── Verificación final ────────────────────────────────────────────────────────
Then('la página está disponible sin errores', async ({ page }) => {
  await expect(page.locator('body')).toBeVisible();
  await expect(page).not.toHaveURL(/error|exception|not-found|404/i);
});
`;
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`📄 common.steps.ts actualizado: ${filePath}`);
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function extractStepsFromGherkin(gherkin: string): string[] {
  return gherkin
    .split('\n')
    .map(l => l.trim())
    .filter(l =>
      l.startsWith('Given') ||
      l.startsWith('When')  ||
      l.startsWith('Then')  ||
      l.startsWith('And')
    );
}

function normalizeStep(step: string): string {
  return step
    .replace(/^Given |^When |^Then |^And /, '')
    .replace(/"([^"]*)"/g, '{string}')
    .trim();
}

// ─── generateStepsFromGherkin ─────────────────────────────────────────────────

/**
 * Genera un archivo de steps POR SUITE (<name>.steps.ts) en GenerateTest/steps/.
 * Se sobreescribe en cada ejecución para mantenerse sincronizado con el feature,
 * evitando colisiones de keys entre suites distintas.
 */
export async function generateStepsFromGherkin(name: string, gherkin: string): Promise<void> {
  ensureDir(STEPS_DIR);

  // Garantizar que common.steps.ts existe con todos los pasos genéricos compartidos.
  // Esto evita "Multiple definitions" en playwright-bdd cuando hay varias suites.
  writeCommonStepsFile(STEPS_DIR);

  // Archivo por suite — solo pasos ÚNICOS de esta suite (los comunes van a common.steps.ts)
  const stepsFile = path.join(STEPS_DIR, `${name}.steps.ts`);

  // Excluir pasos de API (ya en api-generated.steps.ts) y pasos comunes (ya en common.steps.ts)
  const API_STEP_PATTERNS = [
    'servicio REST', 'servicio SOAP', 'ejecuto la petición',
    'la respuesta debe', 'con acción', 'endpoint con error', 'datos inválidos',
  ];
  const isApiStep = (step: string) => API_STEP_PATTERNS.some(p => step.includes(p));

  const allStepsSet = new Set<string>();
  extractStepsFromGherkin(gherkin)
    .filter(s => !isApiStep(s))
    .filter(s => !isCommonStep(normalizeStep(s), s))   // ← excluir comunes
    .forEach(s => allStepsSet.add(s));

  // Mapa de patrón → implementación (solo pasos suite-específicos)
  const stepImplementations = new Map<string, string>();

  for (const step of allStepsSet) {
    const stepKey = normalizeStep(step);

    if (step.startsWith('Given')) {
      stepImplementations.set(stepKey, `
Given('${stepKey}', async ({ page }) => {
  console.log('✅ Given ejecutado: ${step}');
});
`);
    } else if (step.startsWith('Then')) {
      stepImplementations.set(stepKey, `
Then('${stepKey}', async ({ page }) => {
  await expect(page.locator('body')).toBeVisible();
  await expect(page).not.toHaveURL(/error|exception|not-found|404/i);
});
`);
    } else {
      // Stub suite-específico — texto único de esta suite, implementación pendiente
      stepImplementations.set(stepKey, `
When('${stepKey}', async ({ page }, ...args) => {
  // TODO: implementar paso específico de la suite "${name}"
  console.log('⚠️ Step pendiente:', '${step}', args);
});
`);
    }
  }

  // Si no hay pasos únicos, el archivo por-suite solo tiene el header (válido y vacío)
  let content = `import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd();
// Pasos genéricos en: common.steps.ts
// Pasos de API en:    api-generated.steps.ts

`;

  for (const impl of stepImplementations.values()) {
    content += impl;
  }

  fs.writeFileSync(stepsFile, content, 'utf-8');
  console.log(`📄 Steps generados para suite "${name}" (${stepImplementations.size} definiciones): ${stepsFile}`);
}
