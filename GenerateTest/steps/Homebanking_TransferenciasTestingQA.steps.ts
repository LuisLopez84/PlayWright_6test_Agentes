import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd();
// Pasos genéricos en: common.steps.ts
// Pasos de API en:    api-generated.steps.ts

