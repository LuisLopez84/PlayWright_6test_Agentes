'use strict';
/**
 * Aplica (o re-aplica) la capa en español a smart-report.html ya generados, sin volver a ejecutar pruebas.
 *
 *   npm run smart-report:es                      → todos los smart-report/**\/smart-report.html
 *   npm run smart-report:es -- <archivo|carpeta> → solo ese archivo / esa carpeta
 *
 * Útil después de editar el diccionario o la guía (ConfigurationAgents/ia-testing/reporters/smart-report-es/).
 * Es idempotente: ejecutarlo varias veces no duplica nada.
 */
const fs   = require('fs');
const path = require('path');
const { localizeSmartReport } = require('../reporters/smart-report-es/inject.js');

const ROOT   = process.cwd();
const target = path.resolve(ROOT, process.argv[2] || 'smart-report');

function collect(p, acc) {
  if (!fs.existsSync(p)) return acc;
  const st = fs.statSync(p);
  if (st.isFile()) { if (p.endsWith('.html')) acc.push(p); return acc; }
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    if (e.isDirectory() && (e.name === 'traces' || e.name === 'node_modules' || e.name.endsWith('.runs'))) continue;
    collect(path.join(p, e.name), acc);
  }
  return acc;
}

const files = collect(target, []).filter(f => /smart-report[^\\/]*\.html$/i.test(f));
if (!files.length) {
  console.log(`ℹ️  No se encontró ningún smart-report.html en ${target}. Ejecuta primero las pruebas.`);
  process.exit(0);
}
let changed = 0;
for (const f of files) {
  try {
    const did = localizeSmartReport(f);
    if (did) changed++;
    console.log(`${did ? '🌐' : '·'} ${path.relative(ROOT, f)}${did ? '' : ' (sin cambios)'}`);
  } catch (e) {
    console.warn(`⚠️  ${path.relative(ROOT, f)}: ${e.message}`);
  }
}
console.log(`\nListo: ${changed} de ${files.length} reporte(s) actualizados.`);
