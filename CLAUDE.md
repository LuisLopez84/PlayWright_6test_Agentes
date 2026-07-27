# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🎯 Propósito del proyecto
Este es un template empresarial para pruebas automatizadas con Playwright, que cubre:
- UI testing (interfaz de usuario)
- API testing 
- Performance testing
- Accesibility testing
- Visual Testing
- Security testing

Las pruebas de UI se generan a partir de una grabación o recording a cualquier url o aplicativo web en alguno de éstos tres navegadores:

- Chromium
- Firefox
- WebKit

Y se guardan en D:\workspaceUdemyJavaSenior2024\playwright-enterprise-template_UI_API_Performance3\BoxRecordings\recordings

Las pruebas de API se ejecutan siempre y cuando existan las clases spec.ts en las carpetas:

Para servicios Rest (APIs):
- D:\workspaceUdemyJavaSenior2024\playwright-enterprise-template_UI_API_Performance3\GenerateTest\api-testing-rest-soap\rest

Para web services con arquitectura SOAP:
- D:\workspaceUdemyJavaSenior2024\playwright-enterprise-template_UI_API_Performance3\GenerateTest\api-testing-rest-soap\soap

Los test de APIs (SOAP o Rest) deben tener el mismo nombre del recording para que al generar las test suits se incluya la carpeta o package de api dentro de la suite que tenga el mismo
nombre del recording.

Existen unos ejemplos para los test de API con algunos métodos Rest en ésta ruta:
D:\workspaceUdemyJavaSenior2024\playwright-enterprise-template_UI_API_Performance3\Box_Example_Apis\example_rest

Existen unos ejemplos para los test de API con algunos métodos SOAP en ésta ruta:
D:\workspaceUdemyJavaSenior2024\playwright-enterprise-template_UI_API_Performance3\Box_Example_Apis\example_soap

Las pruebas de:

- Performance testing
- Accesibility testing
- Visual Testing
- Security testing

Se ejecutan al igual que las pruebas de UI a partir de las grabaciones o recordings que se encuentran en ésta ruta:
Y se guardan en D:\workspaceUdemyJavaSenior2024\playwright-enterprise-template_UI_API_Performance3\BoxRecordings\recordings

Por cada recording se debe generar una suite de pruebas en la ruta:
D:\workspaceUdemyJavaSenior2024\playwright-enterprise-template_UI_API_Performance3\GenerateTest\tests

Y la llave siempre será el nombre exacto de la grabación/recording para saber dónde ubicar los test set.


Se deben general todos los .features en ésta ruta:
D:\workspaceUdemyJavaSenior2024\playwright-enterprise-template_UI_API_Performance3\GenerateTest\features

Se deben generar todos los steps en ésta ruta:
D:\workspaceUdemyJavaSenior2024\playwright-enterprise-template_UI_API_Performance3\GenerateTest\steps


Éste proyecto debe ser lo suficientemente robusto para generara test autónomos (usando IA Open IA + Agentes de Playwright) de cualquier aplicativo web a nivel de gestionar los errores de elementos o 
localizadores rotos, defectuosos, que manejen Shadow roots, que soporte carga y descarga de archivos si el recording o grabación web lo maneja en el flujo grabado y que optimice tiempos de ejecución


## Contexto rápido
Este proyecto es una plantilla empresarial para Playwright. Se usa para probar cualquier aplicación en los entornos:
- https://staging.tuapp.com

## Comandos que siempre debes usar
- Para instalar dependencias: `npm ci` (no `npm install`)
- Para ejecutar pruebas en modo headless: `npm test -- --headed=false`
- Para debug: `npm run test:debug`

## Reglas no negociables
1. Cada prueba debe ser independiente (no compartir estado).
2. Usar `test.describe` y `test.beforeEach` apropiadamente.
3. Los selectores de UI deben ser `data-testid` siempre que exista.
4. Las pruebas de API deben incluir reintentos (retry) en caso de 5xx.

## Archivos que generan conflicto si los tocas
- `package-lock.json` - solo actualizar con `npm ci`
- `playwright.config.ts` - preguntar antes de cambiar

## 🛠 Stack tecnológico
- **Lenguaje**: TypeScript / JavaScript (especificar cuál usas)
- **Framework**: Playwright v1.x
- **Ejecutor de pruebas**: Jest / Mocha / el que uses
- **Reportes**: Allure / HTML reporter / etc.
- **CI/CD**: GitHub Actions / Jenkins / etc.

## 📁 Estructura de carpetas clave
- `tests/` - Todas las pruebas (organizadas por tipo: ui/, api/, performance/)
- `pages/` - Page Object Models
- `fixtures/` - Datos de prueba
- `utils/` - Funciones auxiliares
- `config/` - Configuraciones por entorno
- `reports/` - Reportes generados

## 🔧 Comandos importantes
- `npm test` - Ejecuta todas las pruebas
- `npm run test:ui` - Solo pruebas de UI
- `npm run test:api` - Solo pruebas de API
- `npm run test:performance` - Solo pruebas de rendimiento
- `npm run report` - Genera reporte Allure

## ⚙️ Configuración de entornos
- Desarrollo: `dev.config.ts`
- Staging: `staging.config.ts`
- Producción: `prod.config.ts`
- Variables de entorno necesarias: `BASE_URL`, `API_KEY`, `DB_HOST`

## 📏 Reglas de codificación para este proyecto
- Usar siempre Page Object Model para las pruebas de UI.
- No hardcodear URLs ni credenciales; usar variables de entorno.
- Las pruebas de API deben incluir validación de schema.
- Para rendimiento, mantener cada prueba bajo 2 segundos (o el umbral que uses).
- Nombrar archivos con `*.spec.ts` para pruebas y `*.po.ts` para page objects.

## 🚫 Lo que NO debe hacer Claude
- No modificar archivos en `node_modules/`
- No cambiar configuraciones globales sin preguntar
- No eliminar reportes históricos sin confirmación

## 📚 Documentación adicional relevante
- Enlace a la wiki interna (si la hay)
- Enlace al backlog de Jira/Trello
- Estándares del equipo (ej. convención de commits)


---

## Comandos principales

```bash
# Grabar un flujo de usuario (abre Playwright codegen)
npm run record <NombreSuite>

# Generar TODOS los tests a partir de grabaciones
npm run generate

# Flujo completo: generar + ejecutar + reportes por suite + generar API post-run
npm run test

# Solo ejecutar tests (sin regenerar)
npx playwright test

# Ejecutar un proyecto específico
npx playwright test --project=ui-chromium
npx playwright test --project=api
npx playwright test --project=performance
# Proyectos disponibles: setup, ui-chromium, ui-firefox, ui-webkit, bdd-ui, performance, visual, accessibility, api, security

# Ejecutar un archivo de test concreto
npx playwright test GenerateTest/tests/Mercadolibre_test/ui/Mercadolibre_test.spec.ts

# Ejecutar por tag (BDD)
npx playwright test --grep @smoke
npx playwright test --grep @UI

# Ejecutar en modo interactivo
npx playwright test --ui

# Ver el reporte HTML
npx playwright show-report

# Transpilar BDD features → tests (sin ejecutar)
npm run bdd

# Generar tests de API a partir del tráfico capturado tras la última ejecución
npm run generate:api

# Generar índice de reportes multi-suite
npm run reports-index

# Generar / generar+ejecutar SOLO una suite (no toca las demás)
npm run generate -- --suite=<Nombre>
npm run generate:nf -- --suite=<Nombre>
npm run test:suite -- --suite=<Nombre>

# Arrancar el servidor MCP (delega en el CLI de @playwright/mcp)
npm run mcp:server                    # stdio, headless
HEADLESS=false npm run mcp:server     # navegador visible
MCP_PORT=8931 npm run mcp:server      # transporte HTTP/SSE en vez de stdio
```

---

## Arquitectura general

Este framework genera tests automáticamente a partir de grabaciones de Playwright codegen. El flujo es:

```
BoxRecordings/recordings/<Suite>.ts   ← grabación raw (Playwright codegen)
BoxAPIsExecute/{REST,SOAP}/{get,post,put,delete}/<Suite>_*.spec.ts  ← curl/URL+body pegado
BoxTestData/<Suite>.csv|.txt|.xlsx    ← datos variables opcionales (Data-Driven Testing), un archivo por suite
        ↓  npm run generate  (o  npm run generate -- --suite=<Suite>  para una sola)
GenerateTest/
  features/<Suite>.feature            ← Gherkin BDD generado por IA
  steps/<Suite>.steps.ts              ← step definitions generados
  tests/<Suite>/
    ui/            ← spec UI (Chromium/Firefox/WebKit) — repite por fila si hay datos en BoxTestData/
    api/           ← specs REST/SOAP (200, 400, 404/500) — el caso "Éxito" repite por fila si hay datos en BoxTestData/
    performance/   ← page load, performance budget
    accessibility/ ← axe-core scan
    security/      ← headers, XSS, SQLi, brute-force
    visual/        ← screenshot regression
    non-functional/ ← pruebas de carga (solo si se ejecutó npm run generate:nf)
  <Suite>.metadata.json               ← { name, baseURL } extraído de la grabación
```

**Regla crítica:** `GenerateTest/` se sobreescribe con cada `npm run generate`. Nunca editar los archivos generados allí excepto los tests manuales de API en `GenerateTest/api-testing-rest-soap/`.

### Tests manuales de API (seguros para editar)

Ubicación: `GenerateTest/api-testing-rest-soap/rest/` y `.../soap/`

Convención de nombre: `<SuiteName>_<MÉTODO>_<descripcion>.spec.ts`  
El script `run-agents.ts` los detecta por prefijo de nombre de suite y los mueve a `GenerateTest/tests/<Suite>/api/` corrigiendo el import de `api-helper` automáticamente.

Helpers disponibles en `ConfigurationTest/tests/utils/api-helper.ts`:
- `restRequest(request, method, url, options)` — para REST
- `soapRequest(request, endpoint, xmlBody, soapAction)` — para SOAP

---

## Capas del framework

### 1. Motor de agentes IA (`ConfigurationAgents/ia-testing/`)

| Directorio | Propósito |
|---|---|
| `agents/core/` | Motor central: parser de grabación, selector engine, assertion engine, flow healer, learning store, `data-binding.agent.ts` (mapeo columna→campo/clave para DDT, con fallback a IA) |
| `agents/generators/` | Generadores por tipo: `ui-agent` (async; envuelve el spec en loop si hay datos en `BoxTestData/`), `performance-agent`, `accessibility-agent`, `security-agent`, `visual-agent` |
| `agents/network/` | Detección de llamadas API en grabaciones (`api-discovery.agent`), generación de specs API (`api-test-generator.agent`) y de specs desde curl pegado en `BoxAPIsExecute/` (`box-api-executor.agent.ts`) |
| `agents/recorder/` | Parser de archivos `.ts` de Playwright codegen → steps normalizados |
| `mcp/server.ts` | Servidor MCP — delega en el CLI de `@playwright/mcp` (`cli.js`) vía `child_process.spawn()`; invocado por `npm run mcp:server` |
| `scripts/run-agents.ts` | Orquestador principal invocado por `npm run generate` |

### 2. Configuración de tests (`ConfigurationTest/tests/`)

| Directorio/Archivo | Propósito |
|---|---|
| `utils/smart-actions.ts` | `smartClick`, `smartFill`, `smartSelect` — acciones con retry, self-healing y healing por IA |
| `utils/navigation-helper.ts` | `smartGoto(page, testName)` — navega usando el `baseURL` del metadata activo |
| `utils/api-helper.ts` | Helpers para tests REST y SOAP |
| `utils/test-data-resolver.ts` | Resolución de valores dinámicos (fechas, tokens, etc.) en pasos generados |
| `utils/modal-handler.ts` | `closeAnyModal(page)` — cierra modales automáticamente |
| `utils/data-file-parser.ts` | `parseDataFile`, `findSuiteDataFile`, `loadSuiteTestData` — lee `.csv`/`.txt`/`.xlsx` de `BoxTestData/` (Data-Driven Testing), usable también desde specs manuales |
| `fixtures/customFixtures.ts` | Fixture `loginPage` que extiende `@playwright/test` |
| `pages/LoginPage.ts` | Page Object del login |
| `setup/auth.setup.ts` | Setup de autenticación que guarda sesión en `storage/auth.json` |
| `config/environment.ts` | Resolución de `BASE_URL`: env var → metadata JSON → localhost:3000 |

### 3. Self-healing y aprendizaje

`smartClick/Fill/Select` usan una cadena de healing cuando un selector falla:
1. **LearningStore** (`learning-db.json`) — intenta el selector con mayor tasa de éxito histórico para esa URL+acción+texto
2. **HealSelector** (`agents/core/healer-agents.ts`) — re-busca por estrategias alternativas (rol, texto, testId, etc.)
3. **IA (OpenAI gpt-4o-mini)** — analiza el HTML del DOM y propone un nuevo selector

`learning-db.json` es persistente entre ejecuciones (clave: `url|action|targetText`).

### 4. Path aliases TypeScript

Definidos en `tsconfig.json`, disponibles en todos los tests:
```
@utils/*  →  ConfigurationTest/tests/utils/*
@pages/*  →  ConfigurationTest/tests/pages/*
@config/* →  ConfigurationTest/tests/config/*
```

### 5. Configuración de Playwright (`playwright.config.ts`)

- `baseURL` proviene del módulo `environment.ts` (prioridad: env var → metadata → localhost)
- BDD features: `GenerateTest/features/**/*.feature`; steps: `GenerateTest/steps/**/*.ts` + fixtures/hooks de `ConfigurationTest`
- El proyecto `bdd-ui` usa `storageState: 'storage/auth.json'` (requiere haber ejecutado el proyecto `setup`)
- `workers`: 8 en local, 4 en CI; `retries`: 2; `timeout`: 120 s

---

## Variables de entorno

| Variable | Uso |
|---|---|
| `BASE_URL` | Sobreescribe la URL base de todos los tests |
| `OPENAI_API_KEY` | Habilita healing avanzado por IA (opcional; sin ella el framework funciona igual) |
| `USER` / `PASS` | Credenciales para el setup de autenticación (fallback: `demo` / `demo123`) |
| `HEADLESS` | Solo para `npm run mcp:server`: `false` abre el navegador con ventana visible (default: headless) |
| `MCP_PORT` / `MCP_HOST` | Solo para `npm run mcp:server`: si se define `MCP_PORT`, usa transporte HTTP/SSE en ese host/puerto en vez de stdio |
| `MCP_ALLOWED_HOSTS` | Solo para `npm run mcp:server`: lista de hosts permitidos si se expone `MCP_HOST` fuera de `localhost` (el CLI no soporta token de autenticación) |

Crear `.env` en la raíz del proyecto para desarrollo local.



