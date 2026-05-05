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
    const isSelect = action.type === 'select' || action.type === 'select_option';
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
    if (action.type === 'select' || action.type === 'select_option') {
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

  // Archivo por suite — nunca comparte namespace con otras suites
  const stepsFile = path.join(STEPS_DIR, `${name}.steps.ts`);

  // Recopilar steps: features ya en disco + el feature actual
  const allStepsSet = new Set<string>();

  if (fs.existsSync(FEATURES_DIR)) {
    for (const featureFile of fs.readdirSync(FEATURES_DIR).filter(f => f.endsWith('.feature'))) {
      const content = fs.readFileSync(path.join(FEATURES_DIR, featureFile), 'utf-8');
      extractStepsFromGherkin(content).forEach(s => allStepsSet.add(s));
    }
  }

  // Feature actual (puede no estar en disco todavía si se generó en memoria)
  extractStepsFromGherkin(gherkin).forEach(s => allStepsSet.add(s));

  // Mapa de patrón → implementación
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
      // Assertion real: body visible + URL sin patrones de error
      stepImplementations.set(stepKey, `
Then('${stepKey}', async ({ page }) => {
  await expect(page.locator('body')).toBeVisible();
  await expect(page).not.toHaveURL(/error|exception|not-found|404/i);
});
`);
    } else if (step.startsWith('When') || step.startsWith('And')) {
      if (step.includes('selecciona')) {
        stepImplementations.set(stepKey, `
When('${stepKey}', async ({ page }, value, target) => {
  await smartSelect(page, target, value);
});
`);
      } else if (step.includes('ingresa') || step.includes('completa')) {
        stepImplementations.set(stepKey, `
When('${stepKey}', async ({ page }, value, target) => {
  await smartFill(page, target, value);
});
`);
      } else if (step.includes('clic')) {
        stepImplementations.set(stepKey, `
When('${stepKey}', async ({ page }, target) => {
  await smartClick(page, target);
});
`);
      } else if (step.includes('navega')) {
        stepImplementations.set(stepKey, `
When('${stepKey}', async ({ page }, target) => {
  const isRealUrl = target.startsWith('http') || target.startsWith('/') ||
                    target.includes('.com') || target.includes('localhost');
  if (isRealUrl) {
    await page.goto(target);
  } else {
    await smartClick(page, target);
  }
});
`);
      } else {
        stepImplementations.set(stepKey, `
When('${stepKey}', async ({ page }, ...args) => {
  console.log('⚠️ Step no implementado específicamente:', '${step}', args);
});
`);
      }
    }
  }

  // Usar path aliases de tsconfig (@utils/) para desacoplar de rutas relativas
  let content = `import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { smartClick, smartFill, smartSelect } from '@utils/smart-actions';
import { smartGoto } from '@utils/navigation-helper';

const { Given, When, Then } = createBdd();

`;

  for (const impl of stepImplementations.values()) {
    content += impl;
  }

  fs.writeFileSync(stepsFile, content, 'utf-8');
  console.log(`📄 Steps generados para suite "${name}" (${stepImplementations.size} definiciones): ${stepsFile}`);
}
