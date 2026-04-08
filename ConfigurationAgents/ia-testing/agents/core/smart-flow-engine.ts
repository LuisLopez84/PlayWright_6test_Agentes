export function enhanceFlow(steps: any[]) {

  const enhancedSteps: any[] = [];

  for (let i = 0; i < steps.length; i++) {

    const step = steps[i];
    const prev = steps[i - 1];

    // 🔥 DETECTAR CAMBIO DE CONTEXTO (pantalla)
    if (isNavigationStep(step, prev)) {
      enhancedSteps.push({
        action: "context_change",
        target: step.target || step.url
      });
    }

    // 🔥 DETECTAR MENÚ (como Transferencias)
    if (isMenuClick(step)) {
      enhancedSteps.push({
        action: "navigate_section",
        target: step.target
      });
    }

    // 🔥 DETECTAR FORMULARIO
    if (isFormStep(step)) {
      enhancedSteps.push({
        action: step.action,
        target: step.target,
        value: step.value
      });
    }

    // 🔥 DETECTAR CONFIRMACIONES
    if (isConfirmation(step)) {
      enhancedSteps.push({
        action: "confirm",
        target: step.target
      });
    }

    // fallback
    else {
      enhancedSteps.push(step);
    }
  }

  return enhancedSteps;
}


// ---------------- HELPERS ----------------

function isNavigationStep(step: any, prev: any) {
  return step.action === "page_load" || (!prev && step.action === "click");
}

function isMenuClick(step: any) {
  return step.action === "click" &&
    step.target &&
    step.target.length < 30 &&
    !["Ingresar", "Confirmar"].includes(step.target);
}

function isFormStep(step: any) {
  return step.action === "input" || step.action === "select";
}

function isConfirmation(step: any) {
  return step.target?.toLowerCase().includes("confirmar");
}