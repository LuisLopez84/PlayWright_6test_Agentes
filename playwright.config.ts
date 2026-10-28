import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// playwright-smart-reporter: reporte ADICIONAL (no reemplaza list/html/junit, que siguen
// alimentando el portal). Salida y historial viven en su propia carpeta para no chocar con
// playwright-report/ (que split-reports.js mueve por suite) ni con test-results/.
//   SMART_REPORT_DIR=<carpeta>  → split-reports.js / test-suite.ts lo fijan por suite, así cada
//                                 corrida conserva su propio reporte e historial de tendencias.
//   SMART_REPORT_DISABLE=1      → omite el reporter (ej. la corrida acotada de bdd-ui, que es
//                                 informativa y ensuciaría el historial con runs de 1 test).
// La IA del reporter queda apagada (enableAIRecommendations=false): no envía datos a ningún proveedor.
const smartReportDir = process.env.SMART_REPORT_DIR || 'smart-report';
const smartReporter: ReporterDescription[] = process.env.SMART_REPORT_DISABLE === '1'
  ? []
  : [[
      // Envoltorio de 'playwright-smart-reporter' que agrega la interfaz en español y la guía
      // (ConfigurationAgents/ia-testing/reporters/). Mismas opciones y mismos datos que el original.
      './ConfigurationAgents/ia-testing/reporters/smart-reporter-es.ts',
      {
        outputFile: `${smartReportDir}/smart-report.html`,
        historyFile: `${smartReportDir}/test-history.json`,
        maxHistoryRuns: 20,
        enableAIRecommendations: false,
      },
    ]];

const bddTestDir = defineBddConfig({
features: 'GenerateTest/features/**/*.feature',
steps: [
'GenerateTest/steps/**/*.ts',
'ConfigurationTest/tests/hooks/**/*.ts',
'ConfigurationTest/tests/fixtures/**/*.ts'
]
});

export default defineConfig({
  testDir: './',
  outputDir: 'test-results',
  fullyParallel: true,
  workers: process.env.CI ? 4 : 8, // Más workers en local
  retries: 2, // Reintentar tests fallidos automáticamente
  timeout: 120000,

  expect: {
    timeout: 15000
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ...smartReporter,
  ],

  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on',
    screenshot: 'on',
    // Sin `size`, Playwright graba el video escalado hacia abajo para caber en 800x800
    // (800x450 real, partiendo de un viewport de 1280x720) — se ve borroso/pixelado.
    // Al fijar size = viewport real (1280x720, igual en los 3 navegadores — ver
    // devices['Desktop Chrome'|'Firefox'|'Safari']), el video se graba a resolución
    // completa sin downscale.
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    actionTimeout: 15000,
    navigationTimeout: 30000,
    // Evita detección de bot (sitios como MercadoLibre bloquean el UA por defecto de Playwright)
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    launchOptions: {
      args: ['--disable-blink-features=AutomationControlled'],
    },
  },

  projects: [

  // 🔥 SETUP
  {
    name: 'setup',
    testMatch: /.*\.setup\.ts/
  },

  // 🔥 UI Chromium (spec.ts)
  {
    name: 'ui-chromium',
    testDir: './GenerateTest/tests',
    testMatch: ['GenerateTest/tests/**/*.spec.ts'],
    testIgnore: [
      '**/api/**/*.spec.ts',
      '**/performance/**/*.spec.ts',
      '**/accessibility/**/*.spec.ts',
      '**/security/**/*.spec.ts',
      '**/visual/**/*.spec.ts',
      '**/non-functional/**/*.spec.ts',
    ],
    use: { ...devices['Desktop Chrome'] }
  },

  // 🔥 UI Firefox (spec.ts)
  {
    name: 'ui-firefox',
    testDir: './GenerateTest/tests',
    testMatch: ['GenerateTest/tests/**/*.spec.ts'],
    testIgnore: [
      '**/api/**/*.spec.ts',
      '**/performance/**/*.spec.ts',
      '**/accessibility/**/*.spec.ts',
      '**/security/**/*.spec.ts',
      '**/visual/**/*.spec.ts',
      '**/non-functional/**/*.spec.ts',
    ],
    use: { ...devices['Desktop Firefox'] }
  },

  // 🔥 UI Webkit Safari (spec.ts)
  {
    name: 'ui-webkit',
    testDir: './GenerateTest/tests',
    testMatch: ['GenerateTest/tests/**/*.spec.ts'],
    testIgnore: [
      '**/api/**/*.spec.ts',
      '**/performance/**/*.spec.ts',
      '**/accessibility/**/*.spec.ts',
      '**/security/**/*.spec.ts',
      '**/visual/**/*.spec.ts',
      '**/non-functional/**/*.spec.ts',
    ],
    use: { ...devices['Desktop Safari'] }
  },

  // 🔥 BDD (features)
  {
    name: 'bdd-ui',
    testDir: bddTestDir,
    grep: /@UI/,
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'storage/auth.json'
    }
  },

  // 🔥 PERFORMANCE
  {
    name: 'performance',
    testMatch: [
      'GenerateTest/tests/**/performance/**/*.spec.ts'
    ]
  },

  // 🔥 VISUAL
  {
    name: 'visual',
    testMatch: [
      'GenerateTest/tests/**/visual/**/*.spec.ts'
    ]
  },

  // 🔥 ACCESSIBILITY
  {
    name: 'accessibility',
    testMatch: [
      'GenerateTest/tests/**/accessibility/**/*.spec.ts'
    ]
  },

  // 🔥 API
{
  name: 'api',
  testMatch: [
    'GenerateTest/tests/**/api/**/*.spec.ts',
    'GenerateTest/api-testing-rest-soap/**/*.spec.ts'
  ]
},

  // 🔥 SECURITY
  {
    name: 'security',
    testMatch: [
      'GenerateTest/tests/**/security/**/*.spec.ts'
    ]
  },

  // 🔥 NON-FUNCTIONAL (Carga / Rendimiento estilo JMeter)
  {
    name: 'non-functional',
    testMatch: [
      'GenerateTest/tests/**/non-functional/**/*.spec.ts'
    ],
    // Sin timeout: las pruebas de carga pueden durar varios minutos
    timeout: 0,
    // Serial: no paralelizar pruebas de carga entre sí
    fullyParallel: false,
    workers: 1,
    retries: 0,
  }

]
});