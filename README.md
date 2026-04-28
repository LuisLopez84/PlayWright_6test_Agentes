# Playwright Enterprise Automation Framework

> Framework inteligente de automatización inteligente: graba una vez, genera todos los tipos de test automáticamente, se auto-repara con IA y produce reportes HTML integrados.

---

## Contenido

1. [¿Qué hace este framework?](#qué-hace-este-framework)
2. [Requisitos previos](#requisitos-previos)
3. [Instalación](#instalación)
4. [Flujo de trabajo completo](#flujo-de-trabajo-completo)
5. [Grabación de flujos](#1-grabación-de-flujos)
6. [Tests de API (REST y SOAP)](#2-tests-de-api-rest-y-soap)
7. [Tests no funcionales (Concurrencia, Carga, Estres y Picos)](#3-tests-no-funcionales-carga-y-rendimiento)
8. [Generación de suites](#4-generación-de-suites)
9. [Ejecución de tests](#5-ejecución-de-tests)
10. [Reportes](#6-reportes)
11. [Tipos de prueba generados](#tipos-de-prueba-generados)
12. [Arquitectura y agentes IA](#arquitectura-y-agentes-ia)
13. [Auto-healing de 6 capas](#auto-healing-de-6-capas)
14. [Estructura de carpetas](#estructura-de-carpetas)
15. [Scripts de package.json](#scripts-de-packagejson)
16. [Solución de problemas](#solución-de-problemas)

---

## ¿Qué hace este framework?

A partir de una **grabación de Playwright codegen** genera automáticamente:

| Tipo de test | Descripción |
|---|---|
| **UI** | Flujo completo simulando usuario real (Chromium, Firefox, WebKit) |
| **API** | Tests REST y SOAP (200 éxito, 400 datos incorrectos, 404/500 error técnico) |
| **Performance** | Tiempo de carga, Core Web Vitals, performance budget |
| **Accessibility** | Escaneo con axe-core (contraste, ARIA, roles, etiquetas) |
| **Security** | Headers HTTP, XSS, SQL injection, fuerza bruta, HTTPS enforcement |
| **Visual** | Regresión visual por comparación de capturas de pantalla |
| **Non-Functional** | Pruebas de carga estilo JMeter: incremental y spike con métricas TPS |
| **BDD** | Escenarios Gherkin (`.feature`) + step definitions auto-generados por IA |

Todo aparece en un **único reporte HTML de Playwright** agrupado por suite.

---

## Requisitos previos

### Node.js 18+ (incluye npm)

Descarga desde [nodejs.org](https://nodejs.org) — versión **LTS**.

```bash
node -v    # debe mostrar v18 o superior
npm -v
```

### Git (recomendado)

```bash
git --version
```

### OpenAI API Key (opcional)

Habilita el healing avanzado por IA. Sin ella el framework funciona igual (usa las 5 capas de healing local).

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPO>
cd playwright-enterprise-template_UI_API_Performance3

# 2. Instalar dependencias
npm ci

# 3. Instalar navegadores de Playwright
npx playwright install

# 4. (Opcional) Crear archivo .env para IA
echo "OPENAI_API_KEY=tu_api_key_aqui" > .env
```

---

## Flujo de trabajo completo

```
Grabar flujo          Añadir APIs        Configurar NF tests
npm run record   →   (opcional)     →   (opcional)
      ↓
Generar suites         Generar NF        Ejecutar todo
npm run generate  →  npm run generate:nf  →  npm run test
      ↓
npx playwright show-report
```

---

## 1. Grabación de flujos

Abre un navegador con codegen integrado. Realiza el flujo manualmente (login, navegación, formularios). Al cerrar, la grabación se guarda en `BoxRecordings/recordings/`.

```bash
npm run record NombreAplicación_Flujo
```

**Ejemplos:**

```bash
npm run record Homebanking_Transf
npm run record Mercadolibre_test
npm run record DemoQA_Elements_TextBox
```

**Convención de nombre:** `NombreApp_Descripcion` (sin espacios, usando guion bajo).  
El nombre del recording es la **llave** que conecta todos los tipos de test de esa suite.

> La grabación queda en: `BoxRecordings/recordings/NombreAplicación_Flujo.ts`

---

## 2. Tests de API (REST y SOAP)

Los tests de API manuales se ubican en:

```
GenerateTest/api-testing-rest-soap/
├── rest/    ← APIs REST
└── soap/    ← Web Services SOAP
```

**Convención de nombre obligatoria:**

```
NombreRecording_DescripcionServicio_METODO.spec.ts
```

Ejemplos:

```
Homebankink_Transferencias_ConsultaCliente_GET.spec.ts
Homebankink_Transferencias_RealizarTransfer_POST.spec.ts
Homebanking_Transf_Servicio_Operacion_PUT_SOAP.spec.ts
```

> El nombre debe comenzar igual que el recording para que `npm run generate` coloque el spec dentro de la suite correcta.

### Ejemplo REST GET

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

### Ejemplo REST POST

```typescript
// GenerateTest/api-testing-rest-soap/rest/Homebanking_Transferencias_POST.spec.ts
import { test, expect } from '@playwright/test';
import { restRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test('POST /transferencias - éxito (200)', async ({ request }) => {
  const response = await restRequest(request, 'POST',
    'https://homebanking-demo.onrender.com/transferencias/', {
      data: { cuenta_destino: 'ACC002', cuenta_origen: 'ACC001', monto: 1500 },
      headers: { accept: 'application/json', 'Content-Type': 'application/json' }
    });
  expect(response.status()).toBe(200);
  expect(await response.json()).toBeDefined();
});
```

### Ejemplo SOAP

```typescript
// GenerateTest/api-testing-rest-soap/soap/Calculadora_Add_POST.spec.ts
import { test, expect } from '@playwright/test';
import { soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper.js';

const xmlBody = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tem="http://tempuri.org/">
  <soapenv:Body><tem:Add><tem:intA>5</tem:intA><tem:intB>2</tem:intB></tem:Add></soapenv:Body>
</soapenv:Envelope>`;

test('SOAP Add - éxito (200)', async ({ request }) => {
  const response = await soapRequest(request,
    'http://www.dneonline.com/calculator.asmx',
    xmlBody,
    'http://tempuri.org/Add');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('<AddResult>7</AddResult>');
});
```

---

## 3. Tests no funcionales (Carga y Rendimiento)

Configurar en `GenerateTest/non-functional/config/nf-config.ts`.  
Permite definir **un tipo de prueba diferente por cada target** (recording o API).

### Tipos disponibles

| Tipo | Descripción |
|---|---|
| **incremental** | Escalonada: los hilos suben linealmente de `initialThreads` a `finalThreads` en N escenarios |
| **spike** | Picos: hilos explícitos por escenario (`[1, 8, 4, 10, 3]`) para simular cargas irregulares |

### Configuración de ejemplo

```typescript
targets: [

  // Recording con prueba INCREMENTAL
  {
    type: 'recording',
    recording: 'Homebankink_Transferencias',
    testType: 'incremental',
    incremental: {
      scenarios: 3,              // 3 escalones: 2 → 4 → 6 hilos
      initialThreads: 2,
      finalThreads: 6,
      durationPerScenarioSeconds: 30,
    },
  },

  // API con prueba de PICOS (spike)
  {
    type: 'api',
    apiSpecPath: 'GenerateTest/api-testing-rest-soap/rest/Homebankink_Transferencias_ConsultaCliente_GET.spec.ts',
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

### Métricas en el reporte (estilo JMeter)

```
══════════════════════════════════════════════════════════════════
 REPORTE NO FUNCIONAL │ Recording: Homebankink_Transferencias │ ESCALONADA INCREMENTAL
══════════════════════════════════════════════════════════════════
 Escen.  │  Hilos │ Peticiones │ Prom(ms) │ Mín(ms) │ Máx(ms) │ % Error │     TPS
──────────────────────────────────────────────────────────────────
 #1      │      2 │         93 │      108 │      80 │     997 │  0.00 % │   18.32
 #2      │      4 │        238 │       85 │      76 │     338 │  0.00 % │   46.88
 #3      │      6 │        371 │       82 │      76 │     265 │  0.00 % │   73.25
──────────────────────────────────────────────────────────────────
 TOTAL   │      - │        702 │       86 │      76 │     997 │  0.00 % │   46.09
══════════════════════════════════════════════════════════════════
 ✅ RESULTADO: 0% de errores — Prueba EXITOSA
```

---

## 4. Generación de suites

### Generar suites de test (UI, API, Performance, Accessibility, Security, Visual, BDD)

```bash
npm run generate
```

Crea en `GenerateTest/tests/<NombreRecording>/`:

```
NombreRecording/
├── ui/                  ← spec UI (Chromium / Firefox / WebKit)
├── api/                 ← specs REST auto-generados (200, 400, 404/500)
├── performance/         ← Core Web Vitals + performance budget
├── accessibility/       ← axe-core scan
├── security/            ← headers + XSS + SQLi + brute-force
├── visual/              ← screenshot regression
└── non-functional/      ← generado por generate:nf (ver paso siguiente)
```

> Cada suite también genera `NombreRecording.metadata.json` con la `baseURL` extraída del recording.

### Generar specs no funcionales dentro de las suites

```bash
npm run generate:nf
```

Crea `GenerateTest/tests/<Suite>/non-functional/<Suite>.nf.spec.ts` con los parámetros de carga embebidos.  
Si hay múltiples targets para la misma suite (recording + API), se genera **un solo spec** que ejecuta ambas pruebas en secuencia.

> Ejecutar `npm run generate` **antes** de `generate:nf` para que la carpeta de la suite exista.

---

## 5. Ejecución de tests

### Ejecutar todos los tests

```bash
npm run test
```

Equivale a: `generate` + `bdd` + todos los proyectos de Playwright + reportes.

### Ejecutar todos los tests (solo Playwright, sin regenerar)

```bash
npx playwright test
```

### Ejecutar una suite completa

```bash
npx playwright test "GenerateTest/tests/Homebankink_Transferencias"
```

### Ejecutar solo un tipo de test dentro de una suite

```bash
# UI (todos los navegadores)
npx playwright test "GenerateTest/tests/Homebankink_Transferencias/ui"

# Solo en Chromium
npx playwright test "GenerateTest/tests/Homebankink_Transferencias/ui" --project=ui-chromium

# Solo API
npx playwright test "GenerateTest/tests/Homebankink_Transferencias/api"

# Solo Performance
npx playwright test "GenerateTest/tests/Homebankink_Transferencias/performance"

# Solo Accessibility
npx playwright test "GenerateTest/tests/Homebankink_Transferencias/accessibility"

# Solo Security
npx playwright test "GenerateTest/tests/Homebankink_Transferencias/security"

# Solo Visual
npx playwright test "GenerateTest/tests/Homebankink_Transferencias/visual"

# Solo Non-Functional (Carga/Rendimiento)
npx playwright test "GenerateTest/tests/Homebankink_Transferencias/non-functional"
```

### Ejecutar un proyecto específico (todos los tests de ese tipo)

```bash
npx playwright test --project=ui-chromium
npx playwright test --project=ui-firefox
npx playwright test --project=ui-webkit
npx playwright test --project=api
npx playwright test --project=performance
npx playwright test --project=accessibility
npx playwright test --project=security
npx playwright test --project=visual
npx playwright test --project=non-functional
npx playwright test --project=bdd-ui
```

### Ejecutar con filtros avanzados

```bash
# Por nombre del test (expresión regular)
npx playwright test --grep "Transferencia"
npx playwright test --grep "flujo 1|flujo 3|flujo 5"

# Excluir tests por nombre
npx playwright test --grep-invert "Transferencia"

# Detener tras N fallos
npx playwright test --workers=1 --max-failures=5

# Modo interactivo (UI de Playwright)
npx playwright test --ui

# Generar reporte HTML combinado
npx playwright test "GenerateTest/tests" --reporter=html --output=reports/combined
```

---

## 6. Reportes

### Ver el último reporte HTML

```bash
npx playwright show-report
```

Abre un servidor local en `http://localhost:9323` con:
- Todos los tests agrupados por suite y tipo
- Videos, trazas y capturas de pantalla de cada test
- Resultados de non-functional con la grilla JMeter integrada

### Reportes por suite

Después de `npm run test`, cada suite genera su propio reporte en:

```
reports/
├── Homebankink_Transferencias/
│   └── index.html
├── Mercadolibre_test/
│   └── index.html
└── index.html    ← índice global
```

```bash
npm run reports-index   # regenera el índice global
npm run report          # abre el último reporte HTML
```

---

## Tipos de prueba generados

| Tipo | Proyecto Playwright | Ruta generada | Qué valida |
|---|---|---|---|
| UI | `ui-chromium`, `ui-firefox`, `ui-webkit` | `tests/<suite>/ui/` | Flujo completo con smart-actions auto-healing |
| API | `api` | `tests/<suite>/api/` | REST 200/400/404 auto-detectados del tráfico |
| API manual | `api` | `api-testing-rest-soap/rest/` o `soap/` | Endpoints y payloads definidos por el tester |
| Performance | `performance` | `tests/<suite>/performance/` | LCP, FID, CLS, tiempo de carga |
| Accessibility | `accessibility` | `tests/<suite>/accessibility/` | axe-core WCAG 2.1 AA |
| Security | `security` | `tests/<suite>/security/` | Headers, XSS, SQLi, brute-force, HTTPS |
| Visual | `visual` | `tests/<suite>/visual/` | Screenshot diff pixel-by-pixel |
| Non-Functional | `non-functional` | `tests/<suite>/non-functional/` | Carga incremental y spike estilo JMeter |
| BDD | `bdd-ui` | `features/` + `steps/` | Escenarios Gherkin con login compartido |

---

## Arquitectura y agentes IA

```
BoxRecordings/recordings/<Suite>.ts   ← grabación raw (Playwright codegen)
        │
        ▼  npm run generate
ConfigurationAgents/ia-testing/
  agents/
    core/         ← parser, selector-engine, healer, learning-store
    generators/   ← ui-agent, performance-agent, accessibility-agent,
    │               security-agent, visual-agent
    network/      ← api-discovery, api-test-generator
    recorder/     ← recorder-parser-agent (normaliza steps)
  scripts/
    run-agents.ts ← orquestador principal
        │
        ▼
GenerateTest/tests/<Suite>/
  ui/ api/ performance/ accessibility/ security/ visual/ non-functional/
```

| Agente | Función |
|---|---|
| **recorder-parser** | Parsea el `.ts` de codegen y normaliza steps (click, fill, select, hover, drag, iframe, press_key) |
| **ui-agent** | Genera `spec.ts` usando `smartClick`, `smartFill`, `smartSelect`, `smartHover`, etc. |
| **performance-agent** | Genera spec con Core Web Vitals y performance budget |
| **accessibility-agent** | Genera spec con escaneo axe-core completo |
| **security-agent** | Genera 3 archivos: security headers + HTTPS enforcement + brute-force |
| **visual-agent** | Genera spec con `toHaveScreenshot` para regresión visual |
| **api-discovery** | Detecta llamadas de red en el recording y las convierte en tests REST |
| **api-test-generator** | Genera specs REST con 3 escenarios (200, 400, 404) |
| **healer-agents** | Cadena de 5 estrategias de reparación de selectores |
| **learning-store** | Persiste selectores exitosos en `learning-db.json` para reusar |

---

## Auto-healing de 6 capas

Cuando un selector falla, `smartClick` / `smartFill` / `smartSelect` ejecutan esta cadena automáticamente:

| Capa | Mecanismo | Descripción |
|---|---|---|
| **1** | LearningStore | Usa el selector con mayor tasa de éxito histórico para esa URL+acción |
| **2** | ResolveLocator | 19 estrategias: roles, texto, label, placeholder, testId, nav, sidebar, shadow DOM |
| **3** | HealSelector | Caché → variantes de texto → atributos estructurales → scroll+reveal → lazy-wait |
| **4** | ScrollReveal | Scroll profundo + espera 6s para lazy rendering de SPAs y formularios de login |
| **5** | OpenAI GPT-4o | Analiza el HTML del DOM y propone un nuevo selector vía IA |
| **6** | ForceReveal | Elimina overlays JS, force-click, expande Bootstrap collapse/tabs via JavaScript |

> Las capas 1-4 no requieren conexión a internet ni API key.  
> La capa 5 es opcional (requiere `OPENAI_API_KEY`).  
> La capa 6 es el último recurso antes de fallar el test.

---

## Estructura de carpetas

```
playwright-enterprise-template/
│
├── BoxRecordings/
│   └── recordings/                    ← grabaciones .ts de Playwright codegen
│
├── Box_Example_Apis/
│   ├── example_rest/                  ← ejemplos de tests REST
│   └── example_soap/                  ← ejemplos de tests SOAP
│
├── ConfigurationAgents/
│   └── ia-testing/
│       ├── agents/                    ← motores de generación y healing
│       ├── scripts/                   ← run-agents.ts (orquestador)
│       └── utils/                     ← openai-client, helpers
│
├── ConfigurationTest/
│   └── tests/
│       ├── utils/
│       │   ├── smart-actions.ts       ← smartClick, smartFill, smartSelect (+6 capas healing)
│       │   ├── navigation-helper.ts   ← smartGoto, attachErrorMonitors
│       │   ├── api-helper.ts          ← restRequest, soapRequest
│       │   ├── modal-handler.ts       ← closeAnyModal, waitForToastMessage
│       │   └── test-data-resolver.ts  ← datos dinámicos offline + IA
│       ├── pages/                     ← Page Objects
│       ├── fixtures/                  ← customFixtures (loginPage)
│       └── setup/                     ← auth.setup.ts (storageState)
│
├── GenerateTest/
│   ├── features/                      ← archivos .feature (BDD Gherkin)
│   ├── steps/                         ← step definitions
│   ├── api-testing-rest-soap/
│   │   ├── rest/                      ← tests REST manuales
│   │   └── soap/                      ← tests SOAP manuales
│   ├── non-functional/
│   │   ├── config/nf-config.ts        ← configuración de carga
│   │   ├── core/                      ← http-client, metrics-collector, load-engine
│   │   ├── reporters/                 ← summary-reporter (grilla JMeter)
│   │   ├── utils/                     ← target-resolver
│   │   └── generator/                 ← generate-nf-tests.ts
│   └── tests/
│       └── <NombreRecording>/
│           ├── ui/
│           ├── api/
│           ├── performance/
│           ├── accessibility/
│           ├── security/
│           ├── visual/
│           └── non-functional/
│
├── playwright.config.ts               ← configuración global + proyectos
├── package.json                       ← scripts npm
├── tsconfig.json                      ← path aliases @utils, @pages, @config
├── learning-db.json                   ← aprendizaje de selectores (auto-generado)
└── healer-db.json                     ← caché de healing (auto-generado)
```

---

## Scripts de package.json

| Comando | Descripción |
|---|---|
| `npm run record <NombreApp_Flujo>` | Graba un flujo con Playwright codegen |
| `npm run generate` | Genera todas las suites (UI, API, Performance, Accessibility, Security, Visual, BDD) |
| `npm run generate:nf` | Genera specs de pruebas no funcionales dentro de las suites |
| `npm run generate:api` | Genera tests de API a partir del tráfico capturado en la última ejecución |
| `npm run test` | Flujo completo: generate + bdd + ejecución + reportes por suite |
| `npm run bdd` | Solo transpila features BDD a tests |
| `npm run test:smoke` | Ejecuta solo tests con tag `@smoke` |
| `npm run report` | Abre el último reporte HTML |
| `npm run reports-index` | Genera el índice global de reportes multi-suite |

---

## Solución de problemas

| Problema | Solución |
|---|---|
| `Elemento no visible para click` | El healing de 6 capas lo resuelve automáticamente. Si persiste: verifica que la grabación esté completa y vuelve a ejecutar `npm run generate`. |
| `page closed` / `page crashed` | El framework detecta la página cerrada y reintenta. Aumenta `timeout` en `playwright.config.ts` si el sistema es lento. |
| `selector not found` | El healer intenta 5 estrategias automáticas. Si falla: revisa que el recording capture el elemento y ejecuta `npm run generate`. |
| `Tests de API manuales no aparecen en la suite` | El nombre del spec debe comenzar igual que el recording. Ej: `Homebankink_Transferencias_*.spec.ts` para la suite `Homebankink_Transferencias`. |
| `Non-functional: Suite no encontrada` | Ejecuta `npm run generate` antes de `npm run generate:nf`. |
| `Non-functional: 100% errores` | El endpoint puede requerir autenticación. Añade `Authorization: 'Bearer TOKEN'` en `headers` del target en `nf-config.ts`. |
| `Tests duplicados` | Ejecuta `npm run generate` para regenerar limpio. Los archivos en `GenerateTest/tests/` se sobreescriben. |
| `BDD: no encuentra steps` | Verifica que `playwright.config.ts` apunte a `GenerateTest/steps/**/*.ts`. Ejecuta `npm run bdd` primero. |

---

## Variables de entorno

Crear `.env` en la raíz del proyecto:

```env
# URL base global (sobreescribe el metadata.json de cada suite)
BASE_URL=https://staging.tuapp.com

# Habilita healing avanzado por IA (opcional)
OPENAI_API_KEY=sk-...

# Credenciales para auth.setup.ts (fallback: demo / demo123)
USER=usuario
PASS=contraseña
```

---

## Notas importantes

- `GenerateTest/tests/` se **sobreescribe** con cada `npm run generate`. No edites los archivos generados ahí.
- Los tests de API manuales en `GenerateTest/api-testing-rest-soap/` son seguros para editar.
- Los specs no funcionales en `GenerateTest/tests/<Suite>/non-functional/` se sobreescriben con `npm run generate:nf`.
- `learning-db.json` y `healer-db.json` persisten entre ejecuciones y mejoran el healing con el tiempo.
- El proyecto `bdd-ui` requiere haber ejecutado el proyecto `setup` previamente (genera `storage/auth.json`).
- `playwright.config.ts` — consultar antes de modificar (ver `CLAUDE.md`).

---

Desarrollado como solución enterprise de automatización con Playwright + IA.  
Para equipos que necesitan pruebas robustas, auto-generadas y auto-reparables en cualquier aplicación web.
