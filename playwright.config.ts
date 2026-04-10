import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

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
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],

  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on',
    screenshot: 'on',
    video: 'on',
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
  }

]
});