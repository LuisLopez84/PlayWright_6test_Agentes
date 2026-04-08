const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testsBaseDir = path.join(process.cwd(), 'GenerateTest', 'tests');
const reportsBaseDir = path.join(process.cwd(), 'reports');

if (!fs.existsSync(reportsBaseDir)) {
  fs.mkdirSync(reportsBaseDir, { recursive: true });
}

const suites = fs.readdirSync(testsBaseDir).filter(item => {
  const fullPath = path.join(testsBaseDir, item);
  return fs.statSync(fullPath).isDirectory();
});

console.log(`🔍 Se encontraron ${suites.length} suites: ${suites.join(', ')}`);

for (const suite of suites) {
  const suiteRelativePath = path.join('GenerateTest', 'tests', suite).replace(/\\/g, '/');
  const targetReportDir = path.join(reportsBaseDir, suite);
  const testResultsDir = path.join(process.cwd(), 'test-results', suite);
  const defaultReportDir = path.join(process.cwd(), 'playwright-report');

  const cmd = `npx playwright test "${suiteRelativePath}" --output="${testResultsDir}"`;

  console.log(`\n📦 Ejecutando suite: ${suite}`);
  console.log(`   Comando: ${cmd}`);

  try {
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });

    if (fs.existsSync(defaultReportDir)) {
      if (fs.existsSync(targetReportDir)) {
        fs.rmSync(targetReportDir, { recursive: true, force: true });
      }
      fs.renameSync(defaultReportDir, targetReportDir);
      console.log(`   ✅ Reporte movido a: ${targetReportDir}`);
    } else {
      console.log(`   ⚠️ No se encontró el reporte en ${defaultReportDir}`);
    }
  } catch (error) {
    console.error(`❌ Error al ejecutar suite ${suite}:`, error.message);
  }
}

console.log('\n✅ Proceso completado. Los reportes están en "reports"');