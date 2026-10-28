'use strict';
/**
 * Inyecta la capa en español (client.js + styles.css + guide.html) en un smart-report.html ya generado.
 *
 *  - Idempotente: si el archivo ya tenía la capa, la reemplaza (no se duplica).
 *  - No toca los datos del reporte ni su script: solo agrega un bloque antes de </body>,
 *    cambia lang="en" → "es" y el <title>.
 *  - Lo usan el reporter envoltorio (smart-reporter-es.ts, al terminar cada corrida) y el comando
 *    scripts/localize-smart-report.js (para re-traducir reportes que ya existen en disco).
 */
const fs   = require('fs');
const path = require('path');

const START = '<!--smart-es:start-->';
const END   = '<!--smart-es:end-->';

function read(name) {
  return fs.readFileSync(path.join(__dirname, name), 'utf-8');
}

function buildBlock() {
  const js    = read('client.js').replace(/<\/script/gi, '<\\/script'); // por si el JS contuviera </script
  const css   = read('styles.css');
  const guide = read('guide.html');
  const about = read('about.html');
  return `${START}<style id="smart-es-css">${css}</style>` +
         `<template id="smart-es-guide">${guide}</template>` +
         `<template id="smart-es-about-tpl">${about}</template>` +
         `<script id="smart-es-js">${js}</script>${END}`;
}

/** Devuelve el HTML con la capa en español (sin escribir a disco). */
function localizeHtml(html) {
  // quita una inyección previa (idempotencia)
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a !== -1 && b > a) html = html.slice(0, a) + html.slice(b + END.length);

  html = html
    .replace('<html lang="en"', '<html lang="es"')
    .replace('<title>Smart Test Report</title>', '<title>Reporte Inteligente de Pruebas</title>');

  const block = buildBlock();
  const i = html.lastIndexOf('</body>');
  // slice+concat (no String.replace): el JS inyectado contiene "$" que replace() interpretaría
  return i >= 0 ? html.slice(0, i) + block + html.slice(i) : html + block;
}

/** Traduce un smart-report.html en disco. Devuelve true si lo modificó. */
function localizeSmartReport(file) {
  const html = fs.readFileSync(file, 'utf-8');
  if (!html.includes('playwright-smart-reporter') && !html.includes('smart-reporter')) return false; // no parece un smart-report
  const out = localizeHtml(html);
  if (out === html) return false;
  fs.writeFileSync(file, out, 'utf-8');
  return true;
}

module.exports = { localizeSmartReport, localizeHtml };
