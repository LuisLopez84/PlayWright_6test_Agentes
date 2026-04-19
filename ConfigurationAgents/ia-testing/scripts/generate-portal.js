#!/usr/bin/env node
/**
 * generate-portal.js
 * Portal HTML de reportes — cada tab muestra SÓLO los resultados de su tipo.
 * Lee test-results/results.xml (JUnit) → produce playwright-report/portal.html
 */
'use strict';

const fs            = require('fs');
const path          = require('path');
const { exec }      = require('child_process');

// ─── Rutas ────────────────────────────────────────────────────────────────────
const ROOT       = process.cwd();
const XML_FILE   = path.join(ROOT, 'test-results', 'results.xml');
const REPORT_DIR = path.join(ROOT, 'playwright-report');
const OUT_FILE   = path.join(REPORT_DIR, 'portal.html');

// ─── Módulos ──────────────────────────────────────────────────────────────────
const MODULES = [
  { key: 'ui',            label: 'UI Testing',      icon: '🖥️',  color: '#6366f1', glow: 'rgba(99,102,241,0.35)',   hostnames: ['ui-chromium','ui-firefox','ui-webkit'], pathSeg: '/ui/' },
  { key: 'api',           label: 'API Testing',     icon: '🔌',  color: '#10b981', glow: 'rgba(16,185,129,0.35)',   hostnames: ['api'],              pathSeg: '/api/' },
  { key: 'performance',   label: 'Performance',     icon: '⚡',  color: '#f59e0b', glow: 'rgba(245,158,11,0.35)',   hostnames: ['performance'],      pathSeg: '/performance/' },
  { key: 'security',      label: 'Security',        icon: '🔒',  color: '#ef4444', glow: 'rgba(239,68,68,0.35)',    hostnames: ['security'],         pathSeg: '/security/' },
  { key: 'accessibility', label: 'Accessibility',   icon: '♿',  color: '#8b5cf6', glow: 'rgba(139,92,246,0.35)',   hostnames: ['accessibility'],    pathSeg: '/accessibility/' },
  { key: 'visual',        label: 'Visual Testing',  icon: '👁️',  color: '#06b6d4', glow: 'rgba(6,182,212,0.35)',    hostnames: ['visual'],           pathSeg: '/visual/' },
  { key: 'bdd',           label: 'BDD / Gherkin',   icon: '🥒',  color: '#84cc16', glow: 'rgba(132,204,22,0.35)',   hostnames: ['bdd-ui'],           pathSeg: null },
  { key: 'nonfunctional', label: 'Non-Functional',  icon: '📈',  color: '#f97316', glow: 'rgba(249,115,22,0.35)',   hostnames: ['non-functional'],   pathSeg: '/non-functional/' },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  PARSERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Limpia códigos ANSI y marcadores [[ATTACHMENT|...]] del system-out */
function cleanOutput(raw) {
  return raw
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\[\[ATTACHMENT\|[^\]]*\]\]/g, '')
    .trim();
}

/** Extrae adjuntos [[ATTACHMENT|folder\file]] del system-out RAW.
 *  Devuelve Array<{ folder, file, type, isRetry, url }> agrupados por run.
 */
function extractAttachments(raw) {
  const attachRe = /\[\[ATTACHMENT\|([^\]]+)\]\]/g;
  const list = [];
  let m;
  while ((m = attachRe.exec(raw)) !== null) {
    const rawPath  = m[1].replace(/\\/g, '/').trim();
    const lastSlash = rawPath.lastIndexOf('/');
    const folder   = lastSlash >= 0 ? rawPath.substring(0, lastSlash)  : rawPath;
    const file     = lastSlash >= 0 ? rawPath.substring(lastSlash + 1) : rawPath;
    const ext      = file.split('.').pop().toLowerCase();
    const type     = ext === 'png'  ? 'screenshot'
                   : ext === 'webm' ? 'video'
                   : ext === 'zip'  ? 'trace'
                   : ext === 'md'   ? 'error-context'
                   : 'other';
    const isRetry  = folder.includes('-retry');
    // Ruta relativa desde playwright-report/portal.html → ../test-results/...
    const url      = `../test-results/${rawPath}`;
    list.push({ folder, file, type, isRetry, url });
  }
  return list;
}

/** Agrupa adjuntos por folder (cada folder = un run o retry) */
function groupAttachmentsByRun(attachments) {
  const map = new Map();
  for (const a of attachments) {
    if (!map.has(a.folder)) map.set(a.folder, []);
    map.get(a.folder).push(a);
  }
  // Ordenar: primero runs principales, luego retries
  return [...map.entries()]
    .sort(([a], [b]) => {
      const aR = a.includes('-retry') ? 1 : 0;
      const bR = b.includes('-retry') ? 1 : 0;
      return aR - bR || a.localeCompare(b);
    })
    .map(([folder, files], idx) => ({
      folder,
      files,
      label: folder.includes('-retry')
        ? `Retry ${folder.match(/-retry(\d+)/)?.[1] || ''}`.trim()
        : 'Ejecución principal',
      runIdx: idx,
    }));
}

/** Extrae un atributo de un bloque de atributos XML */
function attr(attrs, name) {
  const m = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : '';
}

/** Parser XML completo: devuelve { suites, totals } */
function parseXML(xml) {
  const suites  = [];
  const suiteRe = /<testsuite\s([^>]+)>([\s\S]*?)<\/testsuite>/g;
  let sm;
  while ((sm = suiteRe.exec(xml)) !== null) {
    const attrs    = sm[1];
    const body     = sm[2];
    const suite = {
      name:     attr(attrs, 'name'),
      hostname: attr(attrs, 'hostname'),
      tests:    +attr(attrs, 'tests')    || 0,
      failures: +attr(attrs, 'failures') || 0,
      skipped:  +attr(attrs, 'skipped')  || 0,
      time:     parseFloat(attr(attrs, 'time')) || 0,
      testcases: [],
    };

    // testcases
    const tcRe = /<testcase\s([^>]+)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
    let tm;
    while ((tm = tcRe.exec(body)) !== null) {
      const tcAttrs = tm[1];
      const tcBody  = tm[2] || '';
      const failM   = tcBody.match(/<failure[^>]*>([\s\S]*?)<\/failure>/);
      const outM    = tcBody.match(/<system-out>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/system-out>/);
      const rawOut  = outM ? outM[1] : '';
      suite.testcases.push({
        name:        attr(tcAttrs, 'name'),
        time:        parseFloat(attr(tcAttrs, 'time')) || 0,
        passed:      !failM,
        failure:     failM  ? cleanOutput(failM[1]) : null,
        output:      cleanOutput(rawOut),
        attachments: extractAttachments(rawOut),
      });
    }
    suites.push(suite);
  }

  // Totales globales
  const rootM  = xml.match(/<testsuites[^>]+tests="(\d+)"[^>]+failures="(\d+)"[^>]+skipped="(\d+)"[^>]+errors="(\d+)"[^>]+time="([^"]+)"/i);
  const totals = rootM
    ? { tests: +rootM[1], failures: +rootM[2], skipped: +rootM[3], errors: +rootM[4], time: parseFloat(rootM[5]) }
    : suites.reduce((a, s) => ({ tests: a.tests+s.tests, failures: a.failures+s.failures, skipped: a.skipped+s.skipped, errors: a.errors, time: a.time+s.time }), { tests:0, failures:0, skipped:0, errors:0, time:0 });

  return { suites, totals };
}

/** Clasifica cada suite en su módulo */
function classifySuite(suite) {
  const hostname  = suite.hostname.toLowerCase();
  const suitePath = suite.name.replace(/\\/g, '/');
  for (const mod of MODULES) {
    if (mod.hostnames.some(h => hostname === h || hostname.startsWith(h))) return mod.key;
    if (mod.pathSeg && suitePath.includes(mod.pathSeg)) return mod.key;
  }
  return null;
}

/** Agrupa suites por módulo */
function groupByModule(suites) {
  const groups = {};
  for (const mod of MODULES) groups[mod.key] = [];
  for (const s of suites) {
    const key = classifySuite(s);
    if (key) groups[key].push(s);
  }
  return groups;
}

/** Estadísticas de un grupo de suites */
function stats(suiteList) {
  return suiteList.reduce(
    (a, s) => ({ tests: a.tests+s.tests, failures: a.failures+s.failures, time: a.time+s.time }),
    { tests: 0, failures: 0, time: 0 }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXTRACTORES DE MÉTRICAS ESPECÍFICAS
// ═══════════════════════════════════════════════════════════════════════════════

/** Performance: extrae métricas de cada testcase */
function extractPerfMetrics(tc) {
  const o = tc.output;
  const loadM  = o.match(/⏱\s*DOM:\s*([\d.]+)ms\s*\|\s*Full:\s*([\d.]+)ms\s*\|\s*Budget:\s*([\d.]+)ms/);
  const vitalM = o.match(/📊\s*LCP:\s*([\d.]+)ms\s*\|\s*CLS:\s*([\d.]+)\s*\|\s*TBT:\s*([\d.]+)ms/);
  const resM   = o.match(/📦\s*Recursos:\s*(\d+)\s*\(max:\s*(\d+)\)/);
  // Si hay múltiples lecturas (retry), tomar la última
  const allVitals = [...o.matchAll(/📊\s*LCP:\s*([\d.]+)ms\s*\|\s*CLS:\s*([\d.]+)\s*\|\s*TBT:\s*([\d.]+)ms/g)];
  const lastVital = allVitals.length ? allVitals[allVitals.length - 1] : null;
  return {
    load:  loadM  ? { dom: +loadM[1], full: +loadM[2], budget: +loadM[3] } : null,
    vital: lastVital ? { lcp: +lastVital[1], cls: +lastVital[2], tbt: +lastVital[3] } : (vitalM ? { lcp: +vitalM[1], cls: +vitalM[2], tbt: +vitalM[3] } : null),
    res:   resM   ? { count: +resM[1], max: +resM[2] } : null,
  };
}

/** Accessibility: extrae violation summary y detalles */
function extractA11yMetrics(tc) {
  const o    = tc.output;
  const sumM = o.match(/Critical:\s*(\d+)\s*\|\s*Serious:\s*(\d+)\s*\|\s*Moderate:\s*(\d+)\s*\|\s*Minor:\s*(\d+)/);
  const violations = [];
  const violRe = /\[(CRITICAL|SERIOUS|MODERATE|MINOR)\]\s*([^\n:]+):\s*([^\n]+)/gi;
  let vm;
  while ((vm = violRe.exec(o)) !== null) {
    violations.push({ level: vm[1], rule: vm[2].trim(), desc: vm[3].trim() });
  }
  return {
    summary: sumM ? { critical: +sumM[1], serious: +sumM[2], moderate: +sumM[3], minor: +sumM[4] } : null,
    violations,
  };
}

/** Security: mapea nombre de testcase a categoría */
function securityCategory(tcName) {
  const n = tcName.toLowerCase();
  if (n.includes('brute') || n.includes('fuerza')) return 'Brute Force';
  if (n.includes('https') || n.includes('hsts') || n.includes('redirect') || n.includes('http →')) return 'HTTPS / TLS';
  if (n.includes('xss'))  return 'XSS';
  if (n.includes('sql'))  return 'SQL Injection';
  if (n.includes('header')) return 'Security Headers';
  if (n.includes('sensible') || n.includes('error')) return 'Info Leakage';
  return 'General';
}

/** Non-Functional: extrae tablas JMeter del system-out */
function extractNfTables(output) {
  const blocks = [];
  // Cada bloque comienza con "📡 <nombre> | <url>"
  const blockRe = /📡\s*(.+?)\s*\|\s*(https?:\/\/[^\n]+)\s*\n\s*📋\s*Tipo:\s*(\w+)([\s\S]*?)(?=📡|$)/gi;
  let bm;
  while ((bm = blockRe.exec(output)) !== null) {
    const name    = bm[1].trim();
    const url     = bm[2].trim();
    const tipo    = bm[3].trim().toUpperCase();
    const body    = bm[4];

    // Extraer filas de la tabla
    const rows    = [];
    const rowRe   = /\s*#(\d+)\s*│\s*(\d+)\s*│\s*(\d+)\s*│\s*([\d.]+)\s*│\s*([\d.]+)\s*│\s*([\d.]+)\s*│\s*([\d.]+\s*%)\s*│\s*([\d.]+)/g;
    let rm;
    while ((rm = rowRe.exec(body)) !== null) {
      rows.push({
        escenario: +rm[1], hilos: +rm[2], peticiones: +rm[3],
        prom: +rm[4], min: +rm[5], max: +rm[6],
        errorPct: rm[7].trim(), tps: +rm[8],
      });
    }
    // Total
    const totM = body.match(/TOTAL\s*│\s*-\s*│\s*(\d+)\s*│\s*([\d.]+)\s*│\s*([\d.]+)\s*│\s*([\d.]+)\s*│\s*([\d.]+\s*%)\s*│\s*([\d.]+)/);
    const total = totM ? { peticiones: +totM[1], prom: +totM[2], min: +totM[3], max: +totM[4], errorPct: totM[5].trim(), tps: +totM[6] } : null;
    const resultM = body.match(/RESULTADO:\s*([^\n]+)/);
    blocks.push({ name, url, tipo, rows, total, result: resultM ? resultM[1].trim() : '' });
  }
  return blocks;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS HTML
// ═══════════════════════════════════════════════════════════════════════════════

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmt(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms/1000).toFixed(2)}s`;
}
function fmtSec(s) {
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s/60)}m ${(s%60).toFixed(0).padStart(2,'0')}s`;
}
function passRate(t, f) { return t > 0 ? Math.round(((t-f)/t)*100) : 0; }

function statusBadge(passed) {
  return passed
    ? `<span class="badge b-pass">PASS</span>`
    : `<span class="badge b-fail">FAIL</span>`;
}

/** Gauge lineal para métricas con 3 umbrales: bueno / regular / malo */
function gauge(value, good, bad, unit='ms', decimals=0) {
  const val    = Number(value);
  const pct    = Math.min(100, (val / bad) * 100);
  const color  = val <= good ? '#10b981' : val <= bad ? '#f59e0b' : '#ef4444';
  const label  = val <= good ? 'Bueno' : val <= bad ? 'Regular' : 'Malo';
  const display = decimals > 0 ? val.toFixed(decimals) : val.toFixed(0);
  return `
  <div class="gauge-wrap">
    <div class="gauge-bar"><div class="gauge-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
    <div class="gauge-meta"><span style="color:${color};font-weight:600">${display}${unit}</span><span class="gauge-label">${label}</span></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RENDERIZADORES POR MÓDULO
// ═══════════════════════════════════════════════════════════════════════════════

/** UI: tabla por suite → navegador */
function renderUI(suiteList) {
  if (!suiteList.length) return noData();

  // Agrupar por suite-name base (sin hostname)
  const suiteMap = {};
  for (const s of suiteList) {
    const base = s.name.replace(/\\/g,'/').split('/').pop().replace('.spec.ts','');
    if (!suiteMap[base]) suiteMap[base] = [];
    suiteMap[base].push(s);
  }

  const browserIcon = { 'ui-chromium': '🟢 Chromium', 'ui-firefox': '🟠 Firefox', 'ui-webkit': '⚫ WebKit' };

  let html = `<div class="mod-section">
    <p class="mod-info">Pruebas funcionales ejecutadas en 3 navegadores. Se valida el flujo completo grabado desde el recording.</p>`;

  for (const [suite, rows] of Object.entries(suiteMap)) {
    const allPass = rows.every(r => r.failures === 0);
    html += `
    <div class="suite-block">
      <div class="suite-header">
        <span class="suite-name">📋 ${esc(suite)}</span>
        ${statusBadge(allPass)}
      </div>
      <table class="data-table">
        <thead><tr><th>Navegador</th><th>Tests</th><th>Pasaron</th><th>Fallaron</th><th>Tiempo</th><th>Estado</th></tr></thead>
        <tbody>`;
    for (const r of rows) {
      const br = browserIcon[r.hostname] || r.hostname;
      html += `<tr class="${r.failures > 0 ? 'row-fail' : ''}">
        <td>${br}</td><td>${r.tests}</td><td class="c-pass">${r.tests - r.failures}</td>
        <td class="c-fail">${r.failures}</td><td>${fmtSec(r.time)}</td><td>${statusBadge(r.failures === 0)}</td>
      </tr>`;
      // Detalles de fallos
      for (const tc of r.testcases) {
        if (!tc.passed && tc.failure) {
          html += `<tr class="row-detail"><td colspan="6"><pre class="error-msg">${esc(tc.failure.substring(0,400))}${tc.failure.length>400?'…':''}</pre></td></tr>`;
        }
      }
    }
    html += `</tbody></table></div>`;
  }
  html += `</div>`;
  return html;
}

/** API: tabla por endpoint/método */
function renderAPI(suiteList) {
  if (!suiteList.length) return noData();
  let html = `<div class="mod-section">
    <p class="mod-info">Validación de servicios REST y SOAP: contratos de respuesta, códigos HTTP y schemas.</p>
    <table class="data-table">
      <thead><tr><th>Suite / Spec</th><th>Test Case</th><th>Tipo</th><th>Tiempo</th><th>Estado</th></tr></thead><tbody>`;

  for (const s of suiteList) {
    const specName = s.name.replace(/\\/g,'/').split('/').pop().replace('.spec.ts','');
    const type = specName.toUpperCase().includes('SOAP') ? '🧼 SOAP' : '🌐 REST';
    for (const tc of s.testcases) {
      html += `<tr class="${tc.passed?'':'row-fail'}">
        <td class="cell-mono">${esc(specName)}</td>
        <td>${esc(tc.name)}</td><td>${type}</td>
        <td>${fmtSec(tc.time)}</td><td>${statusBadge(tc.passed)}</td>
      </tr>`;
      if (!tc.passed && tc.failure) {
        html += `<tr class="row-detail"><td colspan="5"><pre class="error-msg">${esc(tc.failure.substring(0,300))}…</pre></td></tr>`;
      }
    }
  }
  html += `</tbody></table></div>`;
  return html;
}

/** Performance: cards con métricas visuales */
function renderPerformance(suiteList) {
  if (!suiteList.length) return noData();

  // Umbrales estándar
  const thresholds = {
    lcp:  { good: 2500,  bad: 4000,  unit:'ms', label:'LCP',  desc:'Largest Contentful Paint — tiempo hasta el mayor elemento visible' },
    cls:  { good: 0.1,   bad: 0.25,  unit:'',   label:'CLS',  desc:'Cumulative Layout Shift — estabilidad visual del layout', decimals: 4 },
    tbt:  { good: 200,   bad: 600,   unit:'ms', label:'TBT',  desc:'Total Blocking Time — tiempo de bloqueo del hilo principal' },
    dom:  { good: 3000,  bad: 8000,  unit:'ms', label:'DOM Load',  desc:'Tiempo hasta DOMContentLoaded' },
    full: { good: 5000,  bad: 10000, unit:'ms', label:'Full Load', desc:'Tiempo hasta carga completa de la página' },
  };

  let html = `<div class="mod-section">
    <p class="mod-info">Métricas de rendimiento según estándares Google Core Web Vitals (CWV) y tiempos de carga.</p>
    <div class="perf-legend">
      <span class="leg-item"><span class="leg-dot" style="background:#10b981"></span>Bueno</span>
      <span class="leg-item"><span class="leg-dot" style="background:#f59e0b"></span>Regular</span>
      <span class="leg-item"><span class="leg-dot" style="background:#ef4444"></span>Malo</span>
    </div>
    <div class="thresholds-table">
      <table class="data-table sm-table">
        <thead><tr><th>Métrica</th><th>Descripción</th><th>Bueno</th><th>Regular</th><th>Malo</th></tr></thead>
        <tbody>
          <tr><td><b>LCP</b></td><td>Largest Contentful Paint</td><td class="c-pass">&lt; 2.5s</td><td class="c-warn">2.5s – 4s</td><td class="c-fail">&gt; 4s</td></tr>
          <tr><td><b>CLS</b></td><td>Cumulative Layout Shift</td><td class="c-pass">&lt; 0.1</td><td class="c-warn">0.1 – 0.25</td><td class="c-fail">&gt; 0.25</td></tr>
          <tr><td><b>TBT</b></td><td>Total Blocking Time</td><td class="c-pass">&lt; 200ms</td><td class="c-warn">200 – 600ms</td><td class="c-fail">&gt; 600ms</td></tr>
          <tr><td><b>DOM</b></td><td>DOMContentLoaded</td><td class="c-pass">&lt; 3s</td><td class="c-warn">3s – 8s</td><td class="c-fail">&gt; 8s</td></tr>
          <tr><td><b>Full Load</b></td><td>Carga completa</td><td class="c-pass">&lt; 5s</td><td class="c-warn">5s – 10s</td><td class="c-fail">&gt; 10s</td></tr>
        </tbody>
      </table>
    </div>`;

  for (const s of suiteList) {
    const sname = s.name.replace(/\\/g,'/').split('/').slice(-3,-1).join(' › ');
    for (const tc of s.testcases) {
      const m = extractPerfMetrics(tc);
      const hasData = m.load || m.vital || m.res;
      html += `
      <div class="perf-card ${tc.passed?'':'perf-card-fail'}">
        <div class="perf-card-header">
          <span class="perf-tc-name">${esc(tc.name)}</span>
          ${statusBadge(tc.passed)}
          <span class="perf-time">⏱ ${fmtSec(tc.time)}</span>
        </div>`;

      if (m.vital) {
        html += `<div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-label">📊 LCP <span class="metric-hint">${thresholds.lcp.desc}</span></div>
            ${gauge(m.vital.lcp, thresholds.lcp.good, thresholds.lcp.bad, 'ms')}
          </div>
          <div class="metric-item">
            <div class="metric-label">📊 CLS <span class="metric-hint">${thresholds.cls.desc}</span></div>
            ${gauge(m.vital.cls, thresholds.cls.good, thresholds.cls.bad, '', 4)}
          </div>
          <div class="metric-item">
            <div class="metric-label">📊 TBT <span class="metric-hint">${thresholds.tbt.desc}</span></div>
            ${gauge(m.vital.tbt, thresholds.tbt.good, thresholds.tbt.bad, 'ms')}
          </div>
        </div>`;
      }
      if (m.load) {
        html += `<div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-label">⏱ DOM Load <span class="metric-hint">${thresholds.dom.desc}</span></div>
            ${gauge(m.load.dom, thresholds.dom.good, thresholds.dom.bad, 'ms')}
          </div>
          <div class="metric-item">
            <div class="metric-label">⏱ Full Load <span class="metric-hint">${thresholds.full.desc}</span></div>
            ${gauge(m.load.full, thresholds.full.good, thresholds.full.bad, 'ms')}
          </div>
          <div class="metric-item">
            <div class="metric-label">🎯 Budget</div>
            <div class="budget-pill" style="background:${m.load.full<=m.load.budget?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}">
              ${m.load.full<=m.load.budget?'✅':'❌'} ${fmtSec(m.load.full)} / ${fmtSec(m.load.budget)} budget
            </div>
          </div>
        </div>`;
      }
      if (m.res) {
        html += `<div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-label">📦 Recursos de Red <span class="metric-hint">Número de peticiones cargadas (imágenes, scripts, estilos…)</span></div>
            ${gauge(m.res.count, m.res.max * 0.5, m.res.max, ' recursos')}
          </div>
        </div>`;
      }
      if (!hasData && !tc.passed && tc.failure) {
        html += `<pre class="error-msg">${esc(tc.failure.substring(0,300))}</pre>`;
      }
      html += `</div>`;
    }
  }
  html += `</div>`;
  return html;
}

/** Security: agrupado por categoría con descripción de qué evalúa cada check */
function renderSecurity(suiteList) {
  if (!suiteList.length) return noData();

  const categoryInfo = {
    'Security Headers': {
      icon: '🛡️',
      desc: 'Verifica presencia de cabeceras HTTP de seguridad críticas.',
      checks: ['Content-Security-Policy (CSP)', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']
    },
    'XSS': {
      icon: '💉',
      desc: 'Inyección de scripts maliciosos — valida que el servidor no ejecute HTML/JS no confiable.',
      checks: ['Inyección de <script> en campos de entrada', 'Reflejo de payload en respuesta', 'Ejecución de alert() en DOM']
    },
    'SQL Injection': {
      icon: '🗄️',
      desc: 'Inyección SQL — valida que los inputs no manipulen consultas de base de datos.',
      checks: ["Payload clásico: ' OR '1'='1", 'Respuesta 400/403 o sin datos sensibles', 'No exposición de stack traces SQL']
    },
    'HTTPS / TLS': {
      icon: '🔐',
      desc: 'Validación de transporte seguro y políticas de cifrado.',
      checks: ['URL base usa HTTPS', 'Redirección automática HTTP → HTTPS', 'Header HSTS (Strict-Transport-Security) presente']
    },
    'Brute Force': {
      icon: '🤖',
      desc: 'Protección contra ataques de fuerza bruta en formularios de autenticación.',
      checks: ['Bloqueo tras N intentos fallidos via API', 'Bloqueo tras N intentos fallidos via UI', 'No revelar información sensible en respuesta de error']
    },
    'Info Leakage': {
      icon: '🕵️',
      desc: 'Prevención de fuga de información sensible en mensajes de error.',
      checks: ['Mensajes genéricos en respuestas de error', 'Sin stack traces ni rutas internas expuestas']
    },
    'General': { icon: '🔒', desc: 'Otros controles de seguridad.', checks: [] },
  };

  // Agrupar testcases por categoría
  const grouped = {};
  for (const s of suiteList) {
    for (const tc of s.testcases) {
      const cat = securityCategory(tc.name);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(tc);
    }
  }

  let html = `<div class="mod-section">
    <p class="mod-info">Controles de seguridad automatizados según OWASP Top-10. Se evalúa cabeceras, inyecciones, cifrado y protección de autenticación.</p>`;

  for (const [cat, tcs] of Object.entries(grouped)) {
    const info    = categoryInfo[cat] || categoryInfo['General'];
    const allPass = tcs.every(t => t.passed);
    html += `
    <div class="suite-block">
      <div class="suite-header">
        <span class="suite-name">${info.icon} ${cat}</span>
        ${statusBadge(allPass)}
      </div>
      <p class="sec-desc">${info.desc}</p>`;

    if (info.checks.length) {
      html += `<div class="sec-checks">
        <span class="sec-checks-label">¿Qué evalúa?</span>
        <ul>${info.checks.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
      </div>`;
    }

    html += `<table class="data-table"><thead><tr><th>Test Case</th><th>Tiempo</th><th>Estado</th></tr></thead><tbody>`;
    for (const tc of tcs) {
      html += `<tr class="${tc.passed?'':'row-fail'}">
        <td>${esc(tc.name)}</td><td>${fmtSec(tc.time)}</td><td>${statusBadge(tc.passed)}</td>
      </tr>`;
      if (!tc.passed && tc.failure) {
        html += `<tr class="row-detail"><td colspan="3"><pre class="error-msg">${esc(tc.failure.substring(0,300))}</pre></td></tr>`;
      }
    }
    html += `</tbody></table></div>`;
  }
  html += `</div>`;
  return html;
}

/** Accessibility: niveles WCAG + listado de violaciones */
function renderAccessibility(suiteList) {
  if (!suiteList.length) return noData();

  const wcagInfo = {
    CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: '🔴', desc: 'Bloquea el acceso para usuarios con discapacidad. Impacto máximo.' },
    SERIOUS:  { color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: '🟠', desc: 'Dificulta gravemente el acceso. Debe corregirse urgente.' },
    MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🟡', desc: 'Causa problemas significativos a algunos usuarios.' },
    MINOR:    { color: '#84cc16', bg: 'rgba(132,204,22,0.1)', icon: '🟢', desc: 'Mejora menor de experiencia accesible.' },
  };

  let html = `<div class="mod-section">
    <p class="mod-info">Análisis automático con <b>axe-core</b> siguiendo el estándar <b>WCAG 2.1 AA</b>. Se detectan violaciones por nivel de severidad.</p>
    <div class="a11y-legend">
      ${Object.entries(wcagInfo).map(([lvl, i]) => `
      <div class="a11y-leg-item" style="border-color:${i.color};background:${i.bg}">
        <span>${i.icon} <b>${lvl}</b></span>
        <span class="a11y-leg-desc">${i.desc}</span>
      </div>`).join('')}
    </div>
    <div class="a11y-params">
      <b>Parámetros evaluados por axe-core:</b>
      <ul>
        <li><code>color-contrast</code> — Ratio de contraste foreground/background (mín 4.5:1 AA)</li>
        <li><code>image-alt</code> — Atributo alt en imágenes</li>
        <li><code>label</code> — Etiquetas asociadas a inputs de formulario</li>
        <li><code>landmark-one-main</code> — Estructura semántica con &lt;main&gt;</li>
        <li><code>region</code> — Contenido encapsulado en landmarks ARIA</li>
        <li><code>heading-order</code> — Jerarquía correcta de encabezados h1-h6</li>
        <li><code>button-name</code> — Botones con nombre accesible</li>
        <li><code>link-name</code> — Anclas con texto descriptivo</li>
      </ul>
    </div>`;

  for (const s of suiteList) {
    for (const tc of s.testcases) {
      const m = extractA11yMetrics(tc);
      html += `
      <div class="suite-block">
        <div class="suite-header">
          <span class="suite-name">♿ ${esc(tc.name)}</span>
          ${statusBadge(tc.passed)}
        </div>`;

      if (m.summary) {
        const totalViol = m.summary.critical + m.summary.serious + m.summary.moderate + m.summary.minor;
        html += `<div class="a11y-summary">
          ${Object.entries(m.summary).map(([k, v]) => {
            const info = wcagInfo[k.toUpperCase()] || {};
            return `<div class="a11y-count" style="border-color:${info.color||'#64748b'};background:${info.bg||'transparent'}">
              <span class="a11y-count-num" style="color:${info.color||'#fff'}">${v}</span>
              <span class="a11y-count-lbl">${info.icon||''} ${k}</span>
            </div>`;
          }).join('')}
          <div class="a11y-count" style="border-color:#64748b">
            <span class="a11y-count-num">${totalViol}</span>
            <span class="a11y-count-lbl">Total</span>
          </div>
        </div>`;
      }

      if (m.violations.length) {
        html += `<div class="a11y-violations">
          <p class="a11y-viol-title">Violaciones detectadas:</p>`;
        for (const v of m.violations) {
          const info = wcagInfo[v.level] || {};
          html += `<div class="a11y-viol-item" style="border-left:3px solid ${info.color||'#64748b'}">
            <span class="a11y-viol-badge" style="background:${info.color||'#64748b'}">${v.level}</span>
            <span class="a11y-viol-rule"><code>${esc(v.rule)}</code></span>
            <span class="a11y-viol-desc">${esc(v.desc)}</span>
          </div>`;
        }
        html += `</div>`;
      } else if (m.summary && (m.summary.critical + m.summary.serious) === 0) {
        html += `<div class="a11y-ok">✅ Sin violaciones críticas ni severas — cumple WCAG 2.1 AA</div>`;
      }
      html += `</div>`;
    }
  }
  html += `</div>`;
  return html;
}

/** Visual: comparación de screenshots */
function renderVisual(suiteList) {
  if (!suiteList.length) return noData();
  let html = `<div class="mod-section">
    <p class="mod-info">Regresión visual por comparación pixel a pixel de screenshots. Un fallo indica diferencias visuales respecto al baseline aprobado.</p>
    <table class="data-table">
      <thead><tr><th>Test Case</th><th>Suite</th><th>Tiempo</th><th>Estado</th></tr></thead><tbody>`;

  for (const s of suiteList) {
    const sname = s.name.replace(/\\/g,'/').split('/').pop().replace('.spec.ts','');
    for (const tc of s.testcases) {
      html += `<tr class="${tc.passed?'':'row-fail'}">
        <td>${esc(tc.name)}</td><td class="cell-mono">${esc(sname)}</td>
        <td>${fmtSec(tc.time)}</td><td>${statusBadge(tc.passed)}</td>
      </tr>`;
      if (!tc.passed && tc.failure) {
        html += `<tr class="row-detail"><td colspan="4"><pre class="error-msg">${esc(tc.failure.substring(0,300))}</pre></td></tr>`;
      }
    }
  }
  html += `</tbody></table></div>`;
  return html;
}

/** BDD: features y escenarios */
function renderBDD(suiteList) {
  if (!suiteList.length) return noData();
  let html = `<div class="mod-section">
    <p class="mod-info">Escenarios en lenguaje natural Gherkin ejecutados con Playwright-BDD. Cada testcase corresponde a un escenario del archivo .feature.</p>
    <table class="data-table">
      <thead><tr><th>Escenario</th><th>Suite</th><th>Tiempo</th><th>Estado</th></tr></thead><tbody>`;

  for (const s of suiteList) {
    const sname = s.name.replace(/\\/g,'/').split('/').pop().replace('.spec.ts','');
    for (const tc of s.testcases) {
      html += `<tr class="${tc.passed?'':'row-fail'}">
        <td>${esc(tc.name)}</td><td class="cell-mono">${esc(sname)}</td>
        <td>${fmtSec(tc.time)}</td><td>${statusBadge(tc.passed)}</td>
      </tr>`;
      if (!tc.passed && tc.failure) {
        html += `<tr class="row-detail"><td colspan="4"><pre class="error-msg">${esc(tc.failure.substring(0,300))}</pre></td></tr>`;
      }
    }
  }
  html += `</tbody></table></div>`;
  return html;
}

/** Non-Functional: tablas JMeter parseadas */
function renderNonFunctional(suiteList) {
  if (!suiteList.length) return noData();

  let html = `<div class="mod-section">
    <p class="mod-info">Pruebas de carga incremental y picos (spike) contra endpoints REST/SOAP. Métricas estilo JMeter: hilos, peticiones, tiempos y tasa de error.</p>
    <div class="nf-params">
      <b>Parámetros medidos:</b>
      <ul>
        <li><b>Hilos</b> — Usuarios virtuales concurrentes</li>
        <li><b>Peticiones</b> — Total de requests enviados en el escenario</li>
        <li><b>Prom(ms)</b> — Tiempo de respuesta promedio</li>
        <li><b>Mín / Máx(ms)</b> — Tiempos extremos de respuesta</li>
        <li><b>% Error</b> — Porcentaje de peticiones con error (&gt;= 5% = alerta, &gt;= 20% = fallo)</li>
        <li><b>TPS</b> — Transacciones Por Segundo (throughput)</li>
      </ul>
    </div>`;

  for (const s of suiteList) {
    for (const tc of s.testcases) {
      const blocks = extractNfTables(tc.output);
      html += `
      <div class="suite-block">
        <div class="suite-header">
          <span class="suite-name">📈 ${esc(tc.name)}</span>
          ${statusBadge(tc.passed)}
        </div>`;

      if (blocks.length === 0) {
        html += `<p class="mod-info" style="color:var(--muted)">Sin datos de tabla en el output.</p>`;
      }
      for (const blk of blocks) {
        const errorNum = parseFloat(blk.total ? blk.total.errorPct : '0');
        const resultColor = errorNum === 0 ? '#10b981' : errorNum < 20 ? '#f59e0b' : '#ef4444';
        const tipoIcon = blk.tipo === 'SPIKE' ? '⚡' : '🔼';
        html += `
        <div class="nf-block">
          <div class="nf-block-header">
            <span>${tipoIcon} <b>${esc(blk.name)}</b></span>
            <span class="nf-url">${esc(blk.url)}</span>
            <span class="nf-tipo-badge">${blk.tipo}</span>
          </div>
          <table class="data-table nf-table">
            <thead>
              <tr><th>Escenario</th><th>Hilos</th><th>Peticiones</th><th>Prom(ms)</th><th>Mín(ms)</th><th>Máx(ms)</th><th>% Error</th><th>TPS</th></tr>
            </thead><tbody>`;
        for (const row of blk.rows) {
          const ep = parseFloat(row.errorPct);
          const ec = ep >= 20 ? 'c-fail' : ep >= 5 ? 'c-warn' : 'c-pass';
          html += `<tr>
            <td>#${row.escenario}</td><td>${row.hilos}</td><td>${row.peticiones}</td>
            <td>${row.prom}</td><td>${row.min}</td><td>${row.max}</td>
            <td class="${ec}">${row.errorPct}</td><td>${row.tps.toFixed(2)}</td>
          </tr>`;
        }
        if (blk.total) {
          const ep2 = parseFloat(blk.total.errorPct);
          const ec2 = ep2 >= 20 ? 'c-fail' : ep2 >= 5 ? 'c-warn' : 'c-pass';
          html += `<tr class="nf-total-row">
            <td><b>TOTAL</b></td><td>—</td><td>${blk.total.peticiones}</td>
            <td>${blk.total.prom}</td><td>${blk.total.min}</td><td>${blk.total.max}</td>
            <td class="${ec2}"><b>${blk.total.errorPct}</b></td><td>${blk.total.tps.toFixed(2)}</td>
          </tr>`;
        }
        html += `</tbody></table>`;
        if (blk.result) {
          html += `<div class="nf-result" style="color:${resultColor}">
            ${errorNum === 0 ? '✅' : '❌'} ${esc(blk.result)}
          </div>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }
  }
  html += `</div>`;
  return html;
}

function noData() {
  return `<div class="no-data">
    <span>📭</span>
    <p>No hay datos para este tipo de prueba en la última ejecución.</p>
    <p>Ejecuta <code>npm test</code> para generar resultados.</p>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GRILLA DE EVIDENCIAS
// ═══════════════════════════════════════════════════════════════════════════════

/** Genera la grilla de evidencias (screenshot, video, trace, error-context)
 *  para todos los testcases de un grupo de suites.
 *  La grilla se añade al FINAL de cada tab, sin tocar el contenido ya existente.
 */
function renderEvidenceGrid(suiteList) {
  // Recopilar todos los testcases con adjuntos
  const allTc = [];
  for (const s of suiteList) {
    for (const tc of s.testcases) {
      if (tc.attachments && tc.attachments.length > 0) {
        allTc.push({ tc, hostname: s.hostname });
      }
    }
  }
  if (!allTc.length) return '';

  const typeIcon  = { screenshot: '📸', video: '🎬', trace: '🔍', 'error-context': '📋', other: '📎' };
  const typeLabel = { screenshot: 'Screenshot', video: 'Video', trace: 'Trace', 'error-context': 'Error Context', other: 'Archivo' };

  let html = `
  <div class="ev-section">
    <div class="ev-section-header">
      <span class="ev-section-title">🗂️ Evidencias de Ejecución</span>
      <span class="ev-section-sub">${allTc.length} test(s) con evidencia adjunta</span>
    </div>`;

  for (const { tc, hostname } of allTc) {
    const runs = groupAttachmentsByRun(tc.attachments);
    const tcId = 'tc-' + Math.random().toString(36).slice(2, 8);

    html += `
    <div class="ev-tc-block ${tc.passed ? '' : 'ev-tc-fail'}">
      <div class="ev-tc-header">
        <span class="ev-tc-status">${tc.passed ? '✅' : '❌'}</span>
        <span class="ev-tc-name">${esc(tc.name)}</span>
        ${hostname ? `<span class="ev-tc-browser">${esc(hostname)}</span>` : ''}
        <span class="ev-tc-time">⏱ ${fmtSec(tc.time)}</span>
        <button class="ev-toggle-btn" onclick="toggleEvidence('${tcId}')">Ver evidencias ▾</button>
      </div>
      <div class="ev-runs-wrap" id="${tcId}" style="display:none">`;

    for (const run of runs) {
      const isRetry = run.folder.includes('-retry');
      html += `
        <div class="ev-run ${isRetry ? 'ev-run-retry' : ''}">
          <div class="ev-run-label">
            ${isRetry ? '🔄' : '▶'} <b>${esc(run.label)}</b>
            <span class="ev-run-folder">${esc(run.folder)}</span>
          </div>
          <div class="ev-cards">`;

      for (const att of run.files) {
        if (att.type === 'screenshot') {
          html += `
            <div class="ev-card ev-card-img" onclick="openLightbox('${att.url}', '${esc(tc.name)}')" title="Ver screenshot">
              <div class="ev-card-thumb">
                <img src="${att.url}" alt="${esc(att.file)}" loading="lazy" onerror="this.parentNode.innerHTML='<span class=ev-img-fallback>📸</span>'"/>
              </div>
              <div class="ev-card-footer">
                <span>${typeIcon.screenshot}</span>
                <span>${esc(att.file)}</span>
              </div>
            </div>`;

        } else if (att.type === 'video') {
          html += `
            <div class="ev-card ev-card-video">
              <div class="ev-card-thumb ev-video-thumb">
                <video src="${att.url}" preload="metadata" muted
                  onclick="this.paused ? this.play() : this.pause()"
                  title="Click para reproducir/pausar"></video>
                <div class="ev-play-overlay" onclick="playVideo(this)">▶</div>
              </div>
              <div class="ev-card-footer">
                <span>${typeIcon.video}</span>
                <span>${esc(att.file)}</span>
                <a href="${att.url}" download class="ev-dl-link" title="Descargar" onclick="event.stopPropagation()">⬇</a>
              </div>
            </div>`;

        } else if (att.type === 'trace') {
          const traceCmd = `npx playwright show-trace test-results/${att.folder}/${att.file}`;
          html += `
            <div class="ev-card ev-card-trace">
              <div class="ev-card-thumb ev-trace-thumb">
                <span class="ev-trace-icon">🔍</span>
                <span class="ev-trace-label">Playwright<br/>Trace</span>
              </div>
              <div class="ev-card-footer">
                <span>${typeIcon.trace} Trace ZIP</span>
                <a href="${att.url}" download class="ev-dl-link" title="Descargar trace">⬇</a>
              </div>
              <div class="ev-trace-cmd" onclick="copyCmd(this)" title="Click para copiar">${esc(traceCmd)}</div>
            </div>`;

        } else if (att.type === 'error-context') {
          html += `
            <div class="ev-card ev-card-err">
              <div class="ev-card-thumb ev-err-thumb">
                <span>📋</span>
                <span class="ev-trace-label">Error<br/>Context</span>
              </div>
              <div class="ev-card-footer">
                <span>${typeIcon['error-context']} ${esc(att.file)}</span>
                <a href="${att.url}" target="_blank" class="ev-dl-link" title="Abrir">↗</a>
              </div>
            </div>`;
        }
      }

      html += `</div></div>`; // ev-cards, ev-run
    }

    html += `</div></div>`; // ev-runs-wrap, ev-tc-block
  }

  html += `</div>`; // ev-section
  return html;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BUILDER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

function renderModuleContent(key, suiteList) {
  let body;
  switch (key) {
    case 'ui':            body = renderUI(suiteList);            break;
    case 'api':           body = renderAPI(suiteList);           break;
    case 'performance':   body = renderPerformance(suiteList);   break;
    case 'security':      body = renderSecurity(suiteList);      break;
    case 'accessibility': body = renderAccessibility(suiteList); break;
    case 'visual':        body = renderVisual(suiteList);        break;
    case 'bdd':           body = renderBDD(suiteList);           break;
    case 'nonfunctional': body = renderNonFunctional(suiteList); break;
    default:              return noData();
  }
  // Añade la grilla de evidencias al final de cada tab
  return body + renderEvidenceGrid(suiteList);
}

function buildPortalHTML(groups, totals, generatedAt) {
  const globalPassed = totals.tests - totals.failures - totals.errors;
  const globalRate   = totals.tests > 0 ? Math.round((globalPassed / totals.tests) * 100) : 0;
  const globalOk     = totals.failures === 0 && totals.errors === 0;
  const globalColor  = globalOk ? '#10b981' : '#ef4444';

  // Donut SVG helper
  const arcLen = 2 * Math.PI * 18;
  function donut(pct, color) {
    const dash = (pct / 100) * arcLen;
    return `<svg viewBox="0 0 44 44" class="donut">
      <circle cx="22" cy="22" r="18" fill="none" stroke="#1e2538" stroke-width="5"/>
      <circle cx="22" cy="22" r="18" fill="none" stroke="${color}" stroke-width="5"
        stroke-dasharray="${dash.toFixed(2)} ${arcLen.toFixed(2)}"
        stroke-dashoffset="${(arcLen*0.25).toFixed(2)}" stroke-linecap="round"/>
    </svg>`;
  }

  // Summary cards del overview
  const summaryCards = MODULES.map(mod => {
    const list  = groups[mod.key] || [];
    const s     = stats(list);
    const rate  = passRate(s.tests, s.failures);
    const ok    = s.failures === 0;
    const status = s.tests === 0 ? 'SIN DATOS' : ok ? 'PASS' : s.failures < s.tests ? 'PARCIAL' : 'FAIL';
    const scls   = s.tests === 0 ? 'status-none' : ok ? 'status-pass' : s.failures < s.tests ? 'status-partial' : 'status-fail';
    return `
    <div class="card" style="--accent:${mod.color};--glow:${mod.glow}" onclick="showSection('${mod.key}')">
      <div class="card-top-bar" style="background:${mod.color}"></div>
      <div class="card-header">
        <span class="card-icon">${mod.icon}</span>
        <span class="card-label">${mod.label}</span>
        <span class="badge ${scls}">${status}</span>
      </div>
      <div class="card-body">
        <div class="donut-wrap">
          ${donut(rate, mod.color)}
          <span class="donut-pct" style="color:${mod.color}">${s.tests>0 ? rate+'%' : '—'}</span>
        </div>
        <div class="stats">
          <div class="stat-row"><span class="stat-dot pass-dot"></span><span class="stat-num">${s.tests - s.failures}</span><span class="stat-lbl">Pasaron</span></div>
          <div class="stat-row"><span class="stat-dot fail-dot"></span><span class="stat-num">${s.failures}</span><span class="stat-lbl">Fallaron</span></div>
          <div class="stat-row"><span class="stat-dot" style="background:${mod.color}"></span><span class="stat-num">${s.tests}</span><span class="stat-lbl">Total</span></div>
          ${s.time > 0 ? `<div class="stat-row"><span style="color:var(--muted);font-size:11px">⏱ ${fmtSec(s.time)}</span></div>` : ''}
        </div>
      </div>
      <button class="btn-detail" onclick="event.stopPropagation(); showSection('${mod.key}')">Ver detalle →</button>
    </div>`;
  }).join('\n');

  // Secciones individuales por módulo
  const sections = MODULES.map(mod => {
    const list = groups[mod.key] || [];
    const s    = stats(list);
    const rate = passRate(s.tests, s.failures);
    const ok   = s.failures === 0;
    const content = renderModuleContent(mod.key, list);
    return `
  <section id="sec-${mod.key}" class="mod-section-wrap" style="display:none">
    <div class="mod-header" style="--accent:${mod.color}">
      <div class="mod-title">${mod.icon} ${mod.label}</div>
      <div class="mod-stats-row">
        <span class="ms-item"><b style="color:var(--pass)">${s.tests - s.failures}</b> pasaron</span>
        <span class="ms-sep">·</span>
        <span class="ms-item"><b style="color:var(--fail)">${s.failures}</b> fallaron</span>
        <span class="ms-sep">·</span>
        <span class="ms-item"><b>${s.tests}</b> total</span>
        <span class="ms-sep">·</span>
        <span class="ms-item" style="color:${mod.color}"><b>${rate}%</b> éxito</span>
        ${s.time > 0 ? `<span class="ms-sep">·</span><span class="ms-item">⏱ ${fmtSec(s.time)}</span>` : ''}
      </div>
    </div>
    ${content}
  </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>QA Portal — Test Automation Dashboard</title>
  <style>
    /* ─── Reset ──────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:#0d0f1a; --surface:#111827; --surface2:#1a2035; --border:#1e2a45;
      --text:#e2e8f0; --muted:#64748b; --pass:#10b981; --fail:#ef4444;
      --warn:#f59e0b; --font:'Segoe UI',system-ui,-apple-system,sans-serif;
    }
    html,body { height:100%; }
    body { background:var(--bg); color:var(--text); font-family:var(--font); min-height:100vh; overflow-x:hidden; }
    body::before {
      content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
      background:
        radial-gradient(ellipse 80% 60% at 10% 20%,rgba(99,102,241,.07) 0%,transparent 60%),
        radial-gradient(ellipse 60% 50% at 90% 80%,rgba(16,185,129,.06) 0%,transparent 55%);
    }

    /* ─── Header ─────────────────────────────── */
    .header { position:relative; z-index:10; padding:28px 48px 22px; border-bottom:1px solid var(--border);
      background:rgba(17,24,39,.85); backdrop-filter:blur(12px);
      display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap; }
    .logo-wrap { display:flex; align-items:center; gap:14px; }
    .logo-icon { width:50px; height:50px; border-radius:13px; background:linear-gradient(135deg,#6366f1,#8b5cf6);
      display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 0 22px rgba(99,102,241,.45); }
    .logo-title { font-size:20px; font-weight:700; color:#fff; }
    .logo-sub   { font-size:12px; color:var(--muted); }
    .global-badge { display:flex; align-items:center; gap:12px; background:var(--surface2);
      border:1px solid var(--border); border-radius:12px; padding:10px 18px; }
    .global-circle { width:42px; height:42px; border-radius:50%; border:3px solid ${globalColor};
      display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;
      color:${globalColor}; box-shadow:0 0 12px ${globalColor}44; }
    .global-status { font-size:15px; font-weight:700; color:${globalColor}; }
    .global-detail { font-size:12px; color:var(--muted); }
    .meta-info { font-size:12px; color:var(--muted); text-align:right; line-height:1.9; }
    .meta-info b { color:var(--text); }

    /* ─── Nav ────────────────────────────────── */
    .nav-bar { position:relative; z-index:10; padding:0 48px; background:rgba(17,24,39,.6);
      border-bottom:1px solid var(--border); display:flex; gap:2px; overflow-x:auto; }
    .nav-bar::-webkit-scrollbar { height:3px; }
    .nav-bar::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
    .nav-btn { padding:13px 16px; font-size:13px; font-weight:500; color:var(--muted);
      background:none; border:none; cursor:pointer; white-space:nowrap;
      border-bottom:2px solid transparent; transition:color .2s,border-color .2s; }
    .nav-btn:hover { color:var(--text); }
    .nav-btn.active { color:#fff; border-bottom-color:#6366f1; }

    /* ─── Main ───────────────────────────────── */
    .main { position:relative; z-index:5; padding:36px 48px; display:flex; flex-direction:column; gap:32px; }
    .section-title { font-size:12px; font-weight:600; text-transform:uppercase;
      letter-spacing:1.2px; color:var(--muted); margin-bottom:18px; }

    /* ─── Summary bar ────────────────────────── */
    .summary-bar { display:flex; gap:14px; flex-wrap:wrap; }
    .sum-card { flex:1; min-width:140px; background:var(--surface); border:1px solid var(--border);
      border-radius:12px; padding:16px 20px; }
    .sum-label { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.8px; display:block; margin-bottom:4px; }
    .sum-value { font-size:26px; font-weight:700; display:block; }
    .c-pass  { color:var(--pass); }
    .c-fail  { color:var(--fail); }
    .c-warn  { color:var(--warn); }
    .c-neutral { color:#fff; }

    /* ─── Cards grid ─────────────────────────── */
    .cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:18px; }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:16px;
      padding:0 22px 20px; cursor:pointer; position:relative; overflow:hidden;
      transition:transform .2s,box-shadow .2s,border-color .2s;
      animation:fadeUp .4s ease both; }
    .card:hover { transform:translateY(-4px); box-shadow:0 12px 36px var(--glow),0 4px 14px rgba(0,0,0,.4); border-color:var(--accent); }
    .card-top-bar { height:3px; margin:0 -22px 18px; width:calc(100% + 44px); opacity:.85; }
    .card-header { display:flex; align-items:center; gap:10px; margin-bottom:18px; }
    .card-icon   { font-size:20px; }
    .card-label  { font-size:14px; font-weight:600; color:#fff; flex:1; }
    .card-body   { display:flex; align-items:center; gap:18px; margin-bottom:14px; }
    .donut-wrap  { position:relative; width:68px; height:68px; flex-shrink:0; }
    .donut       { width:100%; height:100%; transform:rotate(-90deg); }
    .donut-pct   { position:absolute; inset:0; display:flex; align-items:center;
      justify-content:center; font-size:13px; font-weight:700; }
    .stats       { display:flex; flex-direction:column; gap:5px; flex:1; }
    .stat-row    { display:flex; align-items:center; gap:7px; font-size:12px; }
    .stat-dot    { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .pass-dot    { background:var(--pass); }
    .fail-dot    { background:var(--fail); }
    .stat-num    { font-weight:600; color:#fff; min-width:24px; }
    .stat-lbl    { color:var(--muted); }
    .btn-detail  { width:100%; padding:8px; background:transparent; border:1px solid var(--accent);
      color:var(--accent); border-radius:8px; font-size:12px; cursor:pointer; transition:background .2s,color .2s; }
    .btn-detail:hover { background:var(--accent); color:#fff; }

    /* ─── Badges ─────────────────────────────── */
    .badge { font-size:10px; font-weight:700; letter-spacing:.7px; padding:3px 8px;
      border-radius:20px; text-transform:uppercase; white-space:nowrap; }
    .b-pass,.status-pass   { background:rgba(16,185,129,.15); color:var(--pass); border:1px solid rgba(16,185,129,.3); }
    .b-fail,.status-fail   { background:rgba(239,68,68,.15);  color:var(--fail); border:1px solid rgba(239,68,68,.3); }
    .status-partial { background:rgba(245,158,11,.15); color:var(--warn); border:1px solid rgba(245,158,11,.3); }
    .status-none    { background:rgba(100,116,139,.15);color:var(--muted);border:1px solid rgba(100,116,139,.3); }

    /* ─── Module section ─────────────────────── */
    .mod-section-wrap { display:flex; flex-direction:column; gap:24px; }
    .mod-header { background:var(--surface); border:1px solid var(--border); border-top:3px solid var(--accent);
      border-radius:12px; padding:20px 24px; }
    .mod-title  { font-size:18px; font-weight:700; color:#fff; margin-bottom:8px; }
    .mod-stats-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:13px; color:var(--muted); }
    .ms-sep   { color:var(--border); }
    .mod-info { font-size:13px; color:var(--muted); line-height:1.7; margin-bottom:16px; }
    .mod-section { display:flex; flex-direction:column; gap:20px; }

    /* ─── Suite block ────────────────────────── */
    .suite-block { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px 22px; }
    .suite-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
    .suite-name   { font-size:14px; font-weight:600; color:#fff; flex:1; }

    /* ─── Data table ─────────────────────────── */
    .data-table { width:100%; border-collapse:collapse; font-size:13px; }
    .data-table th { background:var(--surface2); color:var(--muted); font-size:11px;
      text-transform:uppercase; letter-spacing:.7px; padding:9px 12px; text-align:left; border-bottom:1px solid var(--border); }
    .data-table td { padding:9px 12px; border-bottom:1px solid var(--border); color:var(--text); vertical-align:top; }
    .data-table tr:last-child td { border-bottom:none; }
    .data-table tr:hover td { background:rgba(255,255,255,.02); }
    .row-fail td { background:rgba(239,68,68,.04); }
    .row-detail td { background:var(--surface2); padding:8px 12px; }
    .sm-table th, .sm-table td { padding:7px 10px; font-size:12px; }
    .cell-mono { font-family:monospace; font-size:11px; color:var(--muted); }
    .error-msg { background:rgba(239,68,68,.08); border-left:3px solid var(--fail);
      color:#fca5a5; font-size:11px; padding:10px; border-radius:0 6px 6px 0;
      white-space:pre-wrap; word-break:break-all; max-height:160px; overflow-y:auto; }

    /* ─── Performance ────────────────────────── */
    .perf-legend { display:flex; gap:14px; margin-bottom:16px; font-size:12px; }
    .leg-item    { display:flex; align-items:center; gap:5px; color:var(--muted); }
    .leg-dot     { width:10px; height:10px; border-radius:50%; }
    .thresholds-table { margin-bottom:20px; }
    .perf-card  { background:var(--surface); border:1px solid var(--border); border-radius:12px;
      padding:18px 22px; display:flex; flex-direction:column; gap:14px; }
    .perf-card-fail { border-color:rgba(239,68,68,.4); }
    .perf-card-header { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .perf-tc-name { font-size:14px; font-weight:600; color:#fff; flex:1; }
    .perf-time    { font-size:12px; color:var(--muted); }
    .metrics-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
    .metric-item  { background:var(--surface2); border-radius:8px; padding:12px 14px; }
    .metric-label { font-size:11px; font-weight:600; color:var(--muted); text-transform:uppercase;
      letter-spacing:.6px; margin-bottom:8px; display:flex; flex-direction:column; gap:2px; }
    .metric-hint  { font-size:10px; font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted); }
    .gauge-wrap   { display:flex; flex-direction:column; gap:5px; }
    .gauge-bar    { height:6px; background:var(--border); border-radius:3px; overflow:hidden; }
    .gauge-fill   { height:100%; border-radius:3px; transition:width .6s ease; }
    .gauge-meta   { display:flex; justify-content:space-between; align-items:center; font-size:13px; }
    .gauge-label  { font-size:11px; color:var(--muted); }
    .budget-pill  { padding:6px 12px; border-radius:6px; font-size:12px; color:var(--text); }

    /* ─── Security ───────────────────────────── */
    .sec-desc   { font-size:12px; color:var(--muted); margin-bottom:10px; line-height:1.6; }
    .sec-checks { margin-bottom:12px; }
    .sec-checks-label { font-size:11px; font-weight:600; color:var(--muted); text-transform:uppercase;
      letter-spacing:.6px; display:block; margin-bottom:6px; }
    .sec-checks ul { list-style:none; display:flex; flex-wrap:wrap; gap:6px; }
    .sec-checks li { background:var(--surface2); border:1px solid var(--border);
      padding:3px 10px; border-radius:20px; font-size:11px; color:var(--muted); }

    /* ─── Accessibility ──────────────────────── */
    .a11y-legend { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; margin-bottom:20px; }
    .a11y-leg-item { border:1px solid; border-radius:10px; padding:10px 14px; display:flex; flex-direction:column; gap:4px; }
    .a11y-leg-desc { font-size:11px; color:var(--muted); line-height:1.5; }
    .a11y-params  { background:var(--surface2); border:1px solid var(--border); border-radius:10px;
      padding:14px 18px; margin-bottom:20px; font-size:12px; }
    .a11y-params ul { margin-top:8px; padding-left:18px; }
    .a11y-params li { margin-bottom:4px; color:var(--muted); line-height:1.6; }
    .a11y-params code { background:rgba(255,255,255,.08); padding:1px 5px; border-radius:4px; color:var(--text); font-size:11px; }
    .a11y-summary { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
    .a11y-count   { border:1px solid; border-radius:10px; padding:10px 16px; text-align:center; min-width:80px; }
    .a11y-count-num { display:block; font-size:24px; font-weight:700; }
    .a11y-count-lbl { display:block; font-size:11px; color:var(--muted); text-transform:capitalize; margin-top:2px; }
    .a11y-violations { display:flex; flex-direction:column; gap:8px; }
    .a11y-viol-title { font-size:12px; font-weight:600; color:var(--muted); margin-bottom:4px; }
    .a11y-viol-item  { background:var(--surface2); border-radius:0 8px 8px 0; padding:10px 14px;
      display:flex; flex-wrap:wrap; gap:8px; align-items:baseline; }
    .a11y-viol-badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px; color:#fff; white-space:nowrap; }
    .a11y-viol-rule  { font-size:12px; font-weight:600; }
    .a11y-viol-rule code { background:rgba(255,255,255,.08); padding:1px 6px; border-radius:4px; }
    .a11y-viol-desc  { font-size:12px; color:var(--muted); flex:1; }
    .a11y-ok { background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.3);
      border-radius:8px; padding:12px 16px; color:var(--pass); font-size:13px; }

    /* ─── Non-functional ─────────────────────── */
    .nf-params { background:var(--surface2); border:1px solid var(--border); border-radius:10px;
      padding:14px 18px; margin-bottom:4px; font-size:12px; }
    .nf-params ul { margin-top:8px; padding-left:18px; }
    .nf-params li { margin-bottom:4px; color:var(--muted); line-height:1.6; }
    .nf-block { background:var(--surface2); border:1px solid var(--border); border-radius:10px;
      padding:14px 18px; margin-top:14px; }
    .nf-block-header { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:12px; font-size:13px; }
    .nf-url   { font-size:11px; color:var(--muted); font-family:monospace; flex:1; }
    .nf-tipo-badge { background:var(--surface); border:1px solid var(--border);
      padding:2px 10px; border-radius:20px; font-size:11px; font-weight:600; color:var(--text); }
    .nf-total-row td { background:rgba(255,255,255,.04); font-weight:600; }
    .nf-result { margin-top:10px; font-size:13px; font-weight:600; padding:8px 12px;
      background:rgba(255,255,255,.04); border-radius:6px; }
    .nf-table { font-size:12px; }

    /* ─── No data ────────────────────────────── */
    .no-data { text-align:center; padding:60px 20px; color:var(--muted); }
    .no-data span { font-size:40px; display:block; margin-bottom:12px; }
    .no-data code { background:var(--surface2); padding:2px 8px; border-radius:4px; color:var(--text); }

    /* ─── Evidence grid ─────────────────────── */
    .ev-section { margin-top:32px; border-top:1px solid var(--border); padding-top:28px; }
    .ev-section-header { display:flex; align-items:baseline; gap:14px; margin-bottom:20px; }
    .ev-section-title  { font-size:15px; font-weight:700; color:#fff; }
    .ev-section-sub    { font-size:12px; color:var(--muted); }

    .ev-tc-block { background:var(--surface); border:1px solid var(--border);
      border-radius:12px; margin-bottom:14px; overflow:hidden; }
    .ev-tc-fail  { border-color:rgba(239,68,68,.35); }
    .ev-tc-header { display:flex; align-items:center; gap:10px; padding:12px 18px;
      background:var(--surface2); flex-wrap:wrap; cursor:default; }
    .ev-tc-status { font-size:16px; }
    .ev-tc-name   { font-size:13px; font-weight:600; color:#fff; flex:1; min-width:120px; }
    .ev-tc-browser{ font-size:11px; color:var(--muted); background:var(--border);
      padding:2px 8px; border-radius:12px; white-space:nowrap; }
    .ev-tc-time   { font-size:11px; color:var(--muted); white-space:nowrap; }
    .ev-toggle-btn{ padding:5px 12px; font-size:11px; cursor:pointer;
      background:transparent; border:1px solid var(--border); color:var(--muted);
      border-radius:6px; transition:all .2s; white-space:nowrap; }
    .ev-toggle-btn:hover { border-color:#6366f1; color:#fff; }

    .ev-runs-wrap { padding:14px 18px; display:flex; flex-direction:column; gap:16px; }
    .ev-run       { display:flex; flex-direction:column; gap:10px; }
    .ev-run-retry { opacity:.85; }
    .ev-run-label { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--muted); }
    .ev-run-folder{ font-family:monospace; font-size:10px; color:var(--border); }

    .ev-cards { display:flex; flex-wrap:wrap; gap:12px; }

    /* Tarjeta base */
    .ev-card { width:200px; background:var(--surface2); border:1px solid var(--border);
      border-radius:10px; overflow:hidden; flex-shrink:0;
      transition:transform .2s,box-shadow .2s,border-color .2s; }
    .ev-card:hover { transform:translateY(-3px); border-color:#6366f1;
      box-shadow:0 8px 24px rgba(99,102,241,.25); }
    .ev-card-img   { cursor:pointer; }
    .ev-card-video { cursor:default; }

    /* Thumbnail zona */
    .ev-card-thumb { height:120px; display:flex; align-items:center; justify-content:center;
      overflow:hidden; position:relative; background:#0a0d18; }
    .ev-card-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
    .ev-img-fallback   { font-size:40px; }

    /* Video thumb */
    .ev-video-thumb video { width:100%; height:100%; object-fit:cover; cursor:pointer; }
    .ev-play-overlay { position:absolute; inset:0; display:flex; align-items:center;
      justify-content:center; font-size:28px; color:rgba(255,255,255,.85);
      background:rgba(0,0,0,.35); transition:background .2s; cursor:pointer; }
    .ev-play-overlay:hover { background:rgba(0,0,0,.5); }
    .ev-play-overlay.hidden { display:none; }

    /* Trace / error-context thumb */
    .ev-trace-thumb,.ev-err-thumb { flex-direction:column; gap:6px; }
    .ev-trace-icon  { font-size:30px; }
    .ev-trace-label { font-size:11px; color:var(--muted); text-align:center; line-height:1.4; }

    /* Footer de tarjeta */
    .ev-card-footer { padding:8px 10px; display:flex; align-items:center; gap:6px;
      font-size:11px; color:var(--muted); border-top:1px solid var(--border); }
    .ev-card-footer span { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ev-dl-link { color:var(--muted); text-decoration:none; font-size:14px;
      padding:2px 4px; border-radius:4px; transition:color .2s; }
    .ev-dl-link:hover { color:#fff; }

    /* Trace command */
    .ev-trace-cmd { padding:6px 10px; font-family:monospace; font-size:10px;
      color:var(--muted); background:#0a0d18; border-top:1px solid var(--border);
      cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      transition:color .2s; }
    .ev-trace-cmd:hover { color:#6366f1; }

    /* Lightbox */
    .lightbox { display:none; position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,.92); align-items:center; justify-content:center;
      flex-direction:column; gap:14px; padding:20px; }
    .lightbox.open { display:flex; }
    .lightbox img  { max-width:90vw; max-height:85vh; object-fit:contain;
      border-radius:8px; box-shadow:0 0 60px rgba(0,0,0,.8); }
    .lb-bar { display:flex; align-items:center; gap:12px; color:#fff; font-size:13px; width:100%; max-width:90vw; }
    .lb-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--muted); }
    .lb-close { background:rgba(255,255,255,.1); border:none; color:#fff; font-size:20px;
      width:36px; height:36px; border-radius:50%; cursor:pointer; display:flex;
      align-items:center; justify-content:center; transition:background .2s; flex-shrink:0; }
    .lb-close:hover { background:rgba(255,255,255,.25); }
    .lb-dl { color:var(--muted); text-decoration:none; font-size:13px; padding:6px 12px;
      border:1px solid var(--border); border-radius:6px; transition:border-color .2s,color .2s; }
    .lb-dl:hover { border-color:#fff; color:#fff; }

    /* Copy toast */
    .copy-toast { position:fixed; bottom:24px; right:24px; background:#6366f1; color:#fff;
      padding:10px 18px; border-radius:8px; font-size:13px; z-index:9998;
      animation:fadeUp .3s ease; display:none; }
    .copy-toast.show { display:block; }

    /* ─── Footer ─────────────────────────────── */
    .footer { position:relative; z-index:5; padding:20px 48px; text-align:center;
      font-size:12px; color:var(--muted); border-top:1px solid var(--border); }
    .footer a { color:#6366f1; text-decoration:none; }

    /* ─── Animation ──────────────────────────── */
    @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    .card:nth-child(1){animation-delay:.00s} .card:nth-child(2){animation-delay:.05s}
    .card:nth-child(3){animation-delay:.10s} .card:nth-child(4){animation-delay:.15s}
    .card:nth-child(5){animation-delay:.20s} .card:nth-child(6){animation-delay:.25s}
    .card:nth-child(7){animation-delay:.30s} .card:nth-child(8){animation-delay:.35s}

    @media(max-width:768px){
      .header,.main{padding:18px 16px;} .nav-bar{padding:0 16px;} .footer{padding:16px;}
      .cards-grid{grid-template-columns:1fr;} .metrics-grid{grid-template-columns:1fr;}
    }
  </style>
</head>
<body>

<!-- ── Header ──────────────────────────────────────────── -->
<header class="header">
  <div class="logo-wrap">
    <div class="logo-icon">🧪</div>
    <div>
      <div class="logo-title">QA Automation Portal</div>
      <div class="logo-sub">Playwright Enterprise Test Framework</div>
    </div>
  </div>
  <div class="global-badge">
    <div class="global-circle">${globalRate}%</div>
    <div>
      <div class="global-status">${globalOk ? 'PASS' : 'FAIL'} — ${globalRate}% éxito</div>
      <div class="global-detail">${globalPassed} de ${totals.tests} pruebas pasaron · ${fmtSec(totals.time)}</div>
    </div>
  </div>
  <div class="meta-info">
    <div>Generado: <b>${generatedAt}</b></div>
    <div>Duración total: <b>${fmtSec(totals.time)}</b></div>
    <div>Fallos: <b style="color:${totals.failures>0 ? '#ef4444' : '#10b981'}">${totals.failures}</b></div>
  </div>
</header>

<!-- ── Nav ─────────────────────────────────────────────── -->
<nav class="nav-bar">
  <button class="nav-btn active" id="tab-overview" onclick="showSection('overview')">📊 Resumen</button>
  ${MODULES.map(m=>`<button class="nav-btn" id="tab-${m.key}" onclick="showSection('${m.key}')">${m.icon} ${m.label}</button>`).join('\n  ')}
</nav>

<!-- ── Content ──────────────────────────────────────────── -->
<main class="main">

  <!-- Overview -->
  <section id="sec-overview">
    <p class="section-title">Resumen Ejecutivo</p>
    <div class="summary-bar">
      <div class="sum-card"><span class="sum-label">Total</span><span class="sum-value c-neutral">${totals.tests}</span></div>
      <div class="sum-card"><span class="sum-label">Pasaron</span><span class="sum-value c-pass">${globalPassed}</span></div>
      <div class="sum-card"><span class="sum-label">Fallaron</span><span class="sum-value c-fail">${totals.failures}</span></div>
      <div class="sum-card"><span class="sum-label">Omitidas</span><span class="sum-value c-warn">${totals.skipped}</span></div>
      <div class="sum-card"><span class="sum-label">Tasa de Éxito</span><span class="sum-value" style="color:${globalColor}">${globalRate}%</span></div>
      <div class="sum-card"><span class="sum-label">Duración</span><span class="sum-value c-neutral" style="font-size:18px">${fmtSec(totals.time)}</span></div>
    </div>
    <br/>
    <p class="section-title">Módulos de Prueba</p>
    <div class="cards-grid">${summaryCards}</div>
  </section>

  ${sections}

</main>

<footer class="footer">
  QA Automation Portal &nbsp;·&nbsp; Generado con <a href="https://playwright.dev" target="_blank">Playwright</a> Enterprise Framework &nbsp;·&nbsp; ${generatedAt}
</footer>

<!-- ── Lightbox ──────────────────────────────────────── -->
<div class="lightbox" id="lightbox" onclick="closeLightboxIfBg(event)">
  <div class="lb-bar">
    <span class="lb-name" id="lb-name"></span>
    <a class="lb-dl" id="lb-dl" download>⬇ Descargar</a>
    <button class="lb-close" onclick="closeLightbox()">✕</button>
  </div>
  <img id="lb-img" src="" alt="screenshot"/>
</div>

<!-- ── Copy toast ─────────────────────────────────────── -->
<div class="copy-toast" id="copyToast">✅ Comando copiado al portapapeles</div>

<script>
  /* ── Navegación de secciones ── */
  function showSection(key) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('sec-' + key).style.display = '';
    const tab = document.getElementById('tab-' + key);
    if (tab) tab.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Toggle evidencias ── */
  function toggleEvidence(id) {
    const el  = document.getElementById(id);
    const btn = el.previousElementSibling.querySelector('.ev-toggle-btn');
    const open = el.style.display === 'none' || el.style.display === '';
    el.style.display = open ? 'flex' : 'none';
    if (btn) btn.textContent = open ? 'Ocultar evidencias ▴' : 'Ver evidencias ▾';
  }

  /* ── Video play/pause overlay ── */
  function playVideo(overlay) {
    const video = overlay.previousElementSibling;
    if (video && video.tagName === 'VIDEO') {
      overlay.classList.add('hidden');
      video.controls = true;
      video.play();
      video.addEventListener('pause', () => { overlay.classList.remove('hidden'); video.controls = false; }, { once: true });
    }
  }

  /* ── Lightbox ── */
  function openLightbox(src, name) {
    document.getElementById('lb-img').src  = src;
    document.getElementById('lb-name').textContent = name || src.split('/').pop();
    const dlLink = document.getElementById('lb-dl');
    dlLink.href = src;
    dlLink.download = src.split('/').pop();
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('lb-img').src = '';
  }
  function closeLightboxIfBg(e) {
    if (e.target === document.getElementById('lightbox')) closeLightbox();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  /* ── Copy trace command ── */
  function copyCmd(el) {
    const cmd = el.textContent.trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cmd).then(() => showToast());
    } else {
      const ta = document.createElement('textarea');
      ta.value = cmd; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta); showToast();
    }
  }
  function showToast() {
    const t = document.getElementById('copyToast');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }
</script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
function openInBrowser(filePath) {
  const cmds = { win32: `start "" "${filePath}"`, darwin: `open "${filePath}"`, linux: `xdg-open "${filePath}"` };
  const cmd  = cmds[process.platform] || cmds.linux;
  console.log('🌐 Abriendo portal en el navegador...');
  exec(cmd, err => {
    if (err) {
      console.warn('⚠️  No se pudo abrir el navegador automáticamente.');
      console.warn(`   Ábrelo manualmente: ${filePath}`);
    }
  });
}

function main() {
  console.log('🚀 Generando portal de reportes...');
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

  let suites = [], totals = { tests:0, failures:0, skipped:0, errors:0, time:0 };
  if (fs.existsSync(XML_FILE)) {
    const parsed = parseXML(fs.readFileSync(XML_FILE, 'utf-8'));
    suites  = parsed.suites;
    totals  = parsed.totals;
    console.log(`📄 XML parseado: ${suites.length} suites, ${totals.tests} pruebas`);
  } else {
    console.warn(`⚠️  No se encontró ${XML_FILE}. Portal generado sin datos.`);
  }

  const groups      = groupByModule(suites);
  const generatedAt = new Date().toLocaleString('es-CO', { timeZone:'America/Bogota', dateStyle:'medium', timeStyle:'short' });
  const html        = buildPortalHTML(groups, totals, generatedAt);

  fs.writeFileSync(OUT_FILE, html, 'utf-8');
  console.log(`✅ Portal generado: ${OUT_FILE}`);
  openInBrowser(OUT_FILE);
}

main();