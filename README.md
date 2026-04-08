```
# 🚀 Playwright Enterprise Automation Framework

Framework de automatización de pruebas **inteligente** basado en Playwright + BDD + IA.  
Genera tests automáticamente a partir de grabaciones, se repara solo (self‑healing) y ejecuta tests de UI, API, rendimiento, accesibilidad, seguridad y visuales.

---

## 📦 Requisitos previos (obligatorios)

### 1. Node.js (incluye npm)

- Descargar desde [https://nodejs.org](https://nodejs.org) – versión **LTS**.
- Verificar instalación:

```bash
node -v
npm -v
```

### 2. Git (opcional pero recomendado)

* [https://git-scm.com](https://git-scm.com/)

**bash**

```
git --version
```

---

## 🔧 Instalación del proyecto

### 2.1 Clonar el repositorio (o descargar ZIP)

**bash**

```
git clone <URL_DEL_REPO>
cd playwright-enterprise-template_UI_API_Performance3
```

### 2.2 Instalar dependencias (¡clave!)

**bash**

```
npm install
```

Esto instala:

* Playwright y sus navegadores
* playwright-bdd (Gherkin)
* TypeScript, ts-node
* OpenAI SDK (para IA)
* Utilidades internas del framework

### 2.3 Instalar navegadores de Playwright

**bash**

```
npx playwright install
```

### 2.4 (Opcional) Clave de OpenAI – para IA generadora

Crea un archivo `.env` en la raíz del proyecto:

**env**

```
OPENAI_API_KEY=tu_api_key_aqui
```

Si no pones clave, el framework funciona igual (solo sin correcciones por IA).

---

## 🎬 Generación automática de pruebas (paso obligatorio)

El framework **genera** los tests a partir de grabaciones manuales.

### 3.1 Grabar un flujo

**bash**

```
npm run record NombreDelFlujo
```

Ejemplo:

**bash**

```
npm run record Transferencias
```

Esto abre un navegador donde realizas la acción (login, transferencia, etc.). Al cerrar, se guarda la grabación en `BoxRecordings/recordings/NombreDelFlujo.ts`.

### 3.2 Generar tests (features, steps, etc.)

**bash**

```
npm run generate
```

Esto crea:

* Features Gherkin (`.feature`)
* Steps de prueba (`.steps.ts`)
* Tests de UI, rendimiento, accesibilidad, seguridad, visuales y API (automáticos)

Todo se guarda en la carpeta `GenerateTest/`.

> ⚠️ **Siempre ejecuta `npm run generate` después de grabar o modificar una grabación.**

---

## ▶️ Ejecutar pruebas

### 4.1 Ejecutar **todos** los tests (UI, API, rendimiento, etc.)

**bash**

```
npx playwright test
```

### 4.2 Ejecutar en modo interactivo (recomendado)

**bash**

```
npx playwright test --ui
```

### 4.3 Ejecutar **un solo test** (por ruta)

**bash**

```
npx playwright test GenerateTest/tests/Transferencias/ui/Transferencias.spec.ts
```

### 4.4 Ejecutar **tests específicos** (varios archivos)

**bash**

```
npx playwright test test1.spec.ts test3.spec.ts test5.spec.ts
```

### 4.5 Ejecutar por patrón (ejemplo: solo los tests 1,3,5,7,9)

Puedes usar `--grep` con expresiones regulares que coincidan con el **nombre del test** (describe o test).
Por ejemplo, si tus tests se llaman `"Transferencias - flujo 1"`, `"Transferencias - flujo 3"`, etc.:

**bash**

```
npx playwright test --grep "flujo 1|flujo 3|flujo 5|flujo 7|flujo 9"
```

También puedes filtrar por **ruta de archivo**:

**bash**

```
npx playwright test GenerateTest/tests/Transferencias/ui/Transferencias.spec.ts GenerateTest/tests/Login/ui/Login.spec.ts
```

### 4.6 Ejecutar **todos menos uno**

**bash**

```
npx playwright test --grep-invert "NombreDelTest"
```

Ejemplo: omitir cualquier test que contenga la palabra "Transferencia":

**bash**

```
npx playwright test --grep-invert "Transferencia"
```

### 4.7 Ejecutar solo los primeros N tests (útil para depurar)

**bash**

```
npx playwright test --workers=1 --max-failures=5
```

Esto detiene la ejecución tras 5 fallos.

---

## 📊 Tipos de pruebas y qué validan


| Tipo              | ¿Qué prueba?                                                                         | ¿Dónde se generan?                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **UI**            | Flujo completo (login, clics, selects, asserts) – simula usuario real                 | `GenerateTest/tests/<nombre>/ui/`                                                                    |
| **API**           | Peticiones REST/SOAP (éxito 200, error de datos 400, fallo técnico 404/500)          | `GenerateTest/tests/<nombre>/api/` (automáticos) o `GenerateTest/api-testing-rest-soap/` (manuales) |
| **Performance**   | Tiempo de carga de página, recursos lentos, performance budget                        | `GenerateTest/tests/<nombre>/performance/`                                                           |
| **Accesibilidad** | Escaneo con axe-core (contraste, etiquetas, roles, etc.)                               | `GenerateTest/tests/<nombre>/accessibility/`                                                         |
| **Seguridad**     | Headers de seguridad (X‑Frame‑Options, CSP, HSTS), inyección SQL, XSS, fuerza bruta | `GenerateTest/tests/<nombre>/security/`                                                              |
| **Visual**        | Comparación de capturas de pantalla (regresión visual)                               | `GenerateTest/tests/<nombre>/visual/`                                                                |

> ℹ️ Los tests de API automáticos se generan con tres escenarios: éxito (200), error de datos (400) y fallo técnico (404).
> Puedes añadir tests REST/SOAP manuales en `GenerateTest/api-testing-rest-soap/rest` o `soap`.

---

## 📁 Estructura de carpetas (resumen)

**text**

```
GenerateTest/
├── features/               # archivos .feature (Gherkin)
├── steps/                  # steps definitions (common.steps.ts + específicos)
├── tests/
│   ├── Transferencias/
│   │   ├── ui/             # tests de UI
│   │   ├── api/            # tests de API automáticos
│   │   ├── performance/
│   │   ├── accessibility/
│   │   ├── security/
│   │   └── visual/
│   └── Login/              # otra suite
└── api-testing-rest-soap/  # (solo tests manuales)
```

---

## 🧪 Ejecutar pruebas a demanda (casos comunes)

### 🔹 Quiero probar solo la UI de una suite

**bash**

```
npx playwright test GenerateTest/tests/Transferencias/ui/
```

### 🔹 Quiero probar solo la API de una suite

**bash**

```
npx playwright test GenerateTest/tests/Transferencias/api/
```

### 🔹 Quiero probar solo los tests de seguridad de todas las suites

**bash**

```
npx playwright test GenerateTest/tests/**/security/
```

### 🔹 Quiero probar una sola suite completa (todos sus tipos)

**bash**

```
npx playwright test GenerateTest/tests/Transferencias
```

### 🔹 Quiero probar en un solo navegador (ej. Chromium)

**bash**

```
npx playwright test --project=ui-chromium
```

Los proyectos disponibles en `playwright.config.ts`:
`ui-chromium`, `ui-firefox`, `ui-webkit`, `performance`, `visual`, `accessibility`, `api`, `security`, `bdd-ui`.

---

## 📈 Reportes

Después de ejecutar los tests:

**bash**

```
npx playwright show-report
```

Abre un servidor local con el reporte HTML.
Los reportes también se guardan en `reports/<nombre_suite>/index.html` (uno por suite).

---

## 🧠 Arquitectura inteligente (agentes IA)


| Agente            | Función                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------- |
| **Planner**       | Analiza la grabación y genera un flujo BDD                                                  |
| **Generator**     | Crea archivos`.feature` y `.steps.ts`                                                        |
| **Healer**        | Cuando un selector falla, intenta repararlo (por ID, texto, rol, o con IA)                   |
| **Smart Actions** | `smartClick`, `smartFill`, `smartSelect` – reintentan, esperan estabilidad, manejan modales |

Esto hace que el framework sea **resiliente** y se adapte a cambios en la web.

---

## ⚠️ Problemas comunes y soluciones


| Problema                                | Solución                                                                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `page closed`                           | El framework ya lo maneja (espera a que la página se estabilice).                                                                        |
| `selector not found`                    | El healer intenta automáticamente otras estrategias.                                                                                     |
| `navegación incorrecta`                | Se detecta si es URL real o texto y se convierte a click.                                                                                 |
| `tests duplicados`                      | Usa`npm run generate` para regenerar (elimina duplicados).                                                                                |
| `no se ejecutan mis tests manuales API` | Colócalos en`GenerateTest/api-testing-rest-soap/rest` o `soap` con el patrón `NombreSuite_Metodo.spec.ts` y ejecuta `npm run generate`. |

---

## 🚀 Flujo de trabajo recomendado

1. **Grabar** un flujo → `npm run record Nombre`
2. **Generar** tests → `npm run generate`
3. **Ejecutar** todas las pruebas → `npm run test`
4. **Ver reporte** → `npx playwright show-report`
5. Si algo falla, revisa el video/screenshot en el reporte y ajusta la grabación si es necesario.

---

## 📌 Scripts útiles (package.json)


| Comando                   | Descripción                                              |
| ------------------------- | --------------------------------------------------------- |
| `npm run record <nombre>` | Graba un flujo con Playwright codegen                     |
| `npm run generate`        | Genera features, steps y tests                            |
| `npm run test`            | Genera + ejecuta todos los tests (con reportes separados) |
| `npm run bdd`             | Solo transpila los features a tests                       |
| `npm run generate:api`    | Genera tests de API a partir de tráfico capturado        |
| `npm run test:smoke`      | Ejecuta tests con tag`@smoke`                             |
| `npm run report`          | Abre el último reporte HTML                              |

---

## 🧩 Requisitos para cualquier sistema operativo

* **Node.js 18+** (funciona en Windows, macOS, Linux)
* **npm 9+**
* **Playwright browsers** (se instalan con `npx playwright install`)
* **Opcional:** clave de OpenAI (para healing avanzado)

No requiere Docker, ni Java, ni ninguna otra dependencia externa.

---

## 👥 Autor

Desarrollado como solución enterprise de automatización con IA.
Perfecto para equipos que necesitan pruebas **robustas, auto‑generadas y auto‑reparables**.

---

**¿Dudas?** Ejecuta `npm run generate` y luego `npx playwright test --ui` para explorar los tests visualmente.

**text**

```

Este README es autocontenido, explica **cada comando**, **qué hace cada tipo de test**, **cómo filtrar ejecuciones**, **cómo instalar** y **cómo solucionar errores comunes**. Está pensado para usuarios de cualquier nivel.
```


# 🎯 Ejemplos test API SOAP - REST

\GenerateTest\api-testing-rest-soap\soap\Homebanking_Pruebas001_POST.spec.ts

import { test, expect } from '@playwright/test';
import { soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper.js';

const xmlBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/"> <soapenv:Header/> <soapenv:Body> <tem:Add> <tem:intA>5</tem:intA> <tem:intB>2</tem:intB> </tem:Add> </soapenv:Body> </soapenv:Envelope>`;

test('SOAP Add - éxito (200)', async ({ request }) => {
// 🔥 EL ENDPOINT SE ESPECIFICA AQUÍ (cámbialo por el real)
const endpoint = 'http://www.dneonline.com/calculator.asmx';
const soapAction = 'http://tempuri.org/Add';

const response = await soapRequest(request, endpoint, xmlBody, soapAction);
expect(response.status()).toBe(200);
const text = await response.text();
expect(text).toContain('<AddResult>7</AddResult>');
});

\GenerateTest\api-testing-rest-soap\rest\Homebanking_Pruebas002_POST.spec.ts

import { test, expect } from '@playwright/test';
import { restRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test('POST /transferencias/ - éxito (200 o 201)', async ({ request }) => {
const payload = {
cuenta_destino: "ACC002",
cuenta_origen: "ACC001",
monto: 1500,
motivo: "Varios",
tipo: "propia"
};
const response = await restRequest(request, 'POST', 'https://homebanking-demo.onrender.com/transferencias/', {
data: payload,
headers: {
accept: 'application/json',
'Content-Type': 'application/json'
}
});
expect(response.status()).toBe(200); // o 201 según la API
const body = await response.json();
expect(body).toBeDefined();
});

\GenerateTest\api-testing-rest-soap\rest\Homebanking_Pruebas001_GET.spec.ts

import { test, expect } from '@playwright/test';
import { restRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test('GET /cliente/dashboard - éxito (200)', async ({ request }) => {
const response = await restRequest(request, 'GET', 'https://homebanking-demo.onrender.com/cliente/dashboard', {
headers: { accept: 'application/json' }
});
expect(response.status()).toBe(200);
const body = await response.json();
// Ajusta la propiedad según lo que devuelva la API
expect(body).toBeDefined();
});
