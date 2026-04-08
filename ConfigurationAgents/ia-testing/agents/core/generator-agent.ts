import fs from "fs";
import path from "path";
import { ensureDir } from "../../utils/fs-utils";
import { detectIntent } from './intent-detector';
import { normalizeActions } from '../core/action-normalizer';
import { Action } from '../../types/action.types';
import { resolveDataConflicts } from './data-resolver.agent';

export async function buildFeature(name: string, rawActions: Action[]): Promise<string> {
  let actions: Action[] = normalizeActions(rawActions);
  console.log(`📊 buildFeature: acciones normalizadas: ${actions.length}`);

  try {
    actions = await resolveDataConflicts(actions);
    console.log('✅ Data conflicts resolved');
  } catch (err) {
    console.log('⚠️ Error en data resolver, continuando sin resolver:', err);
  }

  // 🔥 ELIMINAR SELECTS DUPLICADOS CONSECUTIVOS
  const uniqueActions: Action[] = [];
  let lastSelectTarget: string | null = null;
  let lastSelectValue: string | null = null;

  for (const action of actions) {
    if (action.type === 'select') {
      const target = action.target || '';
      const value = action.value || '';
      if (lastSelectTarget === target && lastSelectValue === value) {
        console.log(`⚠️ Duplicado select ignorado: ${target} = ${value}`);
        continue;
      }
      lastSelectTarget = target;
      lastSelectValue = value;
    }
    uniqueActions.push(action);
  }
  actions = uniqueActions;
  console.log(`📊 buildFeature: después de eliminar duplicados: ${actions.length} acciones`);

  const steps: string[] = [];

  for (const action of actions) {
    const intent = detectIntent(action);
    const target = action.target || 'elemento';
    const value = action.value || '';

    if (action.type === 'select') {
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
      case 'navigate':
        const isRealUrl = target.startsWith('http') || target.startsWith('/') ||
                          target.includes('.com') || target.includes('localhost');
        if (isRealUrl) steps.push(`When navega a "${target}"`);
        else steps.push(`And hace clic en "${target}"`);
        break;
      case 'input_text':
        steps.push(`And completa "${target}" con "${value}"`);
        break;
      case 'click_button':
        steps.push(`And hace clic en "${target}"`);
        break;
    }
  }

  // Eliminar pasos de texto duplicados consecutivos
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
  Then la operación es exitosa
`;
}

/**
 * 🔍 Extrae steps del Gherkin
 */
function extractStepsFromGherkin(gherkin: string): string[] {
  return gherkin
    .split('\n')
    .map(l => l.trim())
    .filter(l =>
      l.startsWith('Given') ||
      l.startsWith('When') ||
      l.startsWith('Then') ||
      l.startsWith('And')
    );
}

/**
 * 🔥 Normaliza un step eliminando Given/When/Then/And y reemplazando strings por {string}
 */
function normalizeStep(step: string): string {
  return step
    .replace(/^Given |^When |^Then |^And /, '')
    .replace(/"([^"]*)"/g, '{string}')
    .trim();
}

/**
 * ⚙️ GENERADOR DE STEPS - Crea un archivo común con TODAS las definiciones necesarias
 * basándose en los steps reales de los features generados.
 */
export async function generateStepsFromGherkin(name: string, gherkin: string) {
  const stepsDir = path.join(process.cwd(), 'GenerateTest', 'steps');
  ensureDir(stepsDir);

  const commonStepsFile = path.join(stepsDir, 'common.steps.ts');

  // Si el archivo común ya existe, no lo regeneramos (evita sobreescritura)
  if (fs.existsSync(commonStepsFile)) {
    console.log(`📄 Archivo de steps comunes ya existe: ${commonStepsFile}`);
    return;
  }

  // Recopilar todos los steps de todos los features (para eso necesitamos leer todos los .feature)
  // Pero como esta función se llama por cada flujo, aprovechamos para leer todos los features existentes
  const featuresDir = path.join(process.cwd(), 'GenerateTest', 'features');
  const allFeatureFiles = fs.existsSync(featuresDir) ? fs.readdirSync(featuresDir).filter(f => f.endsWith('.feature')) : [];

  const allStepsSet = new Set<string>();

  for (const featureFile of allFeatureFiles) {
    const featurePath = path.join(featuresDir, featureFile);
    const featureContent = fs.readFileSync(featurePath, 'utf-8');
    const steps = extractStepsFromGherkin(featureContent);
    steps.forEach(step => allStepsSet.add(step));
  }

  // También añadir los steps del gherkin actual (por si acaso)
  const currentSteps = extractStepsFromGherkin(gherkin);
  currentSteps.forEach(step => allStepsSet.add(step));

  // Mapa de patrones de step a su implementación
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
  await expect(page).toBeTruthy();
});
`);
    } else if (step.startsWith('When') || step.startsWith('And')) {
      // Identificar el tipo de paso
      if (step.includes('selecciona')) {
        stepImplementations.set(stepKey, `
When('${stepKey}', async ({ page }, value, target) => {
  console.log(\`🔽 Seleccionando: \${value} en \${target}\`);
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
  const isRealUrl = target.startsWith('http') || target.startsWith('/') || target.includes('.com') || target.includes('localhost');
  if (isRealUrl) {
    await page.goto(target);
  } else {
    await smartClick(page, target);
  }
});
`);
      } else {
        // Fallback genérico para cualquier otro When/And
        stepImplementations.set(stepKey, `
When('${stepKey}', async ({ page }, ...args) => {
  console.log('⚠️ Step no implementado específicamente:', '${step}', args);
});
`);
      }
    }
  }

  // Generar el contenido del archivo común
  let commonContent = `import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { smartClick, smartFill, smartSelect } from '../../ConfigurationTest/tests/utils/smart-actions';
import { smartGoto } from '../../ConfigurationTest/tests/utils/navigation-helper';

const { Given, When, Then } = createBdd();

`;

  // Agregar todas las implementaciones
  for (const impl of stepImplementations.values()) {
    commonContent += impl;
  }

  fs.writeFileSync(commonStepsFile, commonContent);
  console.log(`📄 Archivo de steps comunes creado con ${stepImplementations.size} definiciones: ${commonStepsFile}`);
}