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

// ─── Motor estadístico PNF ────────────────────────────────────────────────────
let statEngine = null;
try {
  statEngine = require(
    path.join(__dirname, '..', '..', '..', 'GenerateTest', 'non-functional', 'analysis', 'statistical-engine.js')
  );
} catch (e) { console.warn('⚠️ [Portal] statEngine no disponible — análisis PNF deshabilitado:', e.message); }

// ─── Rutas ────────────────────────────────────────────────────────────────────
const ROOT         = process.cwd();
const XML_FILE     = path.join(ROOT, 'test-results', 'results.xml');
const REPORT_DIR   = path.join(ROOT, 'playwright-report');
const OUT_FILE     = path.join(REPORT_DIR, 'portal.html');
const CSV_FILE     = path.join(REPORT_DIR, 'report.csv');
const FEATURES_DIR = path.join(ROOT, 'GenerateTest', 'features');

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

// Risk 7: decodificar entidades XML para evitar nombres rotos con <, >, & o "
function unescapeXml(s) {
  return s
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Extrae un atributo de un bloque de atributos XML */
function attr(attrs, name) {
  const m = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return m ? unescapeXml(m[1]) : ''; // Risk 7: decodificar entidades
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

/** Extrae el nombre de la suite desde el path del testsuite (e.g. GenerateTest/tests/MySuite/ui/...) */
function extractSuiteName(suiteNameRaw) {
  const normalized = suiteNameRaw.replace(/\\/g, '/');
  const m = normalized.match(/GenerateTest\/tests\/([^/]+)/);
  if (m) return m[1];
  // fallback: primer segmento con contenido
  const parts = normalized.split('/').filter(Boolean);
  return parts[0] || suiteNameRaw;
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

/** Elimina códigos de escape ANSI (colores de terminal) de una cadena */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
}

/** Non-Functional: extrae tablas JMeter del system-out */
function extractNfTables(output) {
  const clean = stripAnsi(output);

  // ── Método primario: bloques JSON estructurados emitidos por summary-reporter ─
  // Garantiza que TODOS los escenarios aparezcan independientemente de ANSI o formato.
  const jsonBlocks = [];
  const jsonRe = /@@NF_DATA_JSON@@([\s\S]*?)@@END_NF_DATA_JSON@@/g;
  let jm;
  while ((jm = jsonRe.exec(clean)) !== null) {
    try {
      const d = JSON.parse(jm[1]);
      if (d && Array.isArray(d.scenarios)) {
        jsonBlocks.push({
          name:  d.name  || '',
          url:   d.url   || '',
          tipo:  (d.tipo || '').toUpperCase(),
          rows:  d.scenarios.map(s => ({
            escenario: s.escenario,
            hilos:     s.hilos,
            peticiones: s.peticiones,
            prom:      s.prom,
            min:       s.min,
            max:       s.max,
            errorPct:  s.errorPct  || '-',
            errorRate: s.errorRate || 0,
            tps:       s.tps,
          })),
          total:  d.total  || null,
          result: d.result || '',
        });
      }
    } catch (_) { /* JSON malformado — ignorar */ }
  }
  if (jsonBlocks.length > 0) return jsonBlocks;

  // ── Fallback: regex sobre tabla de texto (ejecuciones sin bloque JSON) ────────
  const blocks = [];
  const blockRe = /📡\s*(.+?)\s*\|\s*(https?:\/\/[^\n]+)\s*\n\s*📋\s*Tipo:\s*(\w+)([\s\S]*?)(?=📡|$)/gi;
  let bm;
  while ((bm = blockRe.exec(clean)) !== null) {
    const name = bm[1].trim();
    const url  = bm[2].trim();
    const tipo = bm[3].trim().toUpperCase();
    const body = bm[4];

    const rows   = [];
    const rowRe  = /\s*#(\d+)\s*│\s*(\d+)\s*│\s*(\d+)\s*│\s*([\d.]+)\s*│\s*([\d.]+)\s*│\s*([\d.]+)\s*│\s*([\d.]+\s*%)\s*│\s*([\d.]+)/g;
    let rm;
    while ((rm = rowRe.exec(body)) !== null) {
      rows.push({
        escenario: +rm[1], hilos: +rm[2], peticiones: +rm[3],
        prom: +rm[4], min: +rm[5], max: +rm[6],
        errorPct: rm[7].trim(), errorRate: parseFloat(rm[7]), tps: +rm[8],
      });
    }
    const totM  = body.match(/TOTAL\s*│\s*-\s*│\s*(\d+)\s*│\s*([\d.]+)\s*│\s*([\d.]+)\s*│\s*([\d.]+)\s*│\s*([\d.]+\s*%)\s*│\s*([\d.]+)/);
    const total = totM ? { peticiones: +totM[1], prom: +totM[2], min: +totM[3], max: +totM[4], errorPct: totM[5].trim(), errorRate: parseFloat(totM[5]), tps: +totM[6] } : null;
    const resultM  = body.match(/RESULTADO:\s*([^\n]+)/);
    const resultRaw = resultM ? stripAnsi(resultM[1]).trim() : '';
    blocks.push({ name, url, tipo, rows, total, result: resultRaw });
  }
  return blocks;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANÁLISIS ESTADÍSTICO PNF
// ═══════════════════════════════════════════════════════════════════════════════

/** Extrae TODOS los bloques NF de las suites no-funcionales */
function extractAllNfBlocks(nfSuiteList) {
  const all = [];
  for (const s of nfSuiteList) {
    for (const tc of s.testcases) {
      const blocks = extractNfTables(tc.output);
      all.push(...blocks);
    }
  }
  return all;
}

/** Genera concepto profesional con OpenAI (async). Fallback: análisis basado en reglas. */
async function generateAiConcept(analyses) {
  if (!analyses || analyses.length === 0) return null;

  const summaryLines = analyses.map((a, i) => {
    const bp   = a.breakpoint  != null ? a.breakpoint.toFixed(1)  : 'N/A';
    const bp95 = a.breakpoint95 != null ? a.breakpoint95.toFixed(1) : 'N/A';
    const sat  = a.saturationPct != null ? a.saturationPct.toFixed(1) + '%' : 'N/A';
    const r2   = a.r2   != null ? a.r2.toFixed(4)   : 'N/A';
    const rmse = a.rmse != null ? a.rmse.toFixed(3)  : 'N/A';
    const L    = a.L    != null ? a.L.toFixed(2)     : 'N/A';
    const k    = a.k    != null ? a.k.toFixed(4)     : 'N/A';
    const x0   = a.x0   != null ? a.x0.toFixed(2)    : 'N/A';
    const errRate = a.totalData ? a.totalData.errorRate : 0;
    const maxTps  = Math.max(...(a.ys || [0])).toFixed(2);
    return [
      `Target ${i + 1}: "${a.name}" | URL: ${a.url} | Tipo: ${a.tipo}`,
      `  Modelo logístico: L=${L} TPS, k=${k}, x0=${x0} usuarios`,
      `  Bondad ajuste: R²=${r2}, RMSE=${rmse}`,
      `  Breakpoint (inflexión): ${bp} usuarios [${a.breakpointType}]`,
      `  Saturación 95%: ${bp95} usuarios`,
      `  Saturación al máximo probado: ${sat}`,
      `  TPS máximo observado: ${maxTps}`,
      `  Tasa de error total: ${(errRate || 0).toFixed(2)}%`,
    ].join('\n');
  }).join('\n\n');

  const prompt = `Actúa como consultor senior en ingeniería de rendimiento (SRE/Performance Engineering).
Analiza los siguientes resultados de pruebas de carga no funcionales con regresión logística aplicada y proporciona un concepto profesional completo en español.

${summaryLines}

Estructura tu análisis en estas secciones (usa títulos con ##):

## Interpretación del Modelo de Regresión
Explica qué significa la curva logística para el comportamiento del servicio bajo carga.

## Capacidad Máxima y Punto de Saturación
Analiza el parámetro L (TPS máximo) y el breakpoint (punto de inflexión).

## Nivel de Saturación Actual
Evalúa el nivel de saturación alcanzado en las pruebas y el riesgo operacional.

## Calidad del Ajuste Estadístico
Interpreta R², RMSE y lo que implican para la confiabilidad de la proyección.

## Riesgos Identificados
Lista los riesgos específicos detectados (errores, saturación alta, curva plana, etc.).

## Recomendaciones de Escalabilidad
Da recomendaciones concretas y accionables para ingeniería de capacidad.

## Diagnóstico General
Veredicto final: Verde (servicio estable), Amarillo (requiere atención) o Rojo (acción urgente), con justificación.

Sé técnico, directo y profesional. Máximo 600 palabras en total.`;

  // ── Intento con OpenAI ──────────────────────────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      // Risk 4: generate-portal.js es CommonJS — no puede importar openai-client.ts
      // directamente. Se replica la misma lógica de inicialización para consistencia.
      let OpenAI;
      try { OpenAI = require('openai').default || require('openai'); } catch (_) {}
      if (OpenAI) {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const resp = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1800,
          temperature: 0.25,
        });
        const text = resp.choices[0]?.message?.content;
        if (text) return text;
      }
    } catch (e) {
      console.warn('⚠️  OpenAI no disponible para análisis PNF:', e.message);
    }
  }

  // ── Fallback: análisis basado en reglas ─────────────────────────────────────
  return generateRuleBasedConcept(analyses);
}

/** Análisis profesional basado en reglas cuando no hay API key de OpenAI */
function generateRuleBasedConcept(analyses) {
  const sections = [];
  sections.push('## Interpretación del Modelo de Regresión');

  const hasLogistic = analyses.some(a => a.tienesAjuste);
  if (hasLogistic) {
    sections.push(
      'La regresión logística aplicada modela el comportamiento de saturación del servicio bajo carga incremental. ' +
      'La curva sigue la forma sigmoide característica de sistemas con recursos limitados: crecimiento inicial rápido, ' +
      'seguido de desaceleración hasta alcanzar la capacidad máxima teórica (parámetro L).'
    );
  } else {
    sections.push(
      'No se logró ajustar un modelo logístico con los datos disponibles (mínimo 3 escenarios requeridos). ' +
      'Se presentan los resultados empíricos sin proyección de curva.'
    );
  }

  sections.push('\n## Capacidad Máxima y Punto de Saturación');
  for (const a of analyses) {
    if (a.tienesAjuste && a.L != null && a.breakpoint != null) {
      sections.push(
        `**${a.name}**: Capacidad máxima estimada L = **${a.L.toFixed(2)} TPS**. ` +
        `El breakpoint se sitúa en **${a.breakpoint.toFixed(1)} usuarios** — ` +
        'por encima de este umbral el rendimiento marginal por usuario adicional cae significativamente. ' +
        (a.breakpoint95 != null
          ? `La saturación al 95% de L se alcanza alrededor de **${a.breakpoint95.toFixed(1)} usuarios**.`
          : '')
      );
    }
  }

  sections.push('\n## Nivel de Saturación Actual');
  for (const a of analyses) {
    const sat = a.saturationPct;
    if (sat != null) {
      const nivel = sat >= 90 ? '🔴 CRÍTICO' : sat >= 70 ? '🟡 ELEVADO' : '🟢 NORMAL';
      sections.push(`**${a.name}**: Saturación al **${sat.toFixed(1)}%** de la capacidad máxima. Nivel: ${nivel}.`);
    }
  }

  sections.push('\n## Calidad del Ajuste Estadístico');
  for (const a of analyses) {
    if (a.r2 != null) {
      const calidad = a.r2 >= 0.95 ? 'excelente' : a.r2 >= 0.85 ? 'buena' : a.r2 >= 0.70 ? 'aceptable' : 'pobre';
      sections.push(
        `**${a.name}**: R² = **${a.r2.toFixed(4)}** (${calidad}), RMSE = ${a.rmse.toFixed(3)} TPS. ` +
        (a.r2 < 0.70
          ? 'Se recomienda ejecutar más escenarios intermedios para mejorar la confiabilidad del modelo.'
          : 'El modelo es confiable para proyecciones de capacidad.')
      );
    }
  }

  sections.push('\n## Riesgos Identificados');
  const riesgos = [];
  for (const a of analyses) {
    const errRate = a.totalData ? (a.totalData.errorRate || 0) : 0;
    if (errRate >= 5)   riesgos.push(`• **${a.name}**: Tasa de error ${errRate.toFixed(2)}% — umbral de alerta superado (≥5%).`);
    if (errRate >= 20)  riesgos.push(`• **${a.name}**: Tasa de error crítica (${errRate.toFixed(2)}%) — servicio degradado.`);
    if (a.saturationPct != null && a.saturationPct >= 90)
      riesgos.push(`• **${a.name}**: Saturación al ${a.saturationPct.toFixed(0)}% — sin margen de headroom en producción.`);
    if (a.r2 != null && a.r2 < 0.70)
      riesgos.push(`• **${a.name}**: R² = ${a.r2.toFixed(3)} — ajuste de curva insuficiente; ejecutar más escenarios.`);
  }
  sections.push(riesgos.length > 0 ? riesgos.join('\n') : '• No se identificaron riesgos críticos en los datos analizados.');

  sections.push('\n## Recomendaciones de Escalabilidad');
  sections.push(
    '• Definir el breakpoint como umbral de alerta de producción: configurar alertas cuando los usuarios concurrentes superen ese valor.\n' +
    '• Realizar pruebas de carga hasta el 120% del breakpoint estimado para validar el comportamiento post-saturación.\n' +
    '• Evaluar estrategias de escalado horizontal antes de alcanzar el 80% de la capacidad máxima L.\n' +
    '• Incrementar el número de escenarios (mínimo 5) para mejorar la confiabilidad del modelo logístico.\n' +
    '• Monitorear TPS y error rate en producción con alertas configuradas en el 75% de L.'
  );

  sections.push('\n## Diagnóstico General');
  const overallErrors = analyses.reduce((mx, a) => {
    const er = a.totalData ? (a.totalData.errorRate || 0) : 0;
    return Math.max(mx, er);
  }, 0);
  const overallSat = analyses.reduce((mx, a) => Math.max(mx, a.saturationPct || 0), 0);
  const overallR2  = analyses.reduce((mn, a) => a.r2 != null ? Math.min(mn, a.r2) : mn, 1);

  if (overallErrors >= 20 || overallSat >= 95) {
    sections.push('🔴 **ROJO — Acción urgente requerida.** El servicio opera con riesgo crítico de saturación o errores que comprometen la disponibilidad.');
  } else if (overallErrors >= 5 || overallSat >= 75 || overallR2 < 0.70) {
    sections.push('🟡 **AMARILLO — Requiere atención.** Se detectan señales de saturación o calidad del modelo insuficiente. Planificar escalado y pruebas adicionales.');
  } else {
    sections.push('🟢 **VERDE — Servicio estable.** Los indicadores de rendimiento están dentro de márgenes aceptables. Continuar monitoreo y establecer baseline de capacidad.');
  }

  return sections.join('\n');
}

/** Computa el análisis estadístico PNF y el concepto IA de forma asíncrona */
async function computeStatisticalAnalysis(nfSuiteList) {
  if (!statEngine || !nfSuiteList || nfSuiteList.length === 0) {
    return { analyses: [], aiConcept: null };
  }
  const blocks   = extractAllNfBlocks(nfSuiteList);
  const analyses = statEngine.analyzeNfBlocks(blocks);
  const aiConcept = await generateAiConcept(analyses);
  return { analyses, aiConcept };
}

/** Renderiza el contenido del tab "Análisis Estadístico PNF" (server-side HTML shell) */
function renderStatisticalAnalysis(statisticalAnalysis) {
  const { analyses, aiConcept } = statisticalAnalysis || {};

  if (!analyses || analyses.length === 0) {
    return `<div class="no-data">
      <span>📭</span>
      <p>No hay datos de pruebas no funcionales para analizar.</p>
      <p>Ejecuta pruebas con <code>npx playwright test --config GenerateTest/non-functional/nf.playwright.config.ts</code> y regenera el portal.</p>
    </div>`;
  }

  // Preparar JSON para inyectar en el cliente
  const safeAnalyses = analyses.map(a => ({
    name:          a.name,
    url:           a.url,
    tipo:          a.tipo,
    tienesAjuste:  a.tienesAjuste,
    L:             a.L,
    k:             a.k,
    x0:            a.x0,
    r2:            a.r2,
    rmse:          a.rmse,
    mae:           a.mae,
    breakpoint:    a.breakpoint,
    breakpointType:a.breakpointType,
    saturationPct: a.saturationPct,
    breakpoint95:  a.breakpoint95,
    xs:            a.xs,
    ys:            a.ys,
    ypred:         a.ypred,
    residuals:     a.residuals,
    scenarios:     a.scenarios,
    totalData:     a.totalData,
  }));

  const aiHtml = aiConcept
    ? aiConcept
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/^## (.+)$/gm, '<h4 class="ai-section-title">$1</h4>')
        .replace(/^• (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>)+/g, m => `<ul>${m}</ul>`)
        .replace(/\n{2,}/g, '<br><br>')
        .replace(/\n/g, '<br>')
    : '<p style="color:var(--muted)">Sin concepto IA (configura OPENAI_API_KEY para habilitar el análisis).</p>';

  const aiSource = process.env.OPENAI_API_KEY ? 'GPT-4o-mini (OpenAI)' : 'Análisis basado en reglas estadísticas';

  let html = `<div class="mod-section" id="pnf-analysis-root">
    <p class="mod-info">
      Proyección estadística mediante <b>regresión logística no lineal</b> sobre los resultados de pruebas de carga.
      Modela la saturación del servicio: <code>TPS = L / (1 + e<sup>-k(x-x₀)</sup>)</code>
    </p>

    <!-- ── Botón PDF ─────────────────────────────────────────────── -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <button class="btn-pdf" onclick="downloadPnfPdf()" id="btn-pdf-pnf">
        ⬇ Descargar Informe PDF
      </button>
      <span style="font-size:12px;color:var(--muted)">Incluye gráficas, parámetros estadísticos y concepto profesional</span>
    </div>

    <!-- ── Concepto IA ───────────────────────────────────────────── -->
    <div class="ai-concept-card" id="ai-concept-block">
      <div class="ai-concept-header">
        <span class="ai-concept-icon">🤖</span>
        <span class="ai-concept-title">Concepto Profesional — ${esc(aiSource)}</span>
        <button class="ai-toggle-btn" onclick="toggleAiConcept()">Ocultar ▴</button>
      </div>
      <div class="ai-concept-body" id="ai-concept-body">
        ${aiHtml}
      </div>
    </div>`;

  // Una sección por target analizado
  for (let i = 0; i < analyses.length; i++) {
    const a   = analyses[i];
    const bp  = a.breakpoint  != null ? a.breakpoint.toFixed(1)  : '—';
    const L   = a.L           != null ? a.L.toFixed(2)           : '—';
    const r2  = a.r2          != null ? (a.r2 * 100).toFixed(2) + '%' : '—';
    const rmse= a.rmse        != null ? a.rmse.toFixed(3)         : '—';
    const sat = a.saturationPct != null ? a.saturationPct.toFixed(1) + '%' : '—';
    const bp95= a.breakpoint95  != null ? a.breakpoint95.toFixed(1) : '—';
    const tipoIcon = a.tipo === 'SPIKE' ? '⚡' : '🔼';

    html += `
    <!-- ── Target ${i + 1} ─────────────────────────────────────── -->
    <div class="pnf-target-block">
      <div class="suite-header" style="border-bottom:1px solid var(--border);margin-bottom:20px;padding-bottom:14px">
        <span class="suite-name" style="font-size:15px">${tipoIcon} ${esc(a.name)}</span>
        <span class="nf-tipo-badge">${esc(a.tipo)}</span>
        <span style="font-size:12px;color:var(--muted);margin-left:auto">${esc(a.url)}</span>
      </div>

      <!-- Métricas clave -->
      <div class="pnf-kpi-row">
        <div class="pnf-kpi-card">
          <span class="pnf-kpi-label">Capacidad Máx. (L)</span>
          <span class="pnf-kpi-value" style="color:#6366f1">${L} TPS</span>
        </div>
        <div class="pnf-kpi-card">
          <span class="pnf-kpi-label">Breakpoint</span>
          <span class="pnf-kpi-value" style="color:#059669">${bp} usuarios</span>
          <span class="pnf-kpi-sub">${esc(a.breakpointType)}</span>
        </div>
        <div class="pnf-kpi-card">
          <span class="pnf-kpi-label">Saturación 95% en</span>
          <span class="pnf-kpi-value" style="color:#f59e0b">${bp95} usuarios</span>
        </div>
        <div class="pnf-kpi-card">
          <span class="pnf-kpi-label">R² (bondad ajuste)</span>
          <span class="pnf-kpi-value" style="color:${a.r2 != null && a.r2 >= 0.85 ? '#10b981' : '#f59e0b'}">${r2}</span>
        </div>
        <div class="pnf-kpi-card">
          <span class="pnf-kpi-label">RMSE</span>
          <span class="pnf-kpi-value">${rmse} TPS</span>
        </div>
        <div class="pnf-kpi-card">
          <span class="pnf-kpi-label">Saturación al máx.</span>
          <span class="pnf-kpi-value" style="color:${a.saturationPct != null && a.saturationPct >= 90 ? '#ef4444' : a.saturationPct != null && a.saturationPct >= 70 ? '#f59e0b' : '#10b981'}">${sat}</span>
        </div>
      </div>

      <!-- Gráficas Chart.js -->
      <div class="pnf-charts-grid">
        <div class="pnf-chart-card">
          <div class="pnf-chart-title">Regresión Logística — TPS vs Usuarios</div>
          <div class="pnf-chart-wrap"><canvas id="chart-reg-${i}" height="220"></canvas></div>
        </div>
        <div class="pnf-chart-card">
          <div class="pnf-chart-title">Residuales del Modelo</div>
          <div class="pnf-chart-wrap"><canvas id="chart-resid-${i}" height="220"></canvas></div>
        </div>
        <div class="pnf-chart-card">
          <div class="pnf-chart-title">TPS por Escenario — Zonas de Carga</div>
          <div class="pnf-chart-wrap"><canvas id="chart-tps-${i}" height="220"></canvas></div>
        </div>
      </div>

      <!-- Tabla de escenarios -->
      <table class="data-table nf-table" style="margin-top:16px">
        <thead>
          <tr>
            <th>Escenario</th><th>Hilos</th><th>Peticiones</th>
            <th>Prom(ms)</th><th>Mín(ms)</th><th>Máx(ms)</th>
            <th>% Error</th><th>TPS real</th><th>TPS modelo</th><th>Residual</th>
          </tr>
        </thead>
        <tbody>`;

    for (let j = 0; j < a.scenarios.length; j++) {
      const row    = a.scenarios[j];
      const pred   = a.ypred   && a.ypred[j]    != null ? (+a.ypred[j]).toFixed(2)    : '—';
      const resid  = a.residuals && a.residuals[j] != null ? (+a.residuals[j]).toFixed(2) : '—';
      const ep     = row.errorRate !== undefined ? +row.errorRate : parseFloat(row.errorPct || '0');
      const ec     = ep >= 20 ? 'c-fail' : ep >= 5 ? 'c-warn' : 'c-pass';
      const residN = a.residuals && a.residuals[j] != null ? +a.residuals[j] : 0;
      const residColor = residN >= 0 ? '#10b981' : '#ef4444';

      html += `<tr>
            <td>#${row.escenario || j + 1}</td>
            <td>${row.hilos}</td>
            <td>${row.peticiones}</td>
            <td>${row.prom != null ? row.prom : '—'}</td>
            <td>${row.min  != null ? row.min  : '—'}</td>
            <td>${row.max  != null ? row.max  : '—'}</td>
            <td class="${ec}">${row.errorPct || '—'}</td>
            <td><b>${row.tps != null ? (+row.tps).toFixed(2) : '—'}</b></td>
            <td style="color:#a78bfa">${pred}</td>
            <td style="color:${residColor};font-weight:600">${resid}</td>
          </tr>`;
    }

    if (a.totalData) {
      const t = a.totalData;
      const tEp = (t.errorRate || 0);
      const tEc = tEp >= 20 ? 'c-fail' : tEp >= 5 ? 'c-warn' : 'c-pass';
      html += `<tr class="nf-total-row">
            <td><b>TOTAL</b></td><td>—</td><td>${t.peticiones}</td>
            <td>${t.prom != null ? t.prom : '—'}</td>
            <td>${t.min  != null ? t.min  : '—'}</td>
            <td>${t.max  != null ? t.max  : '—'}</td>
            <td class="${tEc}"><b>${t.errorPct}</b></td>
            <td><b>${t.tps != null ? (+t.tps).toFixed(2) : '—'}</b></td>
            <td>—</td><td>—</td>
          </tr>`;
    }

    html += `</tbody></table>
    </div>`;
  }

  html += `</div>
  <!-- Datos del análisis para Chart.js (client-side) -->
  <script>
    var NF_ANALYSIS_DATA = ${JSON.stringify({ analyses: safeAnalyses })};
  </script>`;

  return html;
}

/** API: extrae pares request/response del system-out.
 *  Cada llamada a restRequest/soapRequest emite bloques delimitados
 *  con @@API_REQUEST_START@@ ... @@API_REQUEST_END@@
 *  y @@API_RESPONSE_START@@ ... @@API_RESPONSE_END@@
 *  Devuelve Array<{ method, url, reqHeaders, reqBody, soapAction,
 *                   status, statusText, duration, respHeaders, respBody }>
 */
function extractApiInteractions(output) {
  const interactions = [];

  const reqRe  = /@@API_REQUEST_START@@([\s\S]*?)@@API_REQUEST_END@@/g;
  const respRe = /@@API_RESPONSE_START@@([\s\S]*?)@@API_RESPONSE_END@@/g;

  const reqs  = [];
  const resps = [];

  let m;
  while ((m = reqRe.exec(output))  !== null) reqs.push(m[1]);
  while ((m = respRe.exec(output)) !== null) resps.push(m[1]);

  const parseBlock = (block) => {
    const lines = block.trim().split('\n');
    const map = {};
    for (const line of lines) {
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const key = line.substring(0, colon).trim().toUpperCase();
      const val = line.substring(colon + 1).trim();
      map[key] = val;
    }
    return map;
  };

  const safeJSON = (s) => {
    try { return JSON.parse(s); } catch { return s; }
  };

  const count = Math.max(reqs.length, resps.length);
  for (let i = 0; i < count; i++) {
    const req  = reqs[i]  ? parseBlock(reqs[i])  : {};
    const resp = resps[i] ? parseBlock(resps[i]) : {};
    interactions.push({
      method:      req['METHOD']     || '?',
      url:         req['URL']        || '',
      soapAction:  req['SOAPACTION'] || null,
      reqHeaders:  safeJSON(req['HEADERS'] || '{}'),
      reqBody:     req['BODY']       || '',
      status:      resp['STATUS']    || '',
      duration:    resp['DURATION']  || '',
      respHeaders: safeJSON(resp['HEADERS'] || '{}'),
      respBody:    resp['BODY']      || '',
    });
  }
  return interactions;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARSER DE FEATURES GHERKIN
// ═══════════════════════════════════════════════════════════════════════════════

/** Parsea el contenido de un archivo .feature y devuelve
 *  { featureName, scenarios: [{ name, steps: [{ keyword, text }] }] }
 */
function parseFeatureContent(content) {
  const lines = content.split(/\r?\n/);
  const result = { featureName: '', scenarios: [] };
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('Feature:')) {
      result.featureName = line.replace('Feature:', '').trim();
    } else if (line.startsWith('Scenario Outline:') || line.startsWith('Scenario:')) {
      if (current) result.scenarios.push(current);
      const label = line.startsWith('Scenario Outline:') ? 'Scenario Outline' : 'Scenario';
      current = { name: line.replace(/Scenario[^:]*:/, '').trim(), type: label, steps: [], tags: [] };
    } else if (line.startsWith('@')) {
      if (current) current.tags.push(...line.split(/\s+/).filter(t => t.startsWith('@')));
    } else if (current) {
      const kwMatch = line.match(/^(Given|When|Then|And|But)\s+(.*)/);
      if (kwMatch) current.steps.push({ keyword: kwMatch[1], text: kwMatch[2] });
      else if (line.startsWith('|') || line.startsWith('"""')) {
        // tabla o docstring: añadir como step especial
        if (current.steps.length) current.steps[current.steps.length - 1].extra =
          (current.steps[current.steps.length - 1].extra || '') + '\n' + raw;
      }
    }
  }
  if (current) result.scenarios.push(current);
  return result;
}

/** Lee todos los .feature de FEATURES_DIR y devuelve Array de objetos con
 *  { fileName, featureName, scenarios, rawContent }
 */
function readFeatureFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.feature'));
  return files.map(f => {
    const raw     = fs.readFileSync(path.join(dir, f), 'utf-8');
    const parsed  = parseFeatureContent(raw);
    return {
      fileName:    f,
      featureName: parsed.featureName || f.replace('.feature', ''),
      scenarios:   parsed.scenarios,
      rawContent:  raw,
    };
  }).sort((a, b) => a.featureName.localeCompare(b.featureName));
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

/** Renderiza headers como tabla compacta */
function renderHeadersTable(headers) {
  if (!headers || typeof headers !== 'object' || !Object.keys(headers).length) {
    return `<span class="api-no-data">(sin headers)</span>`;
  }
  const rows = Object.entries(headers).map(([k, v]) =>
    `<tr><td class="api-hdr-key">${esc(k)}</td><td class="api-hdr-val">${esc(String(v))}</td></tr>`
  ).join('');
  return `<table class="api-headers-table"><tbody>${rows}</tbody></table>`;
}

/** Intenta formatear un body: JSON → pretty, XML → highlight, texto → plain */
function formatBody(body) {
  if (!body || body === '(sin body)' || body === '(none)') {
    return `<span class="api-no-data">(sin body)</span>`;
  }
  const s = String(body).trim();
  // JSON
  try {
    const obj = JSON.parse(s);
    return `<pre class="api-body api-body-json">${esc(JSON.stringify(obj, null, 2).substring(0, 1200))}</pre>`;
  } catch { /* no JSON */ }
  // XML / SOAP
  if (s.startsWith('<')) {
    return `<pre class="api-body api-body-xml">${esc(s.substring(0, 1200))}</pre>`;
  }
  return `<pre class="api-body">${esc(s.substring(0, 1200))}</pre>`;
}

/** Extrae código HTTP del campo status "200 OK" → "200" */
function httpStatusCode(status) {
  const m = String(status).match(/^(\d{3})/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Color del status HTTP */
function statusColor(code) {
  if (code >= 200 && code < 300) return '#10b981';
  if (code >= 300 && code < 400) return '#06b6d4';
  if (code >= 400 && code < 500) return '#f59e0b';
  return '#ef4444';
}

/** API: tabla resumen + paneles request/response por testcase */
function renderAPI(suiteList) {
  if (!suiteList.length) return noData();

  let html = `<div class="mod-section">
    <p class="mod-info">Validación de servicios REST y SOAP: contratos de respuesta, códigos HTTP y schemas.
    Los paneles de <b>Request / Response</b> se muestran después de ejecutar las pruebas con <code>npm test</code>.</p>

    <table class="data-table" style="margin-bottom:8px">
      <thead><tr><th>Spec</th><th>Test Case</th><th>Tipo</th><th>Tiempo</th><th>Estado</th></tr></thead>
      <tbody>`;

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
        html += `<tr class="row-detail"><td colspan="5"><pre class="error-msg">${esc(tc.failure.substring(0,300))}</pre></td></tr>`;
      }
    }
  }
  html += `</tbody></table>`;

  // ── Paneles Request / Response por testcase ──────────────────────────────
  let hasInteractions = false;

  for (const s of suiteList) {
    const specName = s.name.replace(/\\/g,'/').split('/').pop().replace('.spec.ts','');
    const type = specName.toUpperCase().includes('SOAP') ? '🧼 SOAP' : '🌐 REST';

    for (const tc of s.testcases) {
      const interactions = extractApiInteractions(tc.output);
      if (!interactions.length) continue;
      hasInteractions = true;

      const panelId = 'api-panel-' + Math.random().toString(36).slice(2, 8);
      html += `
      <div class="api-tc-block ${tc.passed ? '' : 'api-tc-fail'}">
        <div class="api-tc-header">
          <span class="api-tc-status">${tc.passed ? '✅' : '❌'}</span>
          <span class="api-tc-badge">${type}</span>
          <span class="api-tc-name">${esc(tc.name)}</span>
          <span class="api-tc-time">⏱ ${fmtSec(tc.time)}</span>
          <button class="ev-toggle-btn" onclick="toggleEvidence('${panelId}')">
            Ver Request/Response ▾
          </button>
        </div>
        <div id="${panelId}" style="display:none">`;

      for (let idx = 0; idx < interactions.length; idx++) {
        const it = interactions[idx];
        const code = httpStatusCode(it.status);
        const sColor = statusColor(code);
        const isSoap = it.method.toUpperCase().includes('SOAP') || type.includes('SOAP');
        const callId = `${panelId}-call-${idx}`;

        html += `
        <div class="api-interaction">
          <div class="api-interaction-label">
            <span class="api-call-num">#${idx + 1}</span>
            <span class="api-method-badge" style="background:${isSoap?'#8b5cf6':'#6366f1'}">${isSoap ? 'SOAP' : it.method.replace(' (SOAP)','')}</span>
            <span class="api-url">${esc(it.url)}</span>
            ${it.status ? `<span class="api-status-pill" style="color:${sColor};border-color:${sColor}">${esc(it.status)}</span>` : ''}
            ${it.duration ? `<span class="api-duration">⏱ ${esc(it.duration)}</span>` : ''}
          </div>

          <div class="api-panels">
            <!-- REQUEST -->
            <div class="api-panel">
              <div class="api-panel-title req-title">
                📤 Request
                ${it.soapAction && it.soapAction !== '(none)' ? `<span class="api-soap-action">SOAPAction: ${esc(it.soapAction)}</span>` : ''}
              </div>
              <div class="api-panel-section">
                <div class="api-section-label">Headers</div>
                ${renderHeadersTable(it.reqHeaders)}
              </div>
              <div class="api-panel-section">
                <div class="api-section-label">Body</div>
                ${formatBody(it.reqBody)}
              </div>
            </div>

            <!-- RESPONSE -->
            <div class="api-panel">
              <div class="api-panel-title resp-title" style="border-color:${sColor}">
                📥 Response
                ${it.status ? `<span class="api-status-big" style="color:${sColor}">${esc(it.status)}</span>` : ''}
                ${it.duration ? `<span class="api-dur-badge">⏱ ${esc(it.duration)}</span>` : ''}
              </div>
              <div class="api-panel-section">
                <div class="api-section-label">Headers</div>
                ${renderHeadersTable(it.respHeaders)}
              </div>
              <div class="api-panel-section">
                <div class="api-section-label">Body</div>
                ${formatBody(it.respBody)}
              </div>
            </div>
          </div>
        </div>`;
      }

      html += `</div></div>`; // panelId div, api-tc-block
    }
  }

  if (!hasInteractions) {
    html += `<div class="api-no-interactions">
      <span>ℹ️</span>
      <p>Los detalles de Request/Response aparecerán aquí después de la próxima ejecución de <code>npm test</code>.</p>
      <p>El helper <code>api-helper.ts</code> ya está configurado para registrar las tramas automáticamente.</p>
    </div>`;
  }

  html += `</div>`;
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

/** Resalta una keyword Gherkin con su color correspondiente */
function gherkinKeywordSpan(keyword) {
  const colors = { Given:'#06b6d4', When:'#8b5cf6', Then:'#10b981', And:'#64748b', But:'#f97316' };
  const col = colors[keyword] || '#64748b';
  return `<span class="gk-kw" style="color:${col}">${esc(keyword)}</span>`;
}

/** Resalta valores entre comillas dentro del texto de un step */
function highlightStepText(text) {
  return esc(text).replace(/&quot;([^&]*)&quot;/g,
    '<span class="gk-val">&quot;$1&quot;</span>');
}

/** BDD: muestra features Gherkin con syntax-highlight + resultado de ejecución */
function renderBDD(suiteList, features) {
  // Construir índice de resultados por nombre de feature/escenario
  // Los tests BDD en el XML tienen hostname 'bdd-ui' y su nombre suele ser
  // el scenario name o el feature name
  const resultIndex = {};  // key: nombre normalizado → { passed, time, failure }
  for (const s of suiteList) {
    for (const tc of s.testcases) {
      const key = tc.name.toLowerCase().trim();
      resultIndex[key] = tc;
    }
    // También indexar por el nombre del archivo de suite
    const suiteName = s.name.replace(/\\/g,'/').split('/').pop()
      .replace('.spec.ts','').replace('.feature','').toLowerCase();
    if (!resultIndex[suiteName]) {
      resultIndex[suiteName] = {
        passed:  s.failures === 0,
        time:    s.time,
        failure: null,
        _suite:  true,
      };
    }
  }

  const hasBddResults = suiteList.length > 0;

  // Si no hay features en disco, caer al render genérico
  if (!features || !features.length) {
    if (!hasBddResults) return noData();
    // Render básico con sólo resultados del XML
    let html2 = `<div class="mod-section">
      <p class="mod-info">Escenarios Gherkin ejecutados con Playwright-BDD.</p>
      <table class="data-table">
        <thead><tr><th>Escenario</th><th>Suite</th><th>Tiempo</th><th>Estado</th></tr></thead><tbody>`;
    for (const s of suiteList) {
      const sn = s.name.replace(/\\/g,'/').split('/').pop().replace('.spec.ts','');
      for (const tc of s.testcases) {
        html2 += `<tr class="${tc.passed?'':'row-fail'}">
          <td>${esc(tc.name)}</td><td class="cell-mono">${esc(sn)}</td>
          <td>${fmtSec(tc.time)}</td><td>${statusBadge(tc.passed)}</td></tr>`;
        if (!tc.passed && tc.failure) {
          html2 += `<tr class="row-detail"><td colspan="4"><pre class="error-msg">${esc(tc.failure.substring(0,300))}</pre></td></tr>`;
        }
      }
    }
    html2 += `</tbody></table></div>`;
    return html2;
  }

  // ── Render principal: features con syntax-highlight ───────────────────────
  let html = `<div class="mod-section">
    <p class="mod-info">
      Escenarios en lenguaje natural <b>Gherkin</b> ejecutados con Playwright-BDD.
      ${features.length} feature(s) encontrado(s) en <code>GenerateTest/features/</code>.
      ${hasBddResults
        ? `Resultados del XML disponibles.`
        : `<span style="color:var(--warn)">⚠ Sin resultados de ejecución — ejecuta <code>npm test</code> para ver el estado.</span>`}
    </p>`;

  // Resumen de features en tabla
  html += `<table class="data-table" style="margin-bottom:24px">
    <thead><tr><th>Feature</th><th>Archivo</th><th>Escenarios</th><th>Estado</th></tr></thead>
    <tbody>`;
  for (const feat of features) {
    const key  = feat.featureName.toLowerCase().trim();
    const res  = resultIndex[key] || resultIndex[feat.fileName.replace('.feature','').toLowerCase()];
    const statLabel = !res ? 'Sin ejecutar'
      : res.passed    ? 'PASS'
      : 'FAIL';
    const statCls = !res ? 'status-none' : res.passed ? 'status-pass' : 'status-fail';
    const time = res && res.time ? `⏱ ${fmtSec(res.time)}` : '';
    html += `<tr>
      <td><b>${esc(feat.featureName)}</b></td>
      <td class="cell-mono">${esc(feat.fileName)}</td>
      <td>${feat.scenarios.length}</td>
      <td><span class="badge ${statCls}">${statLabel}</span> ${time}</td>
    </tr>`;
  }
  html += `</tbody></table>`;

  // Detalle de cada feature con Gherkin
  for (const feat of features) {
    const featKey  = feat.featureName.toLowerCase().trim();
    const featRes  = resultIndex[featKey] || resultIndex[feat.fileName.replace('.feature','').toLowerCase()];
    const featOk   = !featRes ? null : featRes.passed;
    const borderCol = featOk === null ? 'var(--border)' : featOk ? '#10b981' : '#ef4444';

    const panelId  = 'bdd-' + feat.fileName.replace(/[^a-z0-9]/gi, '-');

    html += `
    <div class="bdd-feature-block" style="border-color:${borderCol}">
      <div class="bdd-feature-header">
        <span class="bdd-feature-icon">🥒</span>
        <span class="bdd-feature-name">${esc(feat.featureName)}</span>
        <span class="bdd-feature-file">${esc(feat.fileName)}</span>
        ${featOk === null
          ? `<span class="badge status-none">SIN EJECUTAR</span>`
          : statusBadge(featOk)}
        ${featRes && featRes.time ? `<span class="bdd-time">⏱ ${fmtSec(featRes.time)}</span>` : ''}
        <button class="ev-toggle-btn" onclick="toggleEvidence('${panelId}')">Ver Gherkin ▾</button>
      </div>

      <div id="${panelId}" style="display:none">`;

    // Mostrar error de ejecución si existe
    if (featRes && !featRes.passed && featRes.failure) {
      html += `<div class="bdd-error-wrap">
        <div class="bdd-error-title">❌ Error de ejecución</div>
        <pre class="error-msg">${esc(featRes.failure.substring(0, 400))}</pre>
      </div>`;
    }

    // Renderizar cada escenario con Gherkin
    for (const scenario of feat.scenarios) {
      // Buscar resultado específico del escenario
      const scKey  = scenario.name.toLowerCase().trim();
      const scRes  = resultIndex[scKey] || featRes;
      const scOk   = scRes ? scRes.passed : null;

      html += `
      <div class="bdd-scenario ${scOk === false ? 'bdd-scenario-fail' : ''}">
        <div class="bdd-scenario-header">
          <span class="gk-scenario-kw">${esc(scenario.type)}</span>
          <span class="gk-scenario-name">${esc(scenario.name)}</span>
          ${scOk === null
            ? `<span class="badge status-none" style="font-size:9px">SIN EJECUTAR</span>`
            : statusBadge(scOk)}
          ${scRes && scRes.time && !scRes._suite ? `<span class="bdd-time">⏱ ${fmtSec(scRes.time)}</span>` : ''}
        </div>
        <div class="bdd-steps">`;

      for (const step of scenario.steps) {
        html += `
          <div class="bdd-step">
            ${gherkinKeywordSpan(step.keyword)}
            <span class="gk-text">${highlightStepText(step.text)}</span>
          </div>`;
        if (step.extra) {
          html += `<pre class="gk-extra">${esc(step.extra.trim())}</pre>`;
        }
      }

      html += `</div></div>`; // bdd-steps, bdd-scenario
    }

    html += `</div></div>`; // panelId, bdd-feature-block
  }

  html += `</div>`;
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
        const errorNum = blk.total
          ? (blk.total.errorRate !== undefined ? blk.total.errorRate : parseFloat(blk.total.errorPct))
          : 0;
        const resultColor = errorNum === 0 ? '#10b981' : errorNum < 20 ? '#f59e0b' : '#ef4444';
        const tipoIcon = blk.tipo === 'SPIKE' ? '⚡' : '🔼';
        html += `
        <div class="nf-block">
          <table class="data-table nf-table">
            <thead>
              <tr>
                <th colspan="8" class="nf-suite-th">
                  <span class="nf-suite-title">${tipoIcon} <b>${esc(blk.name)}</b></span>
                  <span class="nf-url">${esc(blk.url)}</span>
                  <span class="nf-tipo-badge">${blk.tipo}</span>
                </th>
              </tr>
              <tr><th>Escenario</th><th>Hilos</th><th>Peticiones</th><th>Prom(ms)</th><th>Mín(ms)</th><th>Máx(ms)</th><th>% Error</th><th>TPS</th></tr>
            </thead><tbody>`;
        const nfVal = (v) => (v === null || v === undefined) ? '-' : v;
        const nfTps = (v) => (v === null || v === undefined) ? '-' : (+v).toFixed(2);
        for (const row of blk.rows) {
          const ep = row.errorRate !== undefined ? row.errorRate : parseFloat(row.errorPct);
          const ec = ep >= 20 ? 'c-fail' : ep >= 5 ? 'c-warn' : 'c-pass';
          html += `<tr>
            <td>#${row.escenario}</td><td>${row.hilos}</td><td>${row.peticiones}</td>
            <td>${nfVal(row.prom)}</td><td>${nfVal(row.min)}</td><td>${nfVal(row.max)}</td>
            <td class="${ec}">${row.errorPct}</td><td>${nfTps(row.tps)}</td>
          </tr>`;
        }
        if (blk.total) {
          const ep2 = blk.total.errorRate !== undefined ? blk.total.errorRate : parseFloat(blk.total.errorPct);
          const ec2 = ep2 >= 20 ? 'c-fail' : ep2 >= 5 ? 'c-warn' : 'c-pass';
          html += `<tr class="nf-total-row">
            <td><b>TOTAL</b></td><td>—</td><td>${blk.total.peticiones}</td>
            <td>${nfVal(blk.total.prom)}</td><td>${nfVal(blk.total.min)}</td><td>${nfVal(blk.total.max)}</td>
            <td class="${ec2}"><b>${blk.total.errorPct}</b></td><td>${nfTps(blk.total.tps)}</td>
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

/** Renderiza la sección "Test Sets": una tabla por suite con desglose por tipo */
function renderTestSets(allSuites) {
  if (!allSuites || allSuites.length === 0) return noData();

  // Agrupar suites por nombre de test set
  const setsMap = new Map();
  for (const s of allSuites) {
    const setName = extractSuiteName(s.name);
    if (!setsMap.has(setName)) setsMap.set(setName, []);
    setsMap.get(setName).push(s);
  }

  let html = '';
  for (const [setName, suites] of setsMap) {
    // Totales del set
    const setTotals = suites.reduce(
      (a, s) => ({ tests: a.tests+s.tests, failures: a.failures+s.failures, time: a.time+s.time }),
      { tests: 0, failures: 0, time: 0 }
    );
    const setRate  = passRate(setTotals.tests, setTotals.failures);
    const setOk    = setTotals.failures === 0;
    const setColor = setTotals.tests === 0 ? 'var(--muted)' : setOk ? 'var(--pass)' : 'var(--fail)';

    html += `
    <div class="ts-set-block">
      <div class="ts-set-header">
        <span class="ts-set-icon">🗂️</span>
        <span class="ts-set-name">${esc(setName)}</span>
        <span class="ts-set-badge" style="color:${setColor}">${setTotals.tests > 0 ? setRate + '% éxito' : 'sin datos'}</span>
        <span class="ts-set-meta">${setTotals.tests} pruebas · ${fmtSec(setTotals.time)}</span>
      </div>
      <table class="ts-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Status</th>
            <th>Total</th>
            <th>✅ Pasaron</th>
            <th>❌ Fallaron</th>
            <th>⏱ Tiempo</th>
          </tr>
        </thead>
        <tbody>`;

    for (const mod of MODULES) {
      const modSuites = suites.filter(s => classifySuite(s) === mod.key);
      if (modSuites.length === 0) continue;
      const ms = modSuites.reduce(
        (a, s) => ({ tests: a.tests+s.tests, failures: a.failures+s.failures, time: a.time+s.time }),
        { tests: 0, failures: 0, time: 0 }
      );
      const ok     = ms.failures === 0;
      const status = ms.tests === 0 ? '➖' : ok ? '✅' : '❌';
      const rate   = passRate(ms.tests, ms.failures);
      html += `
          <tr>
            <td><span style="margin-right:6px">${mod.icon}</span>${mod.label}</td>
            <td><span class="ts-status-badge ${ok ? 'ts-pass' : 'ts-fail'}">${status} ${ms.tests > 0 ? (ok ? 'PASS' : 'FAIL') : 'N/A'}</span></td>
            <td>${ms.tests}</td>
            <td style="color:var(--pass)">${ms.tests - ms.failures}</td>
            <td style="color:${ms.failures > 0 ? 'var(--fail)' : 'var(--muted)'}">${ms.failures}</td>
            <td style="color:var(--muted)">${fmtSec(ms.time)}</td>
          </tr>`;
    }

    html += `
        </tbody>
        <tfoot>
          <tr class="ts-total-row">
            <td><b>TOTAL</b></td>
            <td><span class="ts-status-badge ${setOk ? 'ts-pass' : 'ts-fail'}">${setOk ? '✅ PASS' : '❌ FAIL'}</span></td>
            <td><b>${setTotals.tests}</b></td>
            <td style="color:var(--pass)"><b>${setTotals.tests - setTotals.failures}</b></td>
            <td style="color:${setTotals.failures > 0 ? 'var(--fail)' : 'var(--muted)'}"><b>${setTotals.failures}</b></td>
            <td style="color:var(--muted)"><b>${fmtSec(setTotals.time)}</b></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  }

  return html || noData();
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

function renderModuleContent(key, suiteList, features) {
  let body;
  switch (key) {
    case 'ui':            body = renderUI(suiteList);              break;
    case 'api':           body = renderAPI(suiteList);             break;
    case 'performance':   body = renderPerformance(suiteList);     break;
    case 'security':      body = renderSecurity(suiteList);        break;
    case 'accessibility': body = renderAccessibility(suiteList);   break;
    case 'visual':        body = renderVisual(suiteList);          break;
    case 'bdd':           body = renderBDD(suiteList, features);   break;
    case 'nonfunctional': body = renderNonFunctional(suiteList);   break;
    default:              return noData();
  }
  // Añade la grilla de evidencias al final de cada tab
  return body + renderEvidenceGrid(suiteList);
}

// Risk 5 (architectural): función monolítica que combina CSS, JS cliente, Chart.js y HTML.
// Para mejorar la mantenibilidad se recomienda separar en archivos de plantilla externos
// (portal.css, portal.client.js) y cargarlos con fs.readFileSync en tiempo de generación.
function buildPortalHTML(groups, totals, generatedAt, features, allSuites, statisticalAnalysis) {
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
    const content = renderModuleContent(mod.key, list, features);
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
    .btn-csv { display:inline-flex; align-items:center; gap:6px; margin-top:6px;
      padding:6px 14px; border-radius:8px; font-size:12px; font-weight:600;
      background:linear-gradient(135deg,#10b981,#059669); color:#fff;
      text-decoration:none; border:none; cursor:pointer;
      box-shadow:0 0 12px rgba(16,185,129,.35); transition:opacity .2s; }
    .btn-csv:hover { opacity:.85; }

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
    .nf-url   { font-size:11px; color:var(--muted); font-family:monospace; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .nf-tipo-badge { background:var(--surface); border:1px solid var(--border);
      padding:2px 10px; border-radius:20px; font-size:11px; font-weight:600; color:var(--text); white-space:nowrap; }
    .nf-suite-th { text-align:left !important; padding:10px 14px !important;
      background:var(--surface) !important; color:var(--text) !important;
      font-size:13px !important; border-bottom:1px solid var(--border); }
    .nf-suite-title { font-weight:600; margin-right:10px; }
    .nf-suite-th .nf-url { display:inline; margin-right:10px; }
    .nf-suite-th .nf-tipo-badge { vertical-align:middle; }
    .nf-total-row td { background:rgba(255,255,255,.04); font-weight:600; }
    .nf-result { margin-top:10px; font-size:13px; font-weight:600; padding:8px 12px;
      background:rgba(255,255,255,.04); border-radius:6px; }
    .nf-table { font-size:12px; }

    /* ─── No data ────────────────────────────── */
    .no-data { text-align:center; padding:60px 20px; color:var(--muted); }
    .no-data span { font-size:40px; display:block; margin-bottom:12px; }
    .no-data code { background:var(--surface2); padding:2px 8px; border-radius:4px; color:var(--text); }

    /* ─── API Request/Response panels ──────── */
    .api-tc-block { background:var(--surface); border:1px solid var(--border);
      border-radius:12px; margin-bottom:16px; overflow:hidden; }
    .api-tc-fail  { border-color:rgba(239,68,68,.35); }
    .api-tc-header { display:flex; align-items:center; gap:10px; padding:12px 18px;
      background:var(--surface2); flex-wrap:wrap; }
    .api-tc-status { font-size:16px; }
    .api-tc-badge  { font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px;
      background:#6366f1; color:#fff; white-space:nowrap; }
    .api-tc-name   { font-size:13px; font-weight:600; color:#fff; flex:1; min-width:120px; }
    .api-tc-time   { font-size:11px; color:var(--muted); }

    .api-interaction { border-top:1px solid var(--border); padding:16px 18px; }
    .api-interaction-label { display:flex; align-items:center; gap:10px;
      flex-wrap:wrap; margin-bottom:14px; }
    .api-call-num  { font-size:11px; font-weight:700; background:var(--border);
      color:var(--muted); padding:2px 7px; border-radius:10px; }
    .api-method-badge { font-size:11px; font-weight:700; padding:3px 10px;
      border-radius:6px; color:#fff; }
    .api-url       { font-size:12px; font-family:monospace; color:var(--text); flex:1;
      word-break:break-all; }
    .api-status-pill { font-size:11px; font-weight:700; padding:2px 10px; border-radius:12px;
      border:1px solid; background:transparent; white-space:nowrap; }
    .api-duration  { font-size:11px; color:var(--muted); white-space:nowrap; }
    .api-soap-action { font-size:10px; font-family:monospace; color:var(--muted);
      margin-left:8px; padding:1px 6px; background:var(--border); border-radius:4px; }

    .api-panels { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    @media(max-width:900px) { .api-panels { grid-template-columns:1fr; } }

    .api-panel { background:var(--surface2); border:1px solid var(--border); border-radius:10px;
      overflow:hidden; }
    .api-panel-title { display:flex; align-items:center; gap:10px; padding:10px 14px;
      font-size:13px; font-weight:600; color:#fff; border-bottom:2px solid #6366f1; }
    .req-title  { border-bottom-color:#6366f1; }
    .resp-title { }
    .api-status-big { font-weight:700; }
    .api-dur-badge  { font-size:11px; color:var(--muted); margin-left:auto; }

    .api-panel-section { padding:10px 14px; border-bottom:1px solid var(--border); }
    .api-panel-section:last-child { border-bottom:none; }
    .api-section-label { font-size:10px; font-weight:700; text-transform:uppercase;
      letter-spacing:.8px; color:var(--muted); margin-bottom:7px; }

    .api-headers-table { width:100%; border-collapse:collapse; font-size:11px; }
    .api-hdr-key { color:var(--muted); padding:3px 8px 3px 0; font-family:monospace;
      white-space:nowrap; vertical-align:top; width:35%; }
    .api-hdr-val { color:var(--text); padding:3px 0; word-break:break-all; font-family:monospace; }

    .api-body { background:#0a0d18; border-radius:6px; padding:10px 12px; font-size:11px;
      font-family:monospace; color:var(--text); overflow-x:auto; max-height:280px;
      overflow-y:auto; white-space:pre-wrap; word-break:break-all; margin:0; }
    .api-body-json { color:#93c5fd; }
    .api-body-xml  { color:#86efac; }
    .api-no-data   { font-size:11px; color:var(--muted); font-style:italic; }

    .api-no-interactions { background:var(--surface2); border:1px dashed var(--border);
      border-radius:10px; padding:24px; text-align:center; margin-top:16px; }
    .api-no-interactions span { font-size:28px; display:block; margin-bottom:10px; }
    .api-no-interactions p  { font-size:13px; color:var(--muted); margin-bottom:6px; }
    .api-no-interactions code { background:var(--border); padding:1px 6px; border-radius:4px; color:var(--text); }

    /* ─── BDD / Gherkin viewer ──────────────── */
    .bdd-feature-block { background:var(--surface); border:1px solid;
      border-radius:12px; margin-bottom:18px; overflow:hidden; }
    .bdd-feature-header { display:flex; align-items:center; gap:10px; padding:13px 18px;
      background:var(--surface2); flex-wrap:wrap; }
    .bdd-feature-icon   { font-size:18px; }
    .bdd-feature-name   { font-size:14px; font-weight:700; color:#fff; flex:1; min-width:120px; }
    .bdd-feature-file   { font-size:10px; font-family:monospace; color:var(--muted);
      background:var(--border); padding:2px 7px; border-radius:10px; }
    .bdd-time           { font-size:11px; color:var(--muted); }

    .bdd-error-wrap { padding:12px 18px; background:rgba(239,68,68,.07);
      border-bottom:1px solid rgba(239,68,68,.2); }
    .bdd-error-title { font-size:12px; font-weight:600; color:var(--fail); margin-bottom:6px; }

    .bdd-scenario { padding:14px 22px; border-top:1px solid var(--border); }
    .bdd-scenario-fail { background:rgba(239,68,68,.03); }
    .bdd-scenario-header { display:flex; align-items:center; gap:10px; margin-bottom:10px;
      flex-wrap:wrap; }
    .gk-scenario-kw   { font-size:11px; font-weight:700; text-transform:uppercase;
      letter-spacing:.8px; color:#8b5cf6; background:rgba(139,92,246,.15);
      padding:2px 8px; border-radius:10px; white-space:nowrap; }
    .gk-scenario-name { font-size:13px; font-weight:600; color:#fff; flex:1; }

    .bdd-steps { display:flex; flex-direction:column; gap:4px;
      padding:8px 14px; background:#0a0d18; border-radius:8px; }
    .bdd-step  { display:flex; align-items:baseline; gap:8px; font-size:12px;
      font-family:monospace; line-height:1.6; }
    .gk-kw    { font-weight:700; min-width:48px; text-align:right; flex-shrink:0; }
    .gk-text  { color:#e2e8f0; }
    .gk-val   { color:#fbbf24; }   /* valores entre comillas → amarillo */
    .gk-extra { background:rgba(255,255,255,.04); border-left:2px solid var(--border);
      font-size:10px; color:var(--muted); padding:4px 10px; margin:2px 0 2px 56px;
      border-radius:0 4px 4px 0; font-family:monospace; white-space:pre-wrap; }

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

    /* ─── Test Sets tab ──────────────────────── */
    .ts-set-block { background:var(--surface); border:1px solid var(--border); border-radius:14px;
      overflow:hidden; margin-bottom:20px; animation:fadeUp .35s ease both; }
    .ts-set-header { display:flex; align-items:center; gap:12px; padding:14px 20px;
      background:var(--surface2); border-bottom:1px solid var(--border); flex-wrap:wrap; }
    .ts-set-icon  { font-size:18px; }
    .ts-set-name  { font-size:15px; font-weight:700; color:#fff; flex:1; }
    .ts-set-badge { font-size:13px; font-weight:600; }
    .ts-set-meta  { font-size:12px; color:var(--muted); }
    .ts-table { width:100%; border-collapse:collapse; font-size:13px; }
    .ts-table th { padding:10px 16px; text-align:left; font-size:11px; font-weight:600;
      text-transform:uppercase; letter-spacing:.7px; color:var(--muted); background:var(--surface2);
      border-bottom:1px solid var(--border); }
    .ts-table td { padding:10px 16px; border-bottom:1px solid var(--border); }
    .ts-table tbody tr:hover { background:rgba(255,255,255,.03); }
    .ts-table tfoot td { border-top:1px solid var(--border); border-bottom:none; background:var(--surface2); }
    .ts-total-row td { font-size:13px; }
    .ts-status-badge { display:inline-block; padding:2px 8px; border-radius:6px;
      font-size:11px; font-weight:600; }
    .ts-pass { background:rgba(16,185,129,.15); color:var(--pass); }
    .ts-fail { background:rgba(239,68,68,.15);  color:var(--fail); }

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

    /* ─── Análisis Estadístico PNF ───────────────────────────────── */
    .btn-pdf {
      display:inline-flex; align-items:center; gap:8px; padding:10px 20px;
      background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
      border:none; border-radius:10px; font-size:13px; font-weight:600;
      cursor:pointer; box-shadow:0 0 18px rgba(99,102,241,.4);
      transition:opacity .2s,transform .2s;
    }
    .btn-pdf:hover { opacity:.88; transform:translateY(-1px); }
    .btn-pdf:disabled { opacity:.5; cursor:wait; }

    .ai-concept-card {
      background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(139,92,246,.05));
      border:1px solid rgba(99,102,241,.3); border-radius:14px; margin-bottom:28px; overflow:hidden;
    }
    .ai-concept-header {
      display:flex; align-items:center; gap:10px; padding:14px 20px;
      background:rgba(99,102,241,.12); border-bottom:1px solid rgba(99,102,241,.2);
    }
    .ai-concept-icon { font-size:20px; }
    .ai-concept-title { font-size:14px; font-weight:700; color:#c4b5fd; flex:1; }
    .ai-toggle-btn {
      background:none; border:1px solid rgba(99,102,241,.4); color:#a78bfa;
      border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer;
    }
    .ai-toggle-btn:hover { background:rgba(99,102,241,.15); }
    .ai-concept-body {
      padding:20px 24px; font-size:13px; line-height:1.8; color:var(--text);
    }
    .ai-section-title {
      font-size:13px; font-weight:700; color:#c4b5fd; margin:14px 0 6px;
      padding-left:10px; border-left:3px solid #6366f1;
    }
    .ai-concept-body ul { margin:6px 0 6px 20px; }
    .ai-concept-body li { margin-bottom:4px; }

    .pnf-target-block {
      background:var(--surface); border:1px solid var(--border); border-radius:14px;
      padding:24px; margin-bottom:28px;
    }
    .pnf-kpi-row {
      display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
      gap:12px; margin-bottom:24px;
    }
    .pnf-kpi-card {
      background:var(--surface2); border:1px solid var(--border); border-radius:10px;
      padding:12px 14px; display:flex; flex-direction:column; gap:4px;
    }
    .pnf-kpi-label { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.7px; }
    .pnf-kpi-value { font-size:20px; font-weight:700; }
    .pnf-kpi-sub   { font-size:10px; color:var(--muted); }

    .pnf-charts-grid {
      display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
      gap:16px; margin-bottom:4px;
    }
    .pnf-chart-card {
      background:var(--surface2); border:1px solid var(--border); border-radius:10px;
      padding:14px;
    }
    .pnf-chart-title { font-size:12px; font-weight:600; color:var(--muted); margin-bottom:10px; }
    .pnf-chart-wrap  { position:relative; }

    @media(max-width:768px){
      .pnf-charts-grid { grid-template-columns:1fr; }
      .pnf-kpi-row     { grid-template-columns:repeat(2,1fr); }
    }
  </style>
  <!-- Chart.js para gráficas interactivas PNF -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <!-- jsPDF + html2canvas para exportar PDF -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
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
    <a href="report.csv" download="report.csv" class="btn-csv">⬇ Descargar CSV</a>
  </div>
</header>

<!-- ── Nav ─────────────────────────────────────────────── -->
<nav class="nav-bar">
  <button class="nav-btn active" id="tab-overview" onclick="showSection('overview')">📊 Resumen</button>
  ${MODULES.map(m=>`<button class="nav-btn" id="tab-${m.key}" onclick="showSection('${m.key}')">${m.icon} ${m.label}</button>`).join('\n  ')}
  <button class="nav-btn" id="tab-testsets" onclick="showSection('testsets')">🗂️ Test Sets</button>
  <button class="nav-btn" id="tab-pnfanalysis" onclick="showSection('pnfanalysis')">📊 Análisis Estadístico PNF</button>
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

  <!-- Test Sets section -->
  <section id="sec-testsets" class="mod-section-wrap" style="display:none">
    <div class="mod-header" style="--accent:#a78bfa">
      <div class="mod-title">🗂️ Test Sets</div>
      <div class="mod-stats-row">
        <span class="ms-item">Todas las suites organizadas por test set</span>
      </div>
    </div>
    ${renderTestSets(allSuites)}
  </section>

  <!-- Análisis Estadístico PNF -->
  <section id="sec-pnfanalysis" class="mod-section-wrap" style="display:none">
    <div class="mod-header" style="--accent:#6366f1">
      <div class="mod-title">📊 Análisis Estadístico PNF</div>
      <div class="mod-stats-row">
        <span class="ms-item">Regresión logística no lineal sobre resultados de pruebas de carga</span>
        <span class="ms-sep">·</span>
        <span class="ms-item" style="color:#6366f1">TPS = L / (1 + e<sup>-k(x-x₀)</sup>)</span>
      </div>
    </div>
    ${renderStatisticalAnalysis(statisticalAnalysis)}
  </section>

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

  /* ════════════════════════════════════════════════════════════════════
     ANÁLISIS ESTADÍSTICO PNF — Chart.js + jsPDF
     ════════════════════════════════════════════════════════════════════ */

  /* Toggle del panel IA */
  function toggleAiConcept() {
    const body = document.getElementById('ai-concept-body');
    const btn  = document.querySelector('.ai-toggle-btn');
    if (!body) return;
    const visible = body.style.display !== 'none';
    body.style.display = visible ? 'none' : '';
    if (btn) btn.textContent = visible ? 'Mostrar ▾' : 'Ocultar ▴';
  }

  /* Función logística para la curva de regresión */
  function logisticFn(x, L, k, x0) {
    const arg = Math.min(500, Math.max(-500, -k * (x - x0)));
    return L / (1 + Math.exp(arg));
  }

  /* Paleta de colores */
  const C = { data:'#2563EB', fit:'#DC2626', bp:'#059669', sat:'#F59E0B',
              cap:'#7C3AED', pos:'#16A34A', neg:'#DC2626',
              zoneOk:'#16A34A', zoneCaution:'#F59E0B', zoneRisk:'#DC2626' };

  /* Inicializa todos los gráficos cuando se activa el tab */
  const _pnfChartInstances = {};

  function initPnfCharts() {
    if (typeof Chart === 'undefined' || typeof NF_ANALYSIS_DATA === 'undefined') return;
    const analyses = NF_ANALYSIS_DATA.analyses || [];

    analyses.forEach((a, i) => {
      if (_pnfChartInstances['reg_' + i])  { _pnfChartInstances['reg_' + i].destroy(); }
      if (_pnfChartInstances['resid_' + i]){ _pnfChartInstances['resid_' + i].destroy(); }
      if (_pnfChartInstances['tps_' + i])  { _pnfChartInstances['tps_' + i].destroy(); }

      /* ── Gráfica 1: Regresión logística ── */
      const ctxReg = document.getElementById('chart-reg-' + i);
      if (ctxReg && a.xs && a.xs.length) {
        const scatterData = a.xs.map((x, j) => ({ x, y: a.ys[j] }));
        const xMin = Math.max(0, Math.min(...a.xs) * 0.7);
        const xMax = Math.max(...a.xs) * 1.45;
        const curveData = [];
        if (a.tienesAjuste && a.L && a.k && a.x0 != null) {
          const steps = 120;
          for (let s = 0; s <= steps; s++) {
            const x = xMin + (xMax - xMin) * s / steps;
            curveData.push({ x, y: logisticFn(x, a.L, a.k, a.x0) });
          }
        }
        const datasets = [
          { type:'scatter', label:'Datos reales (TPS)', data:scatterData,
            backgroundColor:C.data, pointRadius:7, pointHoverRadius:9,
            borderColor:'#fff', borderWidth:1.5, order:2 }
        ];
        if (curveData.length) {
          datasets.push({ type:'line', label:'Regresión logística', data:curveData,
            borderColor:C.fit, borderWidth:2.5, pointRadius:0, fill:false, order:1, tension:0 });
        }
        if (a.breakpoint) {
          datasets.push({ type:'line', label:'Breakpoint ' + a.breakpoint.toFixed(1) + ' usuarios',
            data:[{x:a.breakpoint,y:0},{x:a.breakpoint,y:a.L||Math.max(...a.ys)*1.2}],
            borderColor:C.bp, borderWidth:2, borderDash:[6,4], pointRadius:0, fill:false, order:0 });
        }
        if (a.L) {
          datasets.push({ type:'line', label:'Cap. máx. L=' + a.L.toFixed(2),
            data:[{x:xMin,y:a.L},{x:xMax,y:a.L}],
            borderColor:C.cap, borderWidth:1.5, borderDash:[4,4], pointRadius:0, fill:false, order:0 });
        }
        _pnfChartInstances['reg_' + i] = new Chart(ctxReg, {
          data: { datasets },
          options: {
            responsive:true, animation:{duration:600},
            plugins:{
              legend:{ labels:{ color:'#94a3b8', font:{size:11} } },
              tooltip:{ callbacks:{ label: ctx => ctx.dataset.label + ': ' + (+ctx.parsed.y).toFixed(2) + ' TPS' } }
            },
            scales:{
              x:{ type:'linear', title:{ display:true, text:'Usuarios Concurrentes', color:'#64748b' },
                  ticks:{ color:'#64748b' }, grid:{ color:'rgba(255,255,255,.05)' } },
              y:{ title:{ display:true, text:'TPS', color:'#64748b' },
                  ticks:{ color:'#64748b' }, grid:{ color:'rgba(255,255,255,.05)' }, min:0 }
            }
          }
        });
      }

      /* ── Gráfica 2: Residuales ── */
      const ctxResid = document.getElementById('chart-resid-' + i);
      if (ctxResid && a.residuals && a.residuals.length) {
        const labels = a.xs.map(x => x + ' u.');
        const resColors = a.residuals.map(r => r >= 0 ? C.pos : C.neg);
        _pnfChartInstances['resid_' + i] = new Chart(ctxResid, {
          type:'bar',
          data:{ labels, datasets:[{
            label:'Residual (real − modelo)',
            data: a.residuals,
            backgroundColor: resColors,
            borderRadius: 4,
          }]},
          options:{
            responsive:true, animation:{duration:600},
            plugins:{ legend:{ labels:{ color:'#94a3b8', font:{size:11} } } },
            scales:{
              x:{ ticks:{ color:'#64748b' }, grid:{ color:'rgba(255,255,255,.05)' } },
              y:{ ticks:{ color:'#64748b' }, grid:{ color:'rgba(255,255,255,.05)' },
                  title:{ display:true, text:'TPS', color:'#64748b' } }
            }
          }
        });
      }

      /* ── Gráfica 3: TPS por escenario con zonas de riesgo ── */
      const ctxTps = document.getElementById('chart-tps-' + i);
      if (ctxTps && a.xs && a.xs.length) {
        const labels = a.xs.map(x => x + ' u.');
        const bp   = a.breakpoint  || 0;
        const bp95 = a.breakpoint95 || 0;
        const barColors = a.xs.map(x => {
          if (a.tienesAjuste && bp && x <= bp) return C.zoneOk;
          if (a.tienesAjuste && bp95 && x <= bp95) return C.zoneCaution;
          return C.zoneRisk;
        });
        _pnfChartInstances['tps_' + i] = new Chart(ctxTps, {
          type:'bar',
          data:{ labels, datasets:[{
            label:'TPS por escenario', data: a.ys,
            backgroundColor: barColors, borderRadius:5,
          }]},
          options:{
            responsive:true, animation:{duration:600},
            plugins:{
              legend:{ labels:{ color:'#94a3b8', font:{size:11} } },
              tooltip:{ callbacks:{ label: ctx => 'TPS: ' + (+ctx.parsed.y).toFixed(2) } }
            },
            scales:{
              x:{ ticks:{ color:'#64748b' }, grid:{ color:'rgba(255,255,255,.05)' } },
              y:{ ticks:{ color:'#64748b' }, grid:{ color:'rgba(255,255,255,.05)' },
                  title:{ display:true, text:'TPS', color:'#64748b' }, min:0 }
            }
          }
        });
      }
    });
  }

  /* Activa los charts la primera vez que se muestra el tab PNF.
     NOTA: NO se redefine showSection (causaría recursión por hoisting).
     Se usa un event listener sobre el botón de navegación. */
  let _pnfChartsReady = false;
  document.addEventListener('DOMContentLoaded', function () {
    const pnfTab = document.getElementById('tab-pnfanalysis');
    if (pnfTab) {
      pnfTab.addEventListener('click', function () {
        if (!_pnfChartsReady) {
          setTimeout(initPnfCharts, 120);
          _pnfChartsReady = true;
        }
      });
    }
  });

  /* ── PDF download ──────────────────────────────────────────────── */
  async function downloadPnfPdf() {
    const btn = document.getElementById('btn-pdf-pnf');
    if (!window.jspdf || !window.html2canvas) {
      alert('Las librerías de PDF (jsPDF / html2canvas) no se cargaron. Verifica la conexión a internet.');
      return;
    }
    btn.disabled = true;
    btn.textContent = '⏳ Generando PDF...';

    try {
      const { jsPDF } = window.jspdf;
      const root      = document.getElementById('pnf-analysis-root');
      const aiBlock   = document.getElementById('ai-concept-block');

      // Forzar expansión del panel IA
      const aiBody = document.getElementById('ai-concept-body');
      const wasHidden = aiBody && aiBody.style.display === 'none';
      if (wasHidden) aiBody.style.display = '';

      const canvas = await html2canvas(root, {
        backgroundColor: '#111827',
        scale: 1.6,
        useCORS: true,
        logging: false,
        windowWidth: 1280,
      });

      if (wasHidden) aiBody.style.display = 'none';

      const imgData = canvas.toDataURL('image/png', 0.95);
      const pdf     = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const pdfW    = pdf.internal.pageSize.getWidth();
      const pdfH    = pdf.internal.pageSize.getHeight();
      const margin  = 10;
      const usableW = pdfW - margin * 2;
      const imgH    = (canvas.height / canvas.width) * usableW;

      // Portada
      pdf.setFillColor(13, 15, 26);
      pdf.rect(0, 0, pdfW, pdfH, 'F');
      pdf.setTextColor(194, 181, 253);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Informe de Proyección Estadística PNF', pdfW / 2, 28, { align:'center' });
      pdf.setFontSize(11);
      pdf.setTextColor(100, 116, 139);
      pdf.text('TPS = L / (1 + e^(-k*(x-x0))) — Regresión Logística No Lineal', pdfW / 2, 36, { align:'center' });
      pdf.text('Generado: ' + new Date().toLocaleString('es-CO', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }), pdfW / 2, 43, { align:'center' });

      // Imagen del análisis (puede ocupar varias páginas)
      let yPos = 52;
      let remaining = imgH;
      let srcY = 0;

      while (remaining > 0) {
        const pageH = pdfH - yPos - margin;
        const slice = Math.min(remaining, pageH);
        const sliceRatio = slice / imgH;
        const srcSliceH  = canvas.height * sliceRatio;

        const sliceCanvas  = document.createElement('canvas');
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = srcSliceH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcSliceH, 0, 0, canvas.width, srcSliceH);

        pdf.addImage(sliceCanvas.toDataURL('image/png', 0.92), 'PNG', margin, yPos, usableW, slice);

        srcY      += srcSliceH;
        remaining -= slice;
        yPos       = margin;
        if (remaining > 0) pdf.addPage();
      }

      pdf.save('Informe_Proyeccion_Estadistica_PNF.pdf');
    } catch (e) {
      alert('Error al generar el PDF: ' + e.message);
      console.error(e);
    } finally {
      btn.disabled = false;
      btn.textContent = '⬇ Descargar Informe PDF';
    }
  }
</script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
function openInBrowser(filePath) {
  // Risk 2: escapar comillas dobles en la ruta por si el path las contiene
  const escaped = filePath.replace(/"/g, '\\"');
  const cmds = { win32: `start "" "${escaped}"`, darwin: `open "${escaped}"`, linux: `xdg-open "${escaped}"` };
  const cmd  = cmds[process.platform] || cmds.linux;
  console.log('🌐 Abriendo portal en el navegador...');
  exec(cmd, err => {
    if (err) {
      console.warn('⚠️  No se pudo abrir el navegador automáticamente.');
      console.warn(`   Ábrelo manualmente: ${filePath}`);
    }
  });
}

// ─── CSV Export ──────────────────────────────────────────────────────────────
function generateCSV(suites, features, generatedAt) {
  const csvEsc = v => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  const row = cols => cols.map(csvEsc).join(',');

  const lines = [];

  // ── Header
  lines.push(row([
    'Tipo','Suite','Proyecto/Navegador','Caso de Prueba','Estado',
    'Duración(s)','Timestamp','LCP(ms)','CLS','TBT(ms)',
    'Categoría Seguridad','Críticos A11y','Serios A11y','Moderados A11y','Menores A11y',
    'TPS Promedio','% Error NF','Error'
  ]));

  for (const suite of suites) {
    const module = classifySuite(suite);
    const project = suite.project || suite.browser || '';

    for (const tc of (suite.testcases || [])) {
      const status = tc.failed ? 'FAIL' : tc.skipped ? 'SKIP' : 'PASS';
      const dur = tc.time ? parseFloat(tc.time).toFixed(3) : '';
      const errMsg = tc.failure ? String(tc.failure).replace(/[\r\n]+/g, ' ').substring(0, 200) : '';
      const output = tc.output || '';

      // Performance metrics
      let lcp = '', cls = '', tbt = '';
      if (module === 'performance') {
        const pm = extractPerfMetrics(tc);
        if (pm.vital) {
          lcp = pm.vital.lcp !== undefined ? pm.vital.lcp : '';
          cls = pm.vital.cls !== undefined ? pm.vital.cls : '';
          tbt = pm.vital.tbt !== undefined ? pm.vital.tbt : '';
        }
      }

      // Security category
      let secCat = '';
      if (module === 'security') {
        secCat = securityCategory(tc.classname || tc.name || '');
      }

      // Accessibility counts
      let a11yCrit = '', a11ySer = '', a11yMod = '', a11yMin = '';
      if (module === 'accessibility') {
        const am = extractA11yMetrics(tc);
        if (am.summary) {
          a11yCrit = am.summary.critical !== undefined ? am.summary.critical : '';
          a11ySer  = am.summary.serious  !== undefined ? am.summary.serious  : '';
          a11yMod  = am.summary.moderate !== undefined ? am.summary.moderate : '';
          a11yMin  = am.summary.minor    !== undefined ? am.summary.minor    : '';
        }
      }

      // Non-functional
      let tps = '', pctErr = '';
      if (module === 'nonfunctional') {
        const nfTables = extractNfTables(output);
        if (nfTables.length > 0) {
          const last = nfTables[nfTables.length - 1];
          const lastRow = last.rows && last.rows.length > 0 ? last.rows[last.rows.length - 1] : null;
          if (lastRow) {
            tps    = lastRow.tps    || '';
            pctErr = lastRow.errPct || '';
          }
        }
      }

      lines.push(row([
        module, suite.name, project, tc.name, status, dur,
        generatedAt, lcp, cls, tbt,
        secCat, a11yCrit, a11ySer, a11yMod, a11yMin,
        tps, pctErr, errMsg
      ]));
    }

    // If suite has no testcases, add one summary row
    if (!suite.testcases || suite.testcases.length === 0) {
      const status = suite.failures > 0 ? 'FAIL' : 'PASS';
      lines.push(row([
        module, suite.name, project, '(suite)', status,
        suite.time ? parseFloat(suite.time).toFixed(3) : '',
        generatedAt, '', '', '', '', '', '', '', '', '', '', ''
      ]));
    }
  }

  // ── BDD Feature rows (features without XML results → SIN EJECUTAR)
  for (const feat of features) {
    for (const sc of (feat.scenarios || [])) {
      lines.push(row([
        'bdd', feat.name, feat.file, sc.name, 'SIN EJECUTAR',
        '', generatedAt, '', '', '', '', '', '', '', '', '', '', ''
      ]));
    }
  }

  return lines.join('\r\n');
}

async function main() {
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
  // Risk 1: timezone configurable via PORTAL_TZ; fallback a la TZ del sistema
  const PORTAL_TZ   = process.env.PORTAL_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const generatedAt = new Date().toLocaleString('es-CO', { timeZone: PORTAL_TZ, dateStyle:'medium', timeStyle:'short' });
  const features    = readFeatureFiles(FEATURES_DIR);
  console.log(`🥒 Features Gherkin encontrados: ${features.length}`);

  // ── Análisis Estadístico PNF
  let statisticalAnalysis = { analyses: [], aiConcept: null };
  try {
    const nfSuites = groups['nonfunctional'] || [];
    if (nfSuites.length > 0) {
      console.log('📊 Computando análisis estadístico PNF...');
      statisticalAnalysis = await computeStatisticalAnalysis(nfSuites);
      const n = statisticalAnalysis.analyses.length;
      const hasAI = !!statisticalAnalysis.aiConcept;
      const src = process.env.OPENAI_API_KEY ? 'GPT-4o-mini' : 'reglas';
      console.log('   → ' + n + ' target(s) analizados | Concepto IA: ' + (hasAI ? src : 'N/A'));
    }
  } catch (e) {
    console.warn('Análisis estadístico PNF no disponible:', e.message);
  }

  let html = buildPortalHTML(groups, totals, generatedAt, features, suites, statisticalAnalysis);

  // Risk 6: banner visible en el portal cuando no hay datos de prueba
  if (!fs.existsSync(XML_FILE)) {
    const noDataBanner = `<div id="no-data-banner" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#ef4444;color:#fff;padding:14px 24px;text-align:center;font-family:sans-serif;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.3)">` +
      `⚠️ Portal sin datos — no se encontró <code>test-results/results.xml</code>. Ejecuta las pruebas con <code>npm test</code> primero.</div>`;
    html = html.replace(/<body[^>]*>/, m => m + noDataBanner);
  }

  fs.writeFileSync(OUT_FILE, html, 'utf-8');
  console.log(`✅ Portal generado: ${OUT_FILE}`);

  const csv = generateCSV(suites, features, generatedAt);
  // Risk 8: BOM configurable \u2014 CSV_BOM=false deshabilita el BOM para herramientas Unix/pandas
  const csvContent = process.env.CSV_BOM !== 'false' ? '\uFEFF' + csv : csv;
  fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');
  console.log(`📊 CSV generado: ${CSV_FILE}`);

  openInBrowser(OUT_FILE);
}

main().catch(e => { console.error(e.message); process.exit(1); });