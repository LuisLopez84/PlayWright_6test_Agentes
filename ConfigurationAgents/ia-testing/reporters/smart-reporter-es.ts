import path from 'path';
import type { FullConfig, FullResult, Suite } from '@playwright/test/reporter';
import SmartReporter from 'playwright-smart-reporter';
// CommonJS a propósito: el mismo inyector lo usa scripts/localize-smart-report.js
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { localizeSmartReport } = require('./smart-report-es/inject.js') as {
  localizeSmartReport: (file: string) => boolean;
};

/**
 * Smart Reporter en español.
 *
 * Es exactamente `playwright-smart-reporter` (mismas opciones, mismos datos, mismo historial) y, al terminar
 * la corrida, agrega al HTML generado la capa en español: interfaz traducida + botón «Guía del reporte» con la
 * introducción y la explicación de cada métrica (ver ./smart-report-es/).
 *
 * Si la traducción falla por cualquier motivo se avisa por consola y el reporte queda en su idioma original:
 * nunca afecta a las pruebas ni a los demás reporters.
 */
export default class SmartReporterEs extends SmartReporter {
  private esOptions: { outputFile?: string; relativeToCwd?: boolean };
  private esRootDir = process.cwd();

  constructor(options: any = {}) {
    super(options);
    this.esOptions = options || {};
  }

  onBegin(config: FullConfig, suite: Suite) {
    // el reporter resuelve outputFile contra rootDir (o cwd con relativeToCwd): se replica para ubicar el HTML
    this.esRootDir = this.esOptions.relativeToCwd ? process.cwd() : config.rootDir;
    super.onBegin(config, suite);
  }

  async onEnd(result: FullResult) {
    const res = await super.onEnd(result);
    try {
      const file = path.resolve(this.esRootDir, this.esOptions.outputFile ?? 'smart-report.html');
      if (localizeSmartReport(file)) console.log(`   🌐 Smart Report en español: ${file}`);
    } catch (e: any) {
      console.warn(`⚠️  Smart Report: no se pudo aplicar la traducción al español (${e?.message ?? e}). El reporte queda en inglés.`);
    }
    return res;
  }
}
