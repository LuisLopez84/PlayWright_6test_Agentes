import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { config as env } from './ConfigurationTest/tests/config/environment';
import 'tsconfig-paths/register';

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
  workers: 4,
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
    navigationTimeout: 30000
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
  testMatch: [
  'GenerateTest/tests/**/*.spec.ts'
],
testIgnore: ['**/api/**/*.spec.ts'],
  use: {
    ...devices['Desktop Chrome']
  }
},

// 🔥 UI Firefox (spec.ts)
  {
  name: 'ui-firefox',
  testDir: './GenerateTest/tests',
  testMatch: [
  'GenerateTest/tests/**/*.spec.ts'
],
testIgnore: ['**/api/**/*.spec.ts'],
  use: {
    ...devices['Desktop Firefox']
  }
},

// 🔥 UI Webkit Safari (spec.ts)
  {
  name: 'ui-webkit',
  testDir: './GenerateTest/tests',
  testMatch: [
  'GenerateTest/tests/**/*.spec.ts'
],
testIgnore: ['**/api/**/*.spec.ts'],
  use: {
    ...devices['Desktop Safari']
  }
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