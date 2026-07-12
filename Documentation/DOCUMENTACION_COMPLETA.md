# Documentación Técnica Completa — Playwright Enterprise Template

> Framework de automatización empresarial que graba un flujo web una sola vez y genera automáticamente, mediante agentes de IA, pruebas de UI, API (REST/SOAP), Performance, Accesibilidad, Seguridad, Visual y No Funcionales (carga/estrés). Este documento describe **toda** la arquitectura del proyecto y, en su Sección 9, explica **sin ambigüedad y con ejemplos reales** dónde y cómo modificar cada tipo de prueba.

**Última verificación de este documento:** contra el estado real del código en disco (líneas citadas exactas). Si el código cambia, las citas de línea pueden desactualizarse — la ruta de archivo siempre es la referencia definitiva.

---

## Índice

1. [Propósito y alcance](#1-propósito-y-alcance)
2. [Requisitos e instalación](#2-requisitos-e-instalación)
3. [Flujo de trabajo end-to-end](#3-flujo-de-trabajo-end-to-end)
4. [Arquitectura del proyecto](#4-arquitectura-del-proyecto)
5. [Estructura completa de carpetas](#5-estructura-completa-de-carpetas)
6. [Comandos npm (referencia completa)](#6-comandos-npm-referencia-completa)
7. [Variables de entorno (referencia completa)](#7-variables-de-entorno-referencia-completa)
8. [Guía paso a paso: de la grabación a la suite ejecutándose](#8-guía-paso-a-paso-de-la-grabación-a-la-suite-ejecutándose)
9. [⭐ Guía de configuración de cada tipo de prueba](#9-guía-de-configuración-de-cada-tipo-de-prueba)
10. [Integración continua (GitHub Actions)](#10-integración-continua-github-actions)
11. [Solución de problemas](#11-solución-de-problemas)
12. [Glosario](#12-glosario)
13. [Notas de auditoría del repositorio](#13-notas-de-auditoría-del-repositorio)

---

## 1. Propósito y alcance

Este proyecto resuelve un problema concreto: **una sola grabación de un flujo web produce automáticamente un conjunto completo de pruebas de calidad**, sin que la persona que graba necesite saber programar ni conocer Playwright.

A partir de `BoxRecordings/recordings/<Suite>.ts` (una grabación cruda de Playwright Codegen), el comando `npm run generate` produce:

| Tipo de prueba | Qué responde |
|---|---|
| **UI** | ¿El flujo funciona igual que cuando se grabó, en Chromium, Firefox y WebKit? |
| **API (REST/SOAP)** | ¿Los endpoints que la aplicación llamó durante la grabación siguen respondiendo correctamente? |
| **Performance** | ¿La página carga dentro de un presupuesto de tiempo? ¿Cumple los Core Web Vitals (LCP, CLS, TBT)? |
| **Accessibility** | ¿La página tiene violaciones WCAG 2.1 AA (axe-core)? |
| **Security** | ¿Tiene los headers de seguridad correctos? ¿Es vulnerable a XSS, SQL injection, fuerza bruta? ¿Fuerza HTTPS? |
| **Visual** | ¿La interfaz se ve igual que en la última ejecución aprobada (comparación de capturas)? |
| **Non-Functional** | ¿Cómo se comporta el servicio bajo carga incremental o picos de tráfico? (estilo JMeter, con proyección estadística de saturación) |
| **BDD** | El mismo flujo, expresado en Gherkin (`.feature`) legible por negocio |

Todo el resultado converge en **un único reporte HTML de Playwright**, agrupado por suite y tipo de prueba.

---

## 2. Requisitos e instalación

| Requisito | Detalle |
|---|---|
| Node.js | 18+ (el pipeline de CI usa Node 24) |
| npm | incluido con Node |
| Git | recomendado para clonar y versionar |
| OpenAI API Key | **opcional** — habilita el healing avanzado por IA y algunas generaciones asistidas. Sin ella, el framework funciona igual con sus capas de healing local. |

```bash
# 1. Instalar dependencias (usar siempre npm ci, no npm install — ver CLAUDE.md)
npm ci

# 2. Instalar navegadores de Playwright
npx playwright install --with-deps

# 3. (Opcional) crear .env para habilitar IA
cp .env-example .env
# y editar OPENAI_API_KEY=sk-...
```

El proyecto ya trae `.env-example` en la raíz como plantilla (`OPENAI_API_KEY=""`).

---

## 3. Flujo de trabajo end-to-end

```
 1. GRABAR                 2. (opcional) API MANUAL      3. (opcional) NO FUNCIONALES
 npm run record <Nombre>   GenerateTest/                 GenerateTest/non-functional/
    │                      api-testing-rest-soap/        config/nf-config.ts
    │                      rest/  soap/
    ▼
 BoxRecordings/recordings/<Nombre>.ts
    │
    ▼  npm run generate  (motor de agentes IA)
 GenerateTest/tests/<Nombre>/
    ├── ui/            ├── api/           ├── performance/
    ├── accessibility/ ├── security/      ├── visual/
    └── non-functional/ (tras npm run generate:nf)
    │
    ▼  npx playwright test   (o  npm run test  para el flujo completo)
 playwright-report/  +  test-results/  +  reports/<Suite>/
    │
    ▼
 npx playwright show-report
```

`npm run test` encadena: `generate` → `bdd` → ejecución por suite (`split-reports.js`) → `generate:api` (tests API desde tráfico capturado) → `portal` (portal HTML) → `heal:specs` (aplica selectores curados de vuelta a los specs).

---

## 4. Arquitectura del proyecto

### 4.1 Vista general

El proyecto tiene tres grandes zonas, cada una con una responsabilidad distinta:

| Zona | Carpeta | Se edita a mano? |
|---|---|---|
| **Motor de agentes IA** | `ConfigurationAgents/ia-testing/` | No — es el "compilador" que genera los tests |
| **Infraestructura compartida de ejecución** | `ConfigurationTest/tests/` | Sí — utilidades reutilizadas por todos los tests generados |
| **Tests generados / suites** | `GenerateTest/` | Depende del subtipo (ver Sección 9) |

### 4.2 Motor de agentes IA (`ConfigurationAgents/ia-testing/`)

#### 4.2.1 Núcleo — `agents/core/`

Estos archivos son el "cerebro" que transforma una grabación cruda en pasos normalizados, corrige el flujo y sana selectores rotos. **No se editan para configurar un test puntual** — solo si se quiere cambiar el comportamiento general del framework.

| Archivo | Responsabilidad | Función principal |
|---|---|---|
| `action-normalizer.ts` | Normaliza acciones crudas a un formato `Action[]` canónico | `normalizeActions(rawActions)` (línea 24) |
| `recorder/recorder-parser-agent.ts` | Parsea el `.ts` de Playwright Codegen a `Action[]` (920 líneas) | `parseRecording(filePath)` (línea 373) |
| `intent-detector.ts` | Clasifica la intención semántica de cada acción (ej. detecta si un campo es de contraseña) | `detectIntent(action)` (línea 3) |
| `smart-flow-engine.ts` | Enriquece pasos con contexto semántico de flujo (ej. clicks de menú vs. clicks de confirmación) | `enhanceFlow(steps)` (línea 84) |
| `selector-engine.ts` | Construye locators robustos por rol semántico, en 5 idiomas | `SelectorEngine.build(page, label)` (línea 104) |
| `data-resolver.agent.ts` | Resuelve valores duplicados en campos `select` vía IA | `resolveDataConflicts(actions)` (línea 16) |
| `assertion-engine.ts` | Genera `expect()` adicionales vía OpenAI (gpt-4o-mini, `temperature: 0.2`) | `generateAssertions(steps)` (línea 20) |
| `flow-validator.ts` | Valida que el `.feature` Gherkin cubra realmente los pasos grabados, corrige si no | `validateFlow(recordingSteps, gherkin, featurePath?)` (línea 108) |
| `flow-healer.ts` | Recupera un flujo cuando un paso falla en tiempo de generación (recarga + acción restringida por whitelist) | `healFlow(page, failedStep, context)` (línea 52) |
| `generator-agent.ts` | Construye el `.feature` Gherkin y los `steps.ts` de BDD | `buildFeature()` (línea 15), `generateStepsFromGherkin()` (línea 230) |
| `captcha-handler.ts` / `captcha-solver.ts` | Detecta (Turnstile / hCaptcha / reCAPTCHA) y resuelve captchas vía servicio externo durante la grabación | `handleCaptchaIfPresent` (línea 46) |
| `learning-store.ts` | Único punto de lectura/escritura de `learning-db.json` | `learningStore` (singleton, línea 177) |
| `healer-agents.ts` (830 líneas) | Motor de self-healing en tiempo de ejecución — el más grande del proyecto | `healSelector(page, originalSelector, action, value?)` (línea 660) |

> **Nota de diseño importante:** `learning-db.json` (clave: `url|action|targetText`, ver `learning-store.ts:51`) y `healer-db.json` (usado solo por `healer-agents.ts`) son **dos cachés independientes**. La primera aprende qué selector funcionó mejor para una URL+acción+texto; la segunda cachea la reparación puntual de un selector roto. Ambos son auto-generados — no se editan a mano.

#### 4.2.2 Generadores — `agents/generators/`

Estos son los archivos que **literalmente escriben el código** de cada tipo de prueba (excepto API). Son la pieza más relevante de este documento porque sus plantillas determinan qué queda "fijo" y qué queda configurable en cada spec generado. Se detallan por completo en la **Sección 9**.

| Archivo | Genera |
|---|---|
| `ui-agent.ts` | `tests/<suite>/ui/<suite>.spec.ts` |
| `performance-agent.ts` | `tests/<suite>/performance/<suite>-performance.spec.ts` |
| `accessibility-agent.ts` | `tests/<suite>/accessibility/<suite>-accessibility.spec.ts` |
| `security-agent.ts` | 3 archivos en `tests/<suite>/security/` |
| `visual-agent.ts` | `tests/<suite>/visual/<suite>-visual.spec.ts` |

#### 4.2.3 Red / API — `agents/network/`

| Archivo | Responsabilidad |
|---|---|
| `network-sniffer.ts` | Captura tráfico real durante la grabación vía el evento `request` de Playwright. Guarda `BoxRecordings/network/<flow>.json` (`{url, method}`). `startNetworkSniffer(page)` línea 9. |
| `api-discovery.agent.ts` | Detecta llamadas `fetch`/`axios`/`xhr`/`ky`/`got`/`$.ajax`/`useSWR`/`useQuery` por regex estático sobre el código grabado, más lo capturado por el sniffer. `discoverApiCalls(recordingPath)` línea 165. |
| `api-test-generator.agent.ts` | Genera el spec de smoke test por endpoint descubierto (no debe dar 404 ni 5xx). `generateApiTests(flowName, apis)` línea 8. |
| `box-api-executor.agent.ts` (691 líneas) | Motor del flujo "pegar un curl y generar el test" — ver Sección 9.3. `processBoxAPIsExecute()` línea 592. |

#### 4.2.4 Utilidades — `ia-testing/utils/`

| Archivo | Responsabilidad |
|---|---|
| `openai-client.ts` | Cliente OpenAI singleton. Valida formato de `OPENAI_API_KEY` (regex `sk-...`), `timeout: 15_000 ms`, `maxRetries: 1`. Si la key falta o es inválida, imprime advertencia (silenciable con `OPENAI_SUPPRESS_WARN=true`) y desactiva el healing por IA sin romper nada. |
| `fs-utils.ts` | `ensureDir()` y utilidades de sistema de archivos usadas por todos los generadores. |
| `selector-builder.ts` / `url-extractor.ts` | Helpers de construcción de selectores y extracción de URLs desde la grabación. |

#### 4.2.5 Orquestador — `ia-testing/scripts/run-agents.ts`

Es el script que ejecuta `npm run generate`. Orden exacto de generación por cada recording encontrado en `BoxRecordings/recordings/` (líneas 226-429):

1. Parsear la grabación → `Action[]` normalizados
2. Generar `.feature` Gherkin + validarlo (`flow-validator`)
3. Generar `steps.ts` de BDD
4. Generar el spec de **UI** (`generateUITest`, línea 362)
5. Descubrir llamadas de **API** en la grabación y generar sus specs (línea 370-383)
6. Extraer `baseURL` y escribir `<Suite>.metadata.json` (línea 407-410)
7. Generar **Performance**, **Accessibility**, **Visual** y **Security** (línea 415-418) — solo si se detectó `baseURL`
8. Detectar y mover tests de API manuales desde `GenerateTest/api-testing-rest-soap/{rest,soap}/` hacia la suite correspondiente, corrigiendo el import (línea 430-494)
9. Procesar `BoxAPIsExecute/` (curl pegados) y generar sus specs (línea 496-506)

Otros scripts relevantes en la misma carpeta:

| Script | Qué hace |
|---|---|
| `split-reports.js` | Ejecuta cada suite de `GenerateTest/tests/` por separado y genera su reporte individual en `reports/<Suite>/`. Variables: `SUITE_TIMEOUT_MS` (default sin límite) y `PARALLEL_SUITES=true` (opt-in). |
| `generate-api-after-run.ts` | Genera tests de API a partir del tráfico HTTP capturado durante la última ejecución. |
| `generate-portal.js` | Lee `test-results/results.xml` y produce `playwright-report/portal.html` con una pestaña por tipo de prueba + `report.csv`. Integra el motor estadístico de no funcionales si está disponible. |
| `generate-reports-index.js` | Genera el índice HTML global de `reports/`. |
| `heal-specs.ts` | Lee `healer-db.json` + `learning-db.json` y reescribe selectores curados con alta confianza directamente en los `*.spec.ts`, solo si son selectores estructurales (`#id`, `[data-testid=...]`, `getByLabel(...)`, etc.). |
| `test-suite.ts` | Ejecuta generación + pruebas de una sola suite (`npm run test:suite`). |
| `start-recorder.ts` | Abre Playwright Codegen para grabar (`npm run record`). |

### 4.3 Infraestructura compartida de ejecución (`ConfigurationTest/tests/`)

Estos archivos **sí se pueden y deben tocar** cuando se quiere cambiar comportamiento transversal (aplica a todas las suites, no a una sola prueba puntual).

| Archivo | Responsabilidad | Parámetros ajustables clave |
|---|---|---|
| `utils/smart-actions.ts` (2042 líneas) | Motor de acciones (`smartClick`, `smartFill`, `smartSelect`, `smartHover`, `smartCheck`, `smartUpload`, `smartDragAndDrop`, `smartScroll`, `smartWaitForText`…) con auto-healing en capas | Ver tabla completa en Sección 9.9 |
| `utils/navigation-helper.ts` | `smartGoto(page, testName)` navega usando el `baseURL` resuelto por `environment.ts`; `attachErrorMonitors(page)` captura errores de consola/red | `waitUntil:'domcontentloaded'` (líneas 86-88), pausa fija `waitForTimeout(1000)` (línea 94) |
| `utils/api-helper.ts` | `restRequest(request, method, url, options?)` y `soapRequest(request, url, xmlBody, soapAction?)` — usados por todos los tests de API manuales | No tiene timeouts/reintentos propios; hereda los de Playwright |
| `utils/test-data-resolver.ts` | Genera datos dinámicos (evita duplicados en selects, genera contraseñas, fechas, teléfonos) | Longitud de contraseña generada: 12 caracteres; rango de fecha futura: 1-365 días; fallback IA `gpt-4o-mini` |
| `utils/modal-handler.ts` | `closeAnyModal(page)`, `waitForOverlayToDisappear(page, timeoutMs=10000)`, `waitForToastMessage(page, expectedText?, timeout=8000)` | Lista `DISMISS_PATTERNS` (selectores de banners/cookies ES/EN) |
| `config/environment.ts` | `resolveBaseUrl()` — resuelve la URL base para **UI y BDD** | Ver orden de prioridad abajo |
| `fixtures/customFixtures.ts` | Extiende `test` de Playwright con el fixture `loginPage` | — |
| `pages/LoginPage.ts` | Page Object de ejemplo (login) | Locators hardcodeados: `getByLabel('Account Number')`, `getByLabel('PIN')`, `getByRole('button',{name:'Login'})` |
| `setup/auth.setup.ts` | Setup de autenticación que guarda `storage/auth.json` para el proyecto `bdd-ui` | Credenciales default: `process.env.USER \|\| 'demo'`, `process.env.PASS \|\| 'demo123'` |

**Resolución de `BASE_URL` para UI y BDD** (`config/environment.ts`, función `resolveBaseUrl()`) — orden de prioridad exacto:

1. Variable de entorno `BASE_URL`, si está definida
2. `baseURL` del primer `*.metadata.json` encontrado en `GenerateTest/`
3. Fallback fijo: `http://localhost:3000`

> Importante: este mecanismo **solo aplica a UI y BDD** (que usan `smartGoto`). Performance, Accessibility, Security y Visual usan un mecanismo distinto y más simple: la URL queda embebida literalmente en el spec generado, con posibilidad de sobreescritura vía `process.env.BASE_URL` (ver Sección 9).

No existe carpeta `hooks/` dentro de `ConfigurationTest/tests/`.

### 4.4 Suites generadas (`GenerateTest/`)

Cada suite vive en `GenerateTest/tests/<NombreSuite>/` con hasta 7 subcarpetas (`ui/`, `api/`, `performance/`, `accessibility/`, `security/`, `visual/`, `non-functional/`) más un archivo `<NombreSuite>.metadata.json` con `{ name, baseURL }`.

Adicionalmente:

- `GenerateTest/features/` y `GenerateTest/steps/` — BDD Gherkin generado
- `GenerateTest/api-testing-rest-soap/{rest,soap}/` — tests de API **100% manuales**, nunca generados por IA (ver Sección 9.3)
- `GenerateTest/non-functional/` — módulo completo de pruebas de carga (ver Sección 9.8)

### 4.5 Auto-healing en capas

Cuando `smartClick` / `smartFill` / `smartSelect` no encuentran el elemento con el selector original, ejecutan esta cadena automáticamente (ver `ConfigurationTest/tests/utils/smart-actions.ts` y `ConfigurationAgents/ia-testing/agents/core/healer-agents.ts`):

| Capa | Mecanismo | Requiere internet/API key |
|---|---|---|
| 1 | `LearningStore` — reusa el selector con mejor histórico para esa URL+acción+texto | No |
| 2 | `SelectorEngine` — 19 estrategias (rol, texto, label, placeholder, testId, shadow DOM…) | No |
| 3 | `healer-agents.ts` — caché (`healer-db.json`) → variantes de texto → atributos estructurales → scroll+reveal | No |
| 4 | Scroll profundo + espera de renderizado lazy (SPAs) | No |
| 5 | OpenAI (gpt-4o-mini) analiza el HTML y propone un nuevo selector | Sí (`OPENAI_API_KEY`) |
| 6 | `ForceReveal` — elimina overlays, force-click, expande collapses de Bootstrap vía JS | No |

---

## 5. Estructura completa de carpetas

```
playwright-enterprise-template_UI_API_Performance3/
│
├── BoxRecordings/
│   ├── recordings/                       ← grabaciones .ts de Playwright Codegen (ENTRADA del sistema)
│   └── network/                          ← tráfico HTTP capturado por network-sniffer.ts
│
├── Box_Example_Apis/
│   ├── example_rest/                     ← ejemplos de referencia de tests REST manuales
│   └── example_soap/                     ← ejemplos de referencia de tests SOAP manuales
│
├── BoxAPIsExecute/                       ← pegar un curl crudo aquí y npm run generate lo convierte en spec
│   ├── REST/{get,post}/
│   └── SOAP/{get,post}/
│
├── ConfigurationAgents/ia-testing/
│   ├── agents/
│   │   ├── core/                         ← parser, selector-engine, healer, learning-store (13 archivos)
│   │   ├── generators/                   ← ui, performance, accessibility, security, visual (agent.ts)
│   │   ├── network/                      ← api-discovery, api-test-generator, box-api-executor, network-sniffer
│   │   └── recorder/                     ← recorder-parser-agent.ts
│   ├── scripts/                          ← run-agents.ts (orquestador) + utilidades de reportes
│   └── utils/                            ← openai-client, fs-utils, selector-builder, url-extractor
│
├── ConfigurationTest/tests/
│   ├── utils/                            ← smart-actions, navigation-helper, api-helper, modal-handler, test-data-resolver
│   ├── pages/                            ← Page Objects
│   ├── fixtures/                         ← customFixtures (loginPage)
│   ├── setup/                            ← auth.setup.ts
│   └── config/                           ← environment.ts (resolución de BASE_URL)
│
├── GenerateTest/
│   ├── features/                         ← .feature Gherkin generados
│   ├── steps/                            ← step definitions generados
│   ├── api-testing-rest-soap/
│   │   ├── rest/                         ← tests REST 100% manuales
│   │   └── soap/                         ← tests SOAP 100% manuales
│   ├── non-functional/
│   │   ├── config/nf-config.ts           ← ÚNICO lugar donde se configuran las pruebas de carga
│   │   ├── core/                         ← http-client, metrics-collector, load-engine
│   │   ├── analysis/statistical-engine.js← regresión logística (proyección de saturación)
│   │   ├── reporters/                    ← summary-reporter (grilla estilo JMeter)
│   │   ├── generator/generate-nf-tests.ts
│   │   └── utils/target-resolver.ts
│   └── tests/
│       └── <NombreSuite>/
│           ├── ui/  ├── api/  ├── performance/  ├── accessibility/
│           ├── security/  ├── visual/  └── non-functional/
│
├── Documentation/                        ← este documento
├── playwright.config.ts                  ← configuración global + proyectos (⚠️ preguntar antes de tocar)
├── package.json                          ← scripts npm
├── tsconfig.json                         ← path aliases @utils, @pages, @config
├── .env-example / .env                   ← variables de entorno
├── learning-db.json                      ← aprendizaje de selectores (auto-generado, no editar)
├── healer-db.json                        ← caché de healing (auto-generado, no editar)
├── playwright-report/  test-results/  reports/  ← salidas de ejecución
└── .github/workflows/playwright.yml      ← pipeline de CI
```

---

## 6. Comandos npm (referencia completa)

| Comando | Qué hace |
|---|---|
| `npm run record <Nombre_Flujo>` | Abre Playwright Codegen para grabar un flujo nuevo |
| `npm run generate` | Genera **todas** las suites (UI, API, Performance, Accessibility, Security, Visual, BDD) desde `BoxRecordings/recordings/` |
| `npm run generate:nf` | Genera los specs de pruebas no funcionales dentro de cada suite, a partir de `nf-config.ts` |
| `npm run generate:api` | Genera tests de API a partir del tráfico capturado en la última ejecución |
| `npm run bdd` | Transpila los `.feature` a specs de Playwright (sin ejecutar) |
| `npm run test` | Flujo completo: `generate` + `bdd` + ejecución por suite + `generate:api` + `portal` + `heal:specs` |
| `npm run test:smoke` | Genera y ejecuta solo tests con tag `@smoke` |
| `npm run test:api` | Genera y ejecuta solo el proyecto `api` |
| `npm run test:suite` | Genera y ejecuta una sola suite |
| `npm run heal:specs` | Aplica selectores curados (de `healer-db.json`/`learning-db.json`) de vuelta a los `*.spec.ts` |
| `npm run portal` | Regenera `playwright-report/portal.html` |
| `npm run reports-index` | Regenera el índice global de `reports/` |
| `npm run report` | Abre el último reporte HTML (`npx playwright show-report`) |
| `npm run pw:record` | Alias directo a `npx playwright codegen` |
| `npm run mcp:server` | Levanta el servidor MCP del proyecto |

Comandos directos de Playwright más usados:

```bash
npx playwright test                                  # todo, sin regenerar
npx playwright test "GenerateTest/tests/<Suite>"      # una suite completa
npx playwright test "GenerateTest/tests/<Suite>/performance"  # un tipo dentro de una suite
npx playwright test --project=performance             # un tipo, todas las suites
npx playwright test --grep "Transferencia"             # filtro por nombre
npx playwright test --ui                               # modo interactivo
npx playwright test --update-snapshots --project=visual  # regenerar baseline visual
```

Proyectos definidos en `playwright.config.ts`: `setup`, `ui-chromium`, `ui-firefox`, `ui-webkit`, `bdd-ui`, `performance`, `visual`, `accessibility`, `api`, `security`, `non-functional`.

---

## 7. Variables de entorno (referencia completa)

Se definen en un archivo `.env` en la raíz del proyecto (usar `.env-example` como plantilla).

| Variable | Usada por | Default si falta | Efecto |
|---|---|---|---|
| `BASE_URL` | `environment.ts` (UI/BDD) + specs de Performance/Accessibility/Security/Visual | metadata.json → `http://localhost:3000` | Sobreescribe la URL objetivo de **todas** las pruebas sin regenerar nada |
| `OPENAI_API_KEY` | `openai-client.ts` y todos los agentes que usan IA | (vacío → IA desactivada) | Habilita healing avanzado (capa 5), matching semántico de suites, generación asistida en `box-api-executor` |
| `OPENAI_SUPPRESS_WARN` | `openai-client.ts` | `false` | `true` silencia la advertencia de "API key no definida" en consola |
| `USER` / `PASS` | `setup/auth.setup.ts` | `demo` / `demo123` | Credenciales usadas por el proyecto `setup` (login para `bdd-ui`) |
| `PERF_BUDGET` | `performance-agent.ts` | `10000` (ms) | Tiempo máximo de carga completa de página |
| `LCP_BUDGET` | `performance-agent.ts` | `4000` (ms) | Presupuesto de Largest Contentful Paint |
| `CLS_BUDGET` | `performance-agent.ts` | `0.25` | Presupuesto de Cumulative Layout Shift |
| `TBT_BUDGET` | `performance-agent.ts` | `600` (ms) | Presupuesto de Total Blocking Time |
| `MAX_RESOURCES` | `performance-agent.ts` | `200` | Máximo de recursos de red cargados |
| `VISUAL_DIFF_RATIO` | `visual-agent.ts` | `0.05` (5%) | Tolerancia de diferencia de píxeles entre screenshots |
| `VISUAL_WAIT_MS` | `visual-agent.ts` | `500` (ms) | Espera adicional post-carga antes de capturar |
| `BRUTE_FORCE_ATTEMPTS` | `security-agent.ts` | `10` | Intentos de login fallidos vía API en el test de fuerza bruta |
| `UI_BRUTE_FORCE_ATTEMPTS` | `security-agent.ts` | `3` | Intentos de login fallidos vía UI |
| `POPUP_TIMEOUT` | `ui-agent.ts` | `30000` (ms) | Timeout de espera de ventanas emergentes (popups) |
| `VERIFY_TIMEOUT` | `ui-agent.ts` | `20000` (ms) | Timeout de `smartWaitForText` en pasos de verificación |
| `FILL_WAIT_MS` | `ui-agent.ts` | `0` (ms) | Pausa fija tras cada `smartFill` |
| `API_TOKEN` / `BEARER_TOKEN` | `api-test-generator.agent.ts` | (vacío) | Header `Authorization: Bearer <token>` en tests de API auto-generados |
| `API_KEY` | `api-test-generator.agent.ts` | (vacío) | Header `x-api-key` en tests de API auto-generados |
| `SUITE_TIMEOUT_MS` | `split-reports.js` | sin límite | Timeout por suite al ejecutar `npm run test` |
| `PARALLEL_SUITES` | `split-reports.js` | `false` | `true` ejecuta las suites en paralelo en lugar de secuencial |

> Estas variables **no requieren volver a ejecutar `npm run generate`** — se leen en tiempo de ejecución de los tests (`process.env.X`). Cámbialas en `.env` o expórtalas antes de correr `npx playwright test`.

---

## 8. Guía paso a paso: de la grabación a la suite ejecutándose

```bash
# 1. Grabar el flujo (convención: NombreApp_Descripcion, sin espacios)
npm run record Homebanking_Transferencias

# 2. (Opcional) Agregar tests de API manuales ANTES de generar,
#    con nombre que empiece igual que el recording:
#    GenerateTest/api-testing-rest-soap/rest/Homebanking_Transferencias_Login_POST.spec.ts

# 3. Generar todas las suites
npm run generate

# 4. (Opcional) Configurar y generar pruebas no funcionales
#    Editar GenerateTest/non-functional/config/nf-config.ts
npm run generate:nf

# 5. Ejecutar
npx playwright test "GenerateTest/tests/Homebanking_Transferencias"

# 6. Ver el reporte
npx playwright show-report
```

---

## 9. Guía de configuración de cada tipo de prueba

> **Esta sección responde, sin ambigüedad, a la pregunta: "quiero cambiar tal parámetro de tal prueba, ¿dónde lo hago?"** Aplica tanto para quien nunca ha programado como para quien ya conoce el proyecto.

### 9.1 Regla de oro — léela antes de tocar cualquier archivo

Existen **dos formas** de configurar un test, y la forma correcta depende de si el generador **sobreescribe** el archivo cada vez que corres `npm run generate`. Esta tabla es la referencia definitiva:

| Tipo de prueba | Archivo generado | ¿`npm run generate` lo sobreescribe? | ¿Cómo se configura correctamente? |
|---|---|---|---|
| **UI** | `tests/<suite>/ui/<suite>.spec.ts` | **Sí, siempre** (sin excepción) | Variables de entorno (`POPUP_TIMEOUT`, `VERIFY_TIMEOUT`, `FILL_WAIT_MS`) o volver a grabar el flujo. **No edites el spec a mano: se pierde en la siguiente generación.** |
| **API (auto-detectada)** | `tests/<suite>/api/<suite>-api.spec.ts` | **Sí, siempre** | Variables de entorno `API_TOKEN`/`API_KEY`. Para casos específicos, usa la API **manual** (ver 9.3). |
| **API (manual)** | `api-testing-rest-soap/{rest,soap}/*.spec.ts` | **No, nunca** — no lo genera IA, lo escribes tú | Se edita directamente, siempre |
| **Performance** | `tests/<suite>/performance/*-performance.spec.ts` | **No** — solo se crea si el archivo **no existe todavía** | Variables de entorno, **o** edición directa del archivo ya generado (persiste) |
| **Accessibility** | `tests/<suite>/accessibility/*-accessibility.spec.ts` | **No** — mismo mecanismo | Edición directa del archivo (tags de axe, selectores excluidos) |
| **Security** | 3 archivos en `tests/<suite>/security/` | **No** — mismo mecanismo, por archivo individual | Variables de entorno (`BRUTE_FORCE_ATTEMPTS`, `UI_BRUTE_FORCE_ATTEMPTS`) o edición directa |
| **Visual** | `tests/<suite>/visual/*-visual.spec.ts` | **No** — mismo mecanismo | Variables de entorno (`VISUAL_DIFF_RATIO`, `VISUAL_WAIT_MS`) o edición directa |
| **Non-Functional** | `tests/<suite>/non-functional/*.nf.spec.ts` | **Sí, siempre** | **Únicamente** editando `GenerateTest/non-functional/config/nf-config.ts` y volviendo a correr `npm run generate:nf`. Nunca edites el `.nf.spec.ts` a mano. |

**Resumen en una frase:** si el tipo de prueba aparece como "No" en la tabla, puedes editar su spec generado directamente sin miedo a perder el cambio. Si aparece como "Sí", usa variables de entorno o edita la fuente (recording / `nf-config.ts`), nunca el spec.

---

### 9.2 UI

**Genera:** `ConfigurationAgents/ia-testing/agents/generators/ui-agent.ts`
**Salida:** `GenerateTest/tests/<Suite>/ui/<Suite>.spec.ts`
**Ejemplo real:** [`GenerateTest/tests/Homebanking_TransferenciasTesting/ui/Homebanking_TransferenciasTesting.spec.ts`](../GenerateTest/tests/Homebanking_TransferenciasTesting/ui/Homebanking_TransferenciasTesting.spec.ts)

El spec de UI se regenera **siempre**, por lo que su única configuración persistente es vía variables de entorno, embebidas así en cada spec generado (`ui-agent.ts:120-123`):

```typescript
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);
```

**¿Cómo cambiar el tiempo de espera de una ventana emergente (popup) a 45 segundos?**

```bash
# en .env
POPUP_TIMEOUT=45000
```

**¿Cómo hacer que un test espere más tiempo tras cada campo de texto (formularios lentos)?**

```bash
FILL_WAIT_MS=300
```

**¿Cómo cambiar el flujo en sí (un click nuevo, un campo distinto)?** Vuelve a grabar con `npm run record <Suite>` (sobrescribe la grabación) y ejecuta `npm run generate` de nuevo. No hay forma soportada de editar el flujo grabado a mano de forma persistente.

La URL de navegación de UI/BDD **no** se embebe literalmente: usa `smartGoto(page, '<Suite>')`, que resuelve la URL vía `ConfigurationTest/tests/config/environment.ts` (env var `BASE_URL` → `metadata.json` de la suite → `http://localhost:3000`).

---

### 9.3 API — tres caminos distintos

Este proyecto tiene **tres mecanismos independientes** para generar tests de API. Elegir el correcto es clave.

#### A) API auto-detectada desde la grabación

**Genera:** `ConfigurationAgents/ia-testing/agents/network/api-test-generator.agent.ts`
**Salida:** `GenerateTest/tests/<Suite>/api/<Suite>-api.spec.ts` — **se sobreescribe siempre**

Durante la grabación, `api-discovery.agent.ts` detecta llamadas `fetch`/`axios`/`xhr` en el código grabado y en el tráfico capturado por `network-sniffer.ts`. Por cada endpoint genera un test de "smoke" (no debe dar 404 ni error 5xx), con reintentos automáticos ante errores de servidor:

```typescript
// api-test-generator.agent.ts:34
test.describe.configure({ retries: 2 }); // reintentar ante 5xx (regla CLAUDE.md #4)
```

**¿Cómo autenticar estos endpoints?**

```bash
# en .env
API_TOKEN=eyJhbGciOi...      # se envía como Authorization: Bearer <token>
# o
API_KEY=miclave123           # se envía como header x-api-key
```

Como este archivo se sobreescribe siempre, **no** es el lugar para escribir aserciones de negocio específicas (ej. "el saldo debe ser exactamente $1500"). Para eso usa el camino B.

#### B) API manual (la forma recomendada para casos de negocio)

**Ubicación:** `GenerateTest/api-testing-rest-soap/rest/` y `GenerateTest/api-testing-rest-soap/soap/`
**Nunca se genera ni se sobreescribe** — es 100% responsabilidad del tester.

**Convención de nombre obligatoria:** debe empezar exactamente igual que el nombre del recording, para que `run-agents.ts` lo detecte y lo mueva a `GenerateTest/tests/<Suite>/api/` corrigiendo automáticamente el import:

```
<NombreSuite>_<DescripcionServicio>_<MÉTODO>.spec.ts
```

Ejemplo real completo (equivalente a `Box_Example_Apis/example_rest/`):

```typescript
// GenerateTest/api-testing-rest-soap/rest/Homebanking_Dashboard_GET.spec.ts
import { test, expect } from '@playwright/test';
import { restRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test('GET /cliente/dashboard - éxito (200)', async ({ request }) => {
  const response = await restRequest(request, 'GET',
    'https://homebanking-demo.onrender.com/cliente/dashboard', {
      headers: { accept: 'application/json' }
    });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
});
```

Ejemplo SOAP real (`Box_Example_Apis/example_soap/`):

```typescript
import { test, expect } from '@playwright/test';
import { soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

const xmlBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tem="http://tempuri.org/">
  <soapenv:Body><tem:Add><tem:intA>5</tem:intA><tem:intB>2</tem:intB></tem:Add></soapenv:Body>
</soapenv:Envelope>`;

test('SOAP Add - éxito (200)', async ({ request }) => {
  const response = await soapRequest(request,
    'http://www.dneonline.com/calculator.asmx', xmlBody, 'http://tempuri.org/Add');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('<AddResult>7</AddResult>');
});
```

> ⚠️ **Nota de estado:** al momento de esta auditoría, las subcarpetas `rest/` y `soap/` descritas arriba **no existen físicamente** en `GenerateTest/api-testing-rest-soap/` (solo existe `graphql/`, vacía). El generador las espera pero no falla si faltan — simplemente omite ese paso en silencio (`run-agents.ts:448`, `if (!fs.existsSync(baseDir)) continue;`). **Créalas manualmente la primera vez que agregues un test de API manual.**

**¿Cómo cambia el request/aserción de un test manual?** Editando directamente el archivo `.spec.ts` — es tuyo, nunca se toca automáticamente.

#### C) API vía "pegar un curl" — `BoxAPIsExecute/`

Para quien no sabe escribir un test de Playwright pero sí sabe copiar un `curl` desde Postman/Swagger/DevTools.

**Cómo se usa:**

1. Pega el comando `curl` (o simplemente `URL` + línea vacía + `body`) en un archivo `.spec.ts` dentro de:
   - `BoxAPIsExecute/REST/get/` o `BoxAPIsExecute/REST/post/` para REST
   - `BoxAPIsExecute/SOAP/get/` o `BoxAPIsExecute/SOAP/post/` para SOAP
2. Ejecuta `npm run generate`.
3. El agente `box-api-executor.agent.ts` detecta el formato, extrae método/URL/headers/body, encuentra a qué suite pertenece (por nombre o, si hay `OPENAI_API_KEY`, por IA) y genera el spec real en `GenerateTest/tests/<Suite>/api/`.

Ejemplo real (`BoxAPIsExecute/REST/get/Homebanking_TransferenciasTesting_REST_GET.spec.ts`):

```
curl -X 'GET' \
'https://homebanking-demo.onrender.com/prestamos/' \
-H 'accept: application/json'
```

Ejemplo real formato URL+body (`BoxAPIsExecute/SOAP/post/Homebanking_TransferenciasTesting_SOAP_POST.spec.ts`):

```
http://www.dneonline.com/calculator.asmx

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
<soapenv:Body><tem:Add><tem:intA>5</tem:intA><tem:intB>2</tem:intB></tem:Add></soapenv:Body>
</soapenv:Envelope>
```

> Nota técnica: `BoxAPIsExecute/` está explícitamente excluido de la compilación TypeScript (`tsconfig.json`, sección `exclude`) — sus archivos son plantillas de texto que el agente parsea como string, no código Playwright real. No importa que "no compilen".

**¿Cuál de los tres caminos uso?**

| Situación | Camino recomendado |
|---|---|
| Solo quiero saber si los endpoints que la app ya usa siguen vivos | A (automático) |
| Necesito validar una regla de negocio específica (montos, mensajes de error exactos) | B (manual) |
| Tengo un curl de Postman y no sé programar | C (`BoxAPIsExecute`) |

---

### 9.4 Performance

**Genera:** `ConfigurationAgents/ia-testing/agents/generators/performance-agent.ts`
**Salida:** `GenerateTest/tests/<Suite>/performance/<Suite>-performance.spec.ts` — **NO se sobreescribe si ya existe**
**Ejemplo real:** [`GenerateTest/tests/Homebanking_TransferenciasTesting/performance/Homebanking_TransferenciasTesting-performance.spec.ts`](../GenerateTest/tests/Homebanking_TransferenciasTesting/performance/Homebanking_TransferenciasTesting-performance.spec.ts)

Valida 3 cosas: tiempo de carga total, Core Web Vitals (LCP/CLS/TBT), y cantidad de recursos de red.

**Opción 1 — sin tocar código, vía variables de entorno** (`performance-agent.ts:22-27`):

```env
PERF_BUDGET=10000      # ms — tiempo máximo de carga completa
LCP_BUDGET=4000        # ms — Largest Contentful Paint
CLS_BUDGET=0.25        # score — Cumulative Layout Shift
TBT_BUDGET=600         # ms — Total Blocking Time
MAX_RESOURCES=200      # cantidad máxima de recursos de red
```

**Opción 2 — edición directa del spec ya generado** (persiste, no se pierde):

```typescript
// GenerateTest/tests/<Suite>/performance/<Suite>-performance.spec.ts

// Cambiar el viewport de medición (por defecto 1280×720):
const VIEWPORT = { width: 1280, height: 720 };   // ← edita aquí

// Cambiar qué tipos de recursos cuentan en el conteo de red:
const COUNTED_TYPES = new Set([
  'document', 'script', 'stylesheet', 'image', 'fetch', 'xhr', 'font',
]);  // ← agrega o quita tipos: 'media', 'websocket', etc.
```

**Ejemplo concreto:** si el equipo decide que el presupuesto de carga debe ser más estricto (5 segundos en vez de 10) solo para la suite `Homebanking_TransferenciasTesting`, sin afectar otras suites:

```typescript
// Dentro del test 'page load time' del archivo ya generado, reemplazar:
const budget = Number(process.env.PERF_BUDGET || 10000);
// por:
const budget = 5000;
```

---

### 9.5 Accessibility

**Genera:** `ConfigurationAgents/ia-testing/agents/generators/accessibility-agent.ts`
**Salida:** `GenerateTest/tests/<Suite>/accessibility/<Suite>-accessibility.spec.ts` — **NO se sobreescribe si ya existe**
**Ejemplo real:** [`GenerateTest/tests/Homebanking_TransferenciasTesting/accessibility/Homebanking_TransferenciasTesting-accessibility.spec.ts`](../GenerateTest/tests/Homebanking_TransferenciasTesting/accessibility/Homebanking_TransferenciasTesting-accessibility.spec.ts)

Usa `@axe-core/playwright` contra las reglas WCAG 2.1 AA. No tiene variables de entorno — toda su configuración se hace editando directamente el archivo ya generado (seguro, no se pierde):

```typescript
// Cambiar el estándar de accesibilidad evaluado (por defecto wcag2a + wcag2aa + wcag21aa):
let builder = new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);   // ← agrega 'wcag22aa', 'best-practice', etc.

// Excluir elementos que generan falsos positivos (widgets de terceros, iframes de chat, etc.):
const EXCLUDE_SELECTORS = [
  '[id*="cookie"]', '[class*="cookie"]',
  '[id*="chat"]',   '[class*="chat"]',
  '[id*="widget"]', '[class*="widget"]',
  'iframe',
];   // ← agrega selectores propios, ej: '[id*="recaptcha"]'

// Cambiar la severidad que hace fallar el test (por defecto: critical y serious):
expect(critical.length, `...`).toBe(0);
expect(serious.length,  `...`).toBe(0);
// Para exigir también cero violaciones "moderate", agrega:
// expect(moderate.length, `...`).toBe(0);
```

**Ejemplo concreto:** si la aplicación tiene un widget de chat de terceros con contraste insuficiente que no se puede arreglar (no es código propio), agrégalo a `EXCLUDE_SELECTORS` para que deje de generar falsos positivos:

```typescript
const EXCLUDE_SELECTORS = [
  '[id*="cookie"]', '[class*="cookie"]',
  '[id*="chat"]',   '[class*="chat"]',
  '[id*="widget"]', '[class*="widget"]',
  'iframe',
  '[id*="zendesk"]',   // ← nuevo, agregado a mano
];
```

---

### 9.6 Security

**Genera:** `ConfigurationAgents/ia-testing/agents/generators/security-agent.ts`
**Salida:** 3 archivos independientes en `GenerateTest/tests/<Suite>/security/` — **ninguno se sobreescribe si ya existe**

| Archivo | Qué valida |
|---|---|
| `<Suite>-security.spec.ts` | Headers de seguridad, SQL injection, XSS |
| `<Suite>-https-enforcement.spec.ts` | Uso de HTTPS, redirect HTTP→HTTPS, header HSTS |
| `<Suite>-authentication-bruteforce.spec.ts` | Protección contra fuerza bruta (API + UI), no enumeración de usuarios |

**Ejemplo real:** [`.../security/Homebanking_TransferenciasTesting-authentication-bruteforce.spec.ts`](../GenerateTest/tests/Homebanking_TransferenciasTesting/security/Homebanking_TransferenciasTesting-authentication-bruteforce.spec.ts)

**Opción 1 — variables de entorno** (solo el archivo de fuerza bruta, `security-agent.ts:222-223`):

```env
BRUTE_FORCE_ATTEMPTS=10       # intentos fallidos vía API antes de exigir bloqueo
UI_BRUTE_FORCE_ATTEMPTS=3     # intentos fallidos vía formulario UI
```

**Opción 2 — edición directa:**

```typescript
// <Suite>-security.spec.ts — agregar/quitar headers obligatorios:
expect(h['x-content-type-options'],
  'x-content-type-options debe ser "nosniff"').toBe('nosniff');
expect(h['x-frame-options'],
  'x-frame-options debe estar presente').toBeTruthy();
// ← agrega aquí, por ejemplo:
// expect(h['content-security-policy'], 'CSP debe estar presente').toBeTruthy();

// <Suite>-security.spec.ts — cambiar el payload de XSS probado:
const payload = "<script>alert('xss')</script>";   // ← reemplaza por otro payload si el equipo de seguridad lo pide
```

**Ejemplo concreto:** si el equipo de seguridad exige validar también el header `Content-Security-Policy` como obligatorio (hoy es solo informativo, líneas 80-85 del generador), edita el spec ya generado y agrega la aserción real como se muestra arriba — el archivo no se va a sobreescribir en la siguiente `npm run generate`.

---

### 9.7 Visual

**Genera:** `ConfigurationAgents/ia-testing/agents/generators/visual-agent.ts`
**Salida:** `GenerateTest/tests/<Suite>/visual/<Suite>-visual.spec.ts` — **NO se sobreescribe si ya existe**
**Ejemplo real:** [`GenerateTest/tests/Homebanking_TransferenciasTesting/visual/Homebanking_TransferenciasTesting-visual.spec.ts`](../GenerateTest/tests/Homebanking_TransferenciasTesting/visual/Homebanking_TransferenciasTesting-visual.spec.ts) (con sus capturas base ya guardadas en `-snapshots/`)

Compara capturas de pantalla contra una línea base (desktop 1280×720 y móvil 375×812). La primera ejecución **siempre** debe correrse con `--update-snapshots` para crear la línea base:

```bash
npx playwright test --update-snapshots --project=visual
```

**Opción 1 — variables de entorno** (`visual-agent.ts:21-25`):

```env
VISUAL_DIFF_RATIO=0.05   # tolerancia de diferencia de píxeles (5%) — sube si el SO cambia el anti-aliasing
VISUAL_WAIT_MS=500       # ms de espera adicional tras networkidle antes de capturar
```

**Opción 2 — edición directa:**

```typescript
// Agregar más elementos dinámicos a ocultar antes de capturar (evita falsos positivos):
const STABILITY_CSS = `
  ...
  [class*="carousel"], [class*="banner-rotate"], [class*="slider"],
  [class*="chart"], [class*="graph"], [class*="sparkline"],
  [id*="cookie"], [class*="cookie"], [id*="chat"], [class*="chat"],
  iframe {
    visibility: hidden !important;
  }
`;   // ← agrega tu propio selector, ej: [class*="ad-banner"]

// Agregar un viewport adicional (tablet, por ejemplo):
test('screenshot — tablet 768×1024', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(TARGET_URL);
  await waitForVisualStability(page);
  await expect(page).toHaveScreenshot('${name}-tablet.png', {
    fullPage: true, maxDiffPixelRatio: VISUAL_DIFF_RATIO, animations: 'disabled',
  });
});
```

**Ejemplo concreto:** si la aplicación corre en un servidor donde el renderizado de fuentes tarda más, y las capturas quedan inconsistentes, sube el tiempo de espera:

```env
VISUAL_WAIT_MS=1500
```

---

### 9.8 Non-Functional (carga, estrés y picos)

**Configuración:** `GenerateTest/non-functional/config/nf-config.ts` — **es el único archivo que se edita**, nunca los `.nf.spec.ts` generados (se sobreescriben siempre con `npm run generate:nf`).

**Ejemplo real generado:** [`GenerateTest/tests/Homebanking_TransferenciasTesting/non-functional/Homebanking_TransferenciasTesting.nf.spec.ts`](../GenerateTest/tests/Homebanking_TransferenciasTesting/non-functional/Homebanking_TransferenciasTesting.nf.spec.ts)

#### Los dos tipos de prueba disponibles

| Tipo | Qué simula | Parámetros |
|---|---|---|
| `incremental` | Carga escalonada: los hilos suben linealmente de `initialThreads` a `finalThreads` en `scenarios` pasos | `scenarios`, `initialThreads`, `finalThreads`, `durationPerScenarioSeconds` |
| `spike` | Picos irregulares de tráfico: hilos explícitos por escenario | `threadsPerScenario: number[]`, `durationPerScenarioSeconds: number[]` |

#### Cómo agregar un target nuevo

Edita el array `targets` en `nf-config.ts`:

```typescript
targets: [

  // Un recording ya grabado, con carga incremental
  {
    type: 'recording',
    recording: 'Homebanking_TransferenciasTesting',   // debe coincidir con el nombre del recording
    testType: 'incremental',
    incremental: {
      scenarios: 5,                 // 5 escalones
      initialThreads: 1,            // arranca con 1 usuario virtual
      finalThreads: 5,              // termina con 5 usuarios virtuales
      durationPerScenarioSeconds: 3,
    },
  },

  // Un endpoint de API, con prueba de picos (spike)
  {
    type: 'api',
    apiSpecPath: 'GenerateTest/api-testing-rest-soap/rest/Homebanking_Dashboard_GET.spec.ts',
    endpoint: {
      name: 'Dashboard Cliente',
      method: 'GET',
      url: 'https://homebanking-demo.onrender.com/cliente/dashboard',
      headers: { accept: 'application/json' },
    },
    testType: 'spike',
    spike: {
      threadsPerScenario: [1, 8, 4, 10, 3],
      durationPerScenarioSeconds: [5, 5, 5, 5, 5],
    },
  },

],

assertions: {
  expectedStatusCodes: [200],   // [] = acepta cualquier 2xx/3xx
  expectedResponseText: '',
},
```

Después de editar, **siempre** regenerar:

```bash
npm run generate:nf
```

**¿Cómo cambio solo la duración de un escenario ya configurado?** Localiza el target en `nf-config.ts` por su `recording` o `endpoint.url`, cambia `durationPerScenarioSeconds`, guarda, y corre `npm run generate:nf`. El `.nf.spec.ts` se reescribe automáticamente con el nuevo valor — **no lo edites directamente en el `.nf.spec.ts`, se perderá**.

**¿Cómo interpreto el resultado?** El reporte imprime una grilla estilo JMeter (escenario, hilos, peticiones, tiempo promedio/mín/máx, % de error, TPS) y, si hay suficientes datos, `analysis/statistical-engine.js` ajusta una curva logística (`f(x) = L / (1 + e^(-k(x-x0)))`) para estimar el **punto de quiebre** (`breakpoint`) donde el servicio empieza a saturarse — visible en la pestaña de no funcionales del portal HTML.

**Valores globales por defecto** (se usan si un target no define su propio `incremental`/`spike`, en `nf-config.ts`):

```typescript
testType: 'incremental',
incremental: { scenarios: 3, initialThreads: 10, finalThreads: 50, durationPerScenarioSeconds: 30 },
spike: { threadsPerScenario: [10, 50, 5, 80, 20], durationPerScenarioSeconds: [30, 30, 30, 30, 30] },
```

---

### 9.9 Timeouts y comportamiento de auto-healing (transversal a todas las pruebas de UI)

Estos valores están en `ConfigurationTest/tests/utils/smart-actions.ts` y afectan a **todas** las pruebas de UI y BDD de todas las suites (no son por-suite). Editarlos aquí cambia el comportamiento global:

| Parámetro | Valor por defecto | Línea | Efecto |
|---|---|---|---|
| `maxRetries` en `retryAction` | `2` | `smart-actions.ts:399` | Reintentos globales de toda acción antes de pasar al healing |
| `waitForVisible` timeout general | `10000` ms | `smart-actions.ts:371` | Espera de visibilidad de un elemento |
| Timeout de healing tras fallo | `6000` ms | `smart-actions.ts:788, 917, 1090, 1717, 1822` | Cuánto espera cada capa de healing antes de rendirse |
| `smartWaitForText` default | `15000` ms | `smart-actions.ts:1259` | Timeout de verificación de texto en pantalla |
| `waitForToast` default | `8000` ms | `smart-actions.ts:1994` | Timeout de espera de notificaciones/toasts |
| Healing por IA (`healWithAI`) | modelo `gpt-4o-mini`, `temperature 0.1`, `max_tokens 100` | `smart-actions.ts:538-541` | Configuración del modelo usado en la capa 5 de healing |

> Estos NO tienen variable de entorno — son constantes de código. Cambiarlas requiere editar `smart-actions.ts` directamente y afecta a **todo el proyecto**, no a una suite puntual. Hazlo solo si el equipo decide un ajuste global (ej. "la app es lenta, subir todos los timeouts un 50%").

---

### 9.10 Tabla maestra — todas las variables de entorno por tipo de prueba

| Tipo de prueba | Variables de entorno disponibles |
|---|---|
| UI / BDD | `BASE_URL`, `POPUP_TIMEOUT`, `VERIFY_TIMEOUT`, `FILL_WAIT_MS` |
| API (auto) | `API_TOKEN` / `BEARER_TOKEN`, `API_KEY` |
| API (manual / BoxAPIsExecute) | Ninguna — se edita el spec directamente |
| Performance | `BASE_URL`, `PERF_BUDGET`, `LCP_BUDGET`, `CLS_BUDGET`, `TBT_BUDGET`, `MAX_RESOURCES` |
| Accessibility | `BASE_URL` — el resto se edita directamente en el spec |
| Security | `BASE_URL`, `BRUTE_FORCE_ATTEMPTS`, `UI_BRUTE_FORCE_ATTEMPTS` |
| Visual | `BASE_URL`, `VISUAL_DIFF_RATIO`, `VISUAL_WAIT_MS` |
| Non-Functional | Ninguna — todo se configura en `nf-config.ts` |
| Todo el framework | `OPENAI_API_KEY`, `OPENAI_SUPPRESS_WARN`, `USER`, `PASS`, `SUITE_TIMEOUT_MS`, `PARALLEL_SUITES` |

---

## 10. Integración continua (GitHub Actions)

Pipeline: `.github/workflows/playwright.yml` — dispara en `push`/`pull_request` a `master` y manualmente (`workflow_dispatch`). Usa Node 24.

Orden de ejecución:

1. Checkout + instalación de dependencias y navegadores
2. `npm run generate` + `npm run bdd` (no bloqueantes: `|| true`)
3. Proyecto `setup` (autenticación)
4. Cada tipo de prueba como step independiente (`ui-chromium`, `ui-firefox`, `ui-webkit`, `bdd-ui`, `api`, `performance`, `accessibility`, `visual`, `security`, `non-functional`), cada uno con `continue-on-error: true` y reporter `list,blob`
5. Merge de los reportes blob → HTML + JUnit (`test-results/merged.xml`)
6. Job Summary en Markdown (tabla de resultados por tipo, generada parseando el JUnit con un script Python embebido)
7. Se suben como artifacts `playwright-report/` (14 días de retención) y `test-results/` (7 días)
8. **El pipeline solo falla** si fallan los tipos críticos: **UI (los 3 navegadores), API o Security**. Performance, Accessibility, Visual y Non-Functional son informativos y no rompen el build.

---

## 11. Solución de problemas

| Problema | Causa / solución |
|---|---|
| Un cambio que hice en un spec de Performance/Accessibility/Visual/Security desapareció | Revisa la Sección 9.1 — probablemente borraste el archivo antes de regenerar, o estás editando UI/API-auto (que sí se sobreescriben siempre) |
| `Non-functional: Suite no encontrada` | Ejecuta `npm run generate` **antes** de `npm run generate:nf` |
| `Non-functional: 100% errores` | El endpoint puede requerir autenticación — agrega `Authorization: 'Bearer TOKEN'` en `headers` del target en `nf-config.ts` |
| `Tests de API manuales no aparecen en la suite` | El nombre del `.spec.ts` debe empezar exactamente igual que el nombre del recording |
| Faltan las carpetas `rest/`/`soap/` en `api-testing-rest-soap/` | No existen por defecto en este checkout — créalas manualmente (ver Sección 9.3 y Sección 13) |
| `selector not found` en un test de UI | El healer intenta 6 estrategias automáticas (Sección 4.5). Si persiste, revisa que la grabación capture el elemento y vuelve a ejecutar `npm run generate` |
| Warning `OPENAI_API_KEY no definida` en consola | Es informativo — el framework funciona igual sin IA. Silenciarlo con `OPENAI_SUPPRESS_WARN=true` |
| Falsos positivos en Visual por fuentes/animaciones | Sube `VISUAL_WAIT_MS`, o agrega el selector del elemento dinámico a `STABILITY_CSS` (Sección 9.7) |
| Falsos positivos en Accessibility por widgets de terceros | Agrega el selector a `EXCLUDE_SELECTORS` (Sección 9.5) |
| `BDD: no encuentra steps` | Verifica que `playwright.config.ts` apunte a `GenerateTest/steps/**/*.ts`; ejecuta `npm run bdd` primero |

---

## 12. Glosario

| Término | Significado en este proyecto |
|---|---|
| **Recording** | Grabación cruda de Playwright Codegen (`BoxRecordings/recordings/*.ts`), punto de entrada de todo el sistema |
| **Suite** | Conjunto de todas las pruebas (UI, API, Performance, etc.) generadas a partir de un mismo recording; su nombre es la "llave" que las conecta a todas |
| **Agente** | Módulo de `ConfigurationAgents/ia-testing/agents/` que transforma, genera o repara código automáticamente |
| **Healing / auto-sanado** | Mecanismo que repara un selector roto en tiempo real, sin intervención humana |
| **Budget (presupuesto)** | Umbral máximo aceptable para una métrica de performance (ej. `PERF_BUDGET`) |
| **Breakpoint (punto de quiebre)** | En pruebas no funcionales, el nivel de carga donde el servicio empieza a degradarse, calculado por regresión logística |
| **Target** | En `nf-config.ts`, una URL o endpoint sometido a prueba de carga |
| **Metadata (`<Suite>.metadata.json`)** | Archivo auto-generado con `{name, baseURL}` de cada suite, usado por UI/BDD y por non-functional para resolver la URL |

---

## 13. Notas de auditoría del repositorio

Hallazgos verificados durante la elaboración de este documento, útiles para quien mantenga el proyecto:

1. **Carpetas `rest/` y `soap/` faltantes:** `GenerateTest/api-testing-rest-soap/` solo contiene `graphql/` (vacía) en este checkout. `README.md` y `CLAUDE.md` documentan `rest/` y `soap/` como si existieran. `run-agents.ts` las espera pero no falla si no están (omite el paso en silencio). **Acción sugerida:** crear ambas carpetas antes del primer test de API manual.
2. **Script roto en `package.json`:** el script `generate-api-test` (línea 13) apunta a `ConfigurationAgents/ia-testing/scripts/generate-api-test.ts`, archivo que no existe en el repositorio actual.
3. **`.env` con clave real presente:** el archivo `.env` en la raíz contiene una `OPENAI_API_KEY` con valor real (no solo la plantilla de `.env-example`). Se verificó que `.env` está correctamente listado en `.gitignore` (línea 11), por lo que no se versiona — no requiere acción.

---

*Documento generado a partir de lectura directa del código fuente del proyecto (no de supuestos). Las rutas y números de línea citados corresponden al estado del repositorio en la fecha de esta auditoría.*
