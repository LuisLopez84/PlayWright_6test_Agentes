/* Capa en español del Smart Reporter (se inyecta al final del HTML, ver inject.js).
 *  1) Traduce la interfaz en vivo (nodos de texto + placeholder/title/aria-label) con un diccionario;
 *     lo que no está en el diccionario (títulos de pruebas, errores, rutas, código) NO se toca.
 *  2) Agrega el botón «Guía del reporte» con la introducción y la explicación de cada métrica.
 * No modifica los datos del reporte ni su lógica: solo texto visible. */
(function () {
  'use strict';
  if (window.__smartEs) return;
  window.__smartEs = true;

  // ───────────────────────── Diccionario exacto ─────────────────────────
  // Valor string = traducción fija; valor función(node) = traducción según contexto.
  function isCountLabel(node) {
    var el = node && node.parentElement;
    var next = el && el.nextElementSibling;
    var prev = el && el.previousElementSibling;
    return !!((next && /^\d+$/.test((next.textContent || '').trim())) || (prev && /^\d+$/.test((prev.textContent || '').trim())));
  }
  function isAttemptStatus(node) {
    var el = node && node.parentElement;
    var prev = el && el.previousElementSibling;
    var t = prev ? (prev.textContent || '').trim() : '';
    return /^(Attempt|Intento) \d+$/.test(t);
  }
  function status(plural, singular) {
    return function (node) { return isAttemptStatus(node) ? singular : plural; };
  }

  var EXACT = {
    // Navegación y barra superior
    'Skip to content': 'Saltar al contenido', 'Search': 'Buscar', 'Export': 'Exportar',
    'Failures': 'Fallas', 'Regressions': 'Regresiones', 'Quarantined': 'En cuarentena',
    'All tests': 'Todas las pruebas', 'Insights': 'Resumen', 'History': 'Historial', 'Gallery': 'Galería',
    'Live': 'En vivo', 'Matrix': 'Matriz', 'Coverage': 'Cobertura', 'Accessibility': 'Accesibilidad',
    'Keyboard shortcuts': 'Atajos de teclado', 'Toggle sidebar': 'Mostrar u ocultar barra lateral',
    'Toggle sidebar (⌘B)': 'Mostrar u ocultar barra lateral (⌘B)', 'Command palette': 'Paleta de comandos',
    'Close': 'Cerrar', 'Open': 'Abrir', 'Download': 'Descargar', 'Views': 'Vistas', 'Theme': 'Tema',
    'Mode': 'Modo', 'Accent': 'Acento', 'System': 'Sistema', 'Light': 'Claro', 'Dark': 'Oscuro',
    'High contrast': 'Alto contraste', 'Default': 'Predeterminado', 'Ocean': 'Océano', 'Sunset': 'Atardecer',
    'Forest': 'Bosque', 'Rose': 'Rosa', 'Search (⌘K)': 'Buscar (⌘K)',
    'Theme: dark': 'Tema: oscuro', 'Theme: light': 'Tema: claro', 'Theme: system': 'Tema: sistema',
    'Theme: high contrast': 'Tema: alto contraste',
    // Estados (con contexto: contadores = plural femenino; intentos = singular masculino)
    'failed': status('fallidas', 'fallido'), 'passed': status('aprobadas', 'aprobado'),
    'skipped': status('omitidas', 'omitido'), 'timed out': status('con tiempo agotado', 'tiempo agotado'),
    'flaky': status('intermitentes', 'intermitente'), 'timedOut': 'tiempo agotado',
    'Failed': 'Fallidas', 'Passed': 'Aprobadas', 'Skipped': 'Omitidas',
    'Flaky': function (n) { return isCountLabel(n) ? 'Intermitentes' : 'Intermitente'; },
    'Regression': 'Regresión', 'New failure': 'Falla nueva', 'New': 'Nueva', 'Slow': 'Lenta',
    'Quarantine': 'Cuarentena', 'Fixed': 'Corregidas',
    // Resumen (Insights)
    'Pass rate': 'Tasa de aprobación', 'Duration': 'Duración', 'Tests': 'Pruebas', 'Health': 'Salud',
    'AI summary': 'Resumen de IA', 'Quality gate': 'Control de calidad', 'Failure clusters': 'Grupos de fallas',
    'Resolved clusters': 'Grupos resueltos', 'At risk': 'En riesgo', 'Efficiency': 'Eficiencia',
    'Slowest': 'Más lentas', 'Most flaky': 'Más inestables', 'New tests': 'Pruebas nuevas', 'Owners': 'Responsables',
    'Retry waste': 'Tiempo perdido en reintentos', 'Setup before the first test': 'Preparación antes de la primera prueba',
    'Worker utilisation': 'Uso de workers', 'Slow tests': 'Pruebas lentas', 'Flaky tests': 'Pruebas intermitentes',
    'Performance regressions': 'Regresiones de rendimiento', 'Performance improvements': 'Mejoras de rendimiento',
    'New failures': 'Fallas nuevas', 'Not in baseline run': 'No estaban en la corrida base',
    'Environment insights': 'Hallazgos del entorno', 'Reliability': 'Confiabilidad', 'Trends': 'Tendencias',
    'Compare': 'Comparar', '· pass': '· aprobación', '· stability': '· estabilidad', '· perf': '· rendimiento',
    'passing, trending unstable': 'aprueban, pero tienden a inestabilizarse',
    'insufficient history': 'historial insuficiente',
    'None this run.': 'Ninguna en esta corrida.', 'No quarantined tests.': 'No hay pruebas en cuarentena.',
    'No quality gate configured.': 'No hay control de calidad configurado.',
    'no new tests': 'sin pruebas nuevas', 'none new': 'ninguna nueva', 'flaky this run': 'intermitentes en esta corrida',
    'AI is off for this run (enableAIRecommendations or enableAISuiteHealth is false).':
      'La IA está desactivada en esta corrida (enableAIRecommendations o enableAISuiteHealth es false).',
    'AI analysis is off for this run (enableAIRecommendations is false). Copy AI prompt gives you the prompt to use elsewhere.':
      'El análisis de IA está desactivado en esta corrida (enableAIRecommendations es false). «Copiar prompt para IA» te da el prompt para usarlo en otro asistente.',
    'Line: three-run average. Dot: a run more than two standard deviations from the mean.':
      'Línea: promedio de tres corridas. Punto: corrida a más de dos desviaciones estándar de la media.',
    'No failure occurs in one project, browser or worker only.':
      'Ninguna falla ocurre solo en un proyecto, navegador o worker.',
    'Live results are off': 'Los resultados en vivo están desactivados',
    'Enable': 'Activa', 'and serve the report with': 'y sirve el reporte con',
    'to watch runs as they happen.': 'para ver las corridas mientras ocurren.',
    // Lista y detalle
    'Select a test': 'Selecciona una prueba', 'Use': 'Usa', 'and': 'y', 'to move,': 'para moverte,', 'to open.': 'para abrir.',
    'Group:': 'Agrupar por:', 'file': 'archivo', 'cluster': 'grupo de falla', 'project': 'proyecto', 'tag': 'etiqueta',
    'status': 'estado', 'grade': 'calificación', 'owner': 'responsable', 'none': 'ninguno',
    'Error': 'Error', 'Errors': 'Errores', 'Warnings': 'Advertencias', 'Source': 'Código fuente', 'Timeline': 'Línea de tiempo',
    'Steps': 'Pasos', 'Network': 'Red', 'Console': 'Consola', 'Attachments': 'Adjuntos', 'Attachment': 'Adjunto',
    'AI analysis': 'Análisis de IA', 'Attempts': 'Intentos', 'Expected': 'Esperado', 'Received': 'Recibido',
    'Expected and received': 'Esperado y recibido', 'Details': 'Detalles', 'Metadata': 'Metadatos', 'Median': 'Mediana',
    'Flakiness': 'Intermitencia', 'Annotations': 'Anotaciones', 'Request': 'Petición', 'Response': 'Respuesta',
    'Status': 'Estado', 'Project': 'Proyecto', 'Suite': 'Suite', 'Owner': 'Responsable', 'Tag': 'Etiqueta', 'File': 'Archivo',
    'Cluster': 'Grupo', 'Before': 'Antes', 'After': 'Después', 'Step': 'Paso', 'Info': 'Información', 'All': 'Todas',
    'Screenshots': 'Capturas', 'Videos': 'Videos', 'Traces': 'Trazas', 'Trace': 'Traza', 'Trace Viewer': 'Visor de trazas',
    'Open trace': 'Abrir traza', 'Open test': 'Abrir prueba', 'Copy failure summary': 'Copiar resumen de la falla',
    'Copy AI prompt': 'Copiar prompt para IA', 'Copy as Markdown': 'Copiar como Markdown', 'Copy CLI command': 'Copiar comando CLI',
    'Summary card': 'Tarjeta resumen', 'Results as CSV': 'Resultados en CSV', 'Results as JSON': 'Resultados en JSON',
    'Export results as CSV': 'Exportar resultados a CSV', 'Export results as JSON': 'Exportar resultados a JSON',
    'Actions': 'Acciones', 'Navigate': 'Navegar', 'Go to': 'Ir a', 'Last console': 'Última consola',
    'Attempt 1 (failed)': 'Intento 1 (fallido)', 'Attempt 2 (passed)': 'Intento 2 (aprobado)',
    'Loading trace...': 'Cargando traza...', 'Failed to load trace': 'No se pudo cargar la traza',
    'Load from file': 'Cargar desde archivo', 'Not enabled for this project.': 'No habilitado para este proyecto.',
    'No screenshot for this action': 'Sin captura para esta acción', 'Close context': 'Cerrar contexto',
    'Flaky in this run or by recent history': 'Intermitente en esta corrida o por historial reciente',
    'Close, or back to the list': 'Cerrar, o volver a la lista', 'Next or previous test': 'Prueba siguiente o anterior',
    'Previous or next failure': 'Falla anterior o siguiente', 'Next failure': 'Siguiente falla',
    'Next flaky test': 'Siguiente prueba intermitente', 'Filter tests': 'Filtrar pruebas',
    'Failures, All tests, Insights, History, Gallery': 'Fallas, Todas las pruebas, Resumen, Historial, Galería',
    'Toggle fullscreen': 'Pantalla completa', 'Resize test list': 'Cambiar tamaño de la lista',
    'Network requests': 'Peticiones de red', 'Steps by attempt': 'Pasos por intento', 'Test detail': 'Detalle de la prueba',
    'Run result': 'Resultado de la corrida', 'Group by': 'Agrupar por', 'Scrub the test timeline': 'Recorrer la línea de tiempo',
    'Changes since the baseline run': 'Cambios desde la corrida base', 'Attachment type': 'Tipo de adjunto',
    'open': 'abrir', 'close': 'cerrar', 'move': 'mover', 'None': 'Ninguno',
    'Run of': 'Corrida del', 'Baseline: run of': 'Línea base: corrida del', 'Grade': 'Calificación', 'At': 'En',
    'Attempt': 'Intento', 'vs baseline': 'vs corrida base',
    'attempts': 'intentos', 'attempt': 'intento', 'steps': 'pasos', 'step': 'paso', 'runs': 'corridas', 'run': 'corrida',
    'files': 'archivos', 'requests': 'peticiones', 'request': 'petición', 'errors': 'errores', 'error': 'error',
    'tests': 'pruebas', 'clusters': 'grupos', 'attachments': 'adjuntos', 'projects': 'proyectos', 'retries': 'reintentos', 'retry': 'reintento',
    'Results': 'Resultados', 'Summary': 'Resumen', 'Type': 'Tipo', 'Filter': 'Filtrar', 'Group': 'Agrupar',
    'Filter by URL...': 'Filtrar por URL...', 'Filter actions...': 'Filtrar acciones...',
    'Search tests, views, filters, actions': 'Buscar pruebas, vistas, filtros, acciones',
    'Search tests, views, filters, and actions': 'Buscar pruebas, vistas, filtros y acciones',
    'Filter: text, status:, tag:, file:, project:, owner:': 'Filtrar: texto, status:, tag:, file:, project:, owner:',
    'Outcome of each unstable test in each recorded run, oldest first': 'Resultado de cada prueba inestable en cada corrida registrada, de la más antigua a la más reciente',
    'Outcome of each test in each project, for the tests whose outcome differs between projects': 'Resultado de cada prueba en cada proyecto, para las pruebas cuyo resultado difiere entre proyectos',
    'Duration, last runs': 'Duración, últimas corridas', 'Duration, recent runs': 'Duración, corridas recientes',
    'Pass rate, recent runs': 'Tasa de aprobación, corridas recientes', 'Retry waste, recent runs': 'Tiempo perdido en reintentos, corridas recientes',
    'Flaky tests, recent runs': 'Pruebas intermitentes, corridas recientes'
  };

  // Nombres de pasos de Playwright (solo cuando el texto ES el paso: nombre solo, o nombre + argumento/duración)
  var STEPS = [
    ['Create request context', 'Crear contexto de peticiones'], ['Launch browser', 'Iniciar navegador'],
    ['Create context', 'Crear contexto'], ['Close context', 'Cerrar contexto'], ['Create page', 'Crear página'],
    ['Set viewport size', 'Fijar tamaño de ventana'], ['Wait for load state', 'Esperar estado de carga'],
    ['Wait for timeout', 'Esperar (timeout)'], ['Wait for function', 'Esperar función'], ['Wait for selector', 'Esperar selector'],
    ['Navigate to', 'Navegar a'], ['Get content', 'Obtener contenido'], ['Query count', 'Contar elementos'],
    ['Scroll into view', 'Desplazar a la vista'], ['Select option', 'Seleccionar opción'], ['Is visible', '¿Es visible?'],
    ['Evaluate', 'Evaluar (JS)'], ['Press', 'Presionar'], ['Click', 'Clic'], ['Fill', 'Rellenar'], ['Expect', 'Verificar']
  ];
  var STEP_REST = /^(\s·.*|\s\d.*|\s["'(].*|\slocator\(.*|\spage\..*|\s[A-Za-z]+\(.*)?$/;

  var MONTHS = { Jan: 'Ene', Apr: 'Abr', Aug: 'Ago', Dec: 'Dic' };
  function monthFix(s) {
    return s.replace(/(\b\d{1,2}\s)(Jan|Apr|Aug|Dec)\b/g, function (_, d, m) { return d + MONTHS[m]; });
  }
  function plural(n, one, many) { return n + ' ' + (n === '1' ? one : many); }
  var STATUS_ES = { passed: 'aprobada', failed: 'fallida', flaky: 'intermitente', timedOut: 'tiempo agotado', skipped: 'omitida', interrupted: 'interrumpida', 'did not run': 'no se ejecutó' };
  function st(s) { return STATUS_ES[s] || s; }
  var ATT = [
    [/^[Aa]ttempt (\d+) timed out at step '(.+)' after (.+)$/, function (m) { return 'El intento ' + m[1] + " agotó el tiempo en el paso '" + m[2] + "' tras " + m[3]; }],
    [/^[Aa]ttempt (\d+) timed out after (.+)$/, function (m) { return 'El intento ' + m[1] + ' agotó el tiempo tras ' + m[2]; }],
    [/^[Aa]ttempt (\d+) failed at step '(.+)' after (.+)$/, function (m) { return 'El intento ' + m[1] + " falló en el paso '" + m[2] + "' tras " + m[3]; }],
    [/^[Aa]ttempt (\d+) failed after (.+)$/, function (m) { return 'El intento ' + m[1] + ' falló tras ' + m[2]; }],
    [/^[Aa]ttempt (\d+) passed it in (.+)$/, function (m) { return 'el intento ' + m[1] + ' lo superó en ' + m[2]; }]
  ];
  function attemptSentence(t) {
    if (!/^[Aa]ttempt \d/.test(t)) return null;
    var parts = t.split('; '), out = [];
    for (var i = 0; i < parts.length; i++) {
      var done = false;
      for (var j = 0; j < ATT.length; j++) {
        var m = parts[i].match(ATT[j][0]);
        if (m) { out.push(ATT[j][1](m)); done = true; break; }
      }
      if (!done) return null;
    }
    return out.join('; ');
  }

  // ───────────────────────── Reglas con números / texto variable ─────────────────────────
  var RULES = [
    [/^(\d+) steps?$/, function (m) { return plural(m[1], 'paso', 'pasos'); }],
    [/^(\d+) attempts?$/, function (m) { return plural(m[1], 'intento', 'intentos'); }],
    [/^(\d+) files?$/, function (m) { return plural(m[1], 'archivo', 'archivos'); }],
    [/^(\d+) (?:recorded )?runs?$/, function (m) { return plural(m[1], 'corrida', 'corridas') + (/recorded/.test(m[0]) ? ' registradas' : ''); }],
    [/^(\d+) clusters?$/, function (m) { return plural(m[1], 'grupo', 'grupos'); }],
    [/^(\d+) projects?$/, function (m) { return plural(m[1], 'proyecto', 'proyectos'); }],
    [/^(\d+) attachments?$/, function (m) { return plural(m[1], 'adjunto', 'adjuntos'); }],
    [/^(\d+) errors?$/, function (m) { return plural(m[1], 'error', 'errores'); }],
    [/^(\d+) requests?(?: · (\d+) failed)?$/, function (m) { return plural(m[1], 'petición', 'peticiones') + (m[2] ? ' · ' + m[2] + ' fallidas' : ''); }],
    [/^(\d+) retr(?:y|ies)$/, function (m) { return plural(m[1], 'reintento', 'reintentos'); }],
    [/^(\d+) new$/, function (m) { return m[1] + ' nueva' + (m[1] === '1' ? '' : 's'); }],
    [/^last (\d+) runs$/i, function (m) { return 'últimas ' + m[1] + ' corridas'; }],
    [/^of last$/, function () { return 'de las últimas'; }],
    [/^Run of (.+)$/, function (m) { return 'Corrida del ' + monthFix(m[1]); }],
    [/^Baseline: run of(?: (.+))?$/, function (m) { return 'Línea base: corrida del' + (m[1] ? ' ' + monthFix(m[1]) : ''); }],
    [/^· compared with the previous (\d+) runs$/, function (m) { return '· comparado con las ' + m[1] + ' corridas anteriores'; }],
    [/^Recurring, (\d+) runs?$/, function (m) { return 'Recurrente, ' + plural(m[1], 'corrida', 'corridas'); }],
    [/^(\d+)% of (\d+) runs$/, function (m) { return m[1] + '% de ' + m[2] + ' corridas'; }],
    [/^(\d+)% of test time$/, function (m) { return m[1] + '% del tiempo de pruebas'; }],
    [/^Slowest (\d+)% \((\d+) tests?\)$/, function (m) { return 'Más lentas ' + m[1] + '% (' + m[2] + ')'; }],
    [/^Worker (\d+), (\d+) attempts?$/, function (m) { return 'Worker ' + m[1] + ', ' + plural(m[2], 'intento', 'intentos'); }],
    [/^(.+) busy, (.+) idle$/, function (m) { return m[1] + ' activo, ' + m[2] + ' libre'; }],
    [/^(.+) vs baseline$/, function (m) { return m[1] + ' vs corrida base'; }],
    [/^Since (.+)$/, function (m) { return 'Desde el ' + monthFix(m[1]); }],
    [/^Group: (.+)$/, function (m) { return 'Agrupar por: ' + (EXACT[m[1]] && typeof EXACT[m[1]] === 'string' ? EXACT[m[1]] : m[1]); }],
    [/^Grade ([A-F])$/, function (m) { return 'Calificación ' + m[1]; }],
    [/^Attempt (\d+)$/, function (m) { return 'Intento ' + m[1]; }],
    [/^Attempt (\d+) attachments$/, function (m) { return 'Adjuntos del intento ' + m[1]; }],
    [/^Screenshot (\d+)$/, function (m) { return 'Captura ' + m[1]; }],
    [/^Video (\d+)$/, function (m) { return 'Video ' + m[1]; }],
    [/^Trace (\d+)$/, function (m) { return 'Traza ' + m[1]; }],
    [/^Open (Screenshot|Video|Trace) (\d+)$/, function (m) { return 'Abrir ' + ({ Screenshot: 'captura', Video: 'video', Trace: 'traza' })[m[1]] + ' ' + m[2]; }],
    [/^Open (video|trace|screenshot) for (.+)$/, function (m) { return 'Abrir ' + ({ video: 'video', trace: 'traza', screenshot: 'captura' })[m[1]] + ' de ' + m[2]; }],
    [/^Every attempt failed at step '(.+)'$/, function (m) { return "Todos los intentos fallaron en el paso '" + m[1] + "'"; }],
    [/^The traces of attempt (\d+) and attempt (\d+) have the same requests and console errors and warnings\.$/,
      function (m) { return 'Las trazas de los intentos ' + m[1] + ' y ' + m[2] + ' tienen las mismas peticiones y los mismos errores y advertencias de consola.'; }],
    [/^(\d+) passed, (\d+) failed, (\d+) flaky( this run)?$/, function (m) { return m[1] + ' aprobadas, ' + m[2] + ' fallidas, ' + m[3] + ' intermitentes' + (m[4] ? ' en esta corrida' : ''); }],
    [/^Last (\d+) runs: (\d+) passed$/, function (m) { return 'Últimas ' + m[1] + ' corridas: ' + m[2] + ' aprobadas'; }],
    [/^Pass rate: (.+)$/, function (m) { return 'Tasa de aprobación: ' + m[1]; }],
    [/^Duration: (.+)$/, function (m) { return 'Duración: ' + m[1]; }],
    [/^Slow tests: (.+)$/, function (m) { return 'Pruebas lentas: ' + m[1]; }],
    [/^Flaky tests: (.+)$/, function (m) { return 'Pruebas intermitentes: ' + m[1]; }],
    [/^Tests in this cluster per run: (.+)$/, function (m) { return 'Pruebas de este grupo por corrida: ' + m[1]; }],
    [/^(.+): (passed|failed|flaky|timedOut|skipped|interrupted|did not run)(\s·.*)?$/, function (m) { return m[1] + ': ' + st(m[2]) + (m[3] || ''); }],
    [/^(.+) \((chromium|firefox|webkit)\)$/, function (m) { return m[1] + ' (' + m[2] + ')'; }],
    [/^(.+) \(browser not known\)$/, function (m) { return m[1] + ' (navegador desconocido)'; }],
    [/^(\d{1,2} [A-Za-z]{3}), (\d{2}:\d{2}) · (passed|failed|flaky|timedOut|skipped)(.*)$/, function (m) { return monthFix(m[1]) + ', ' + m[2] + ' · ' + st(m[3]) + m[4]; }],
    [/^(\d{1,2} [A-Za-z]{3}): (.+)$/, function (m) { return monthFix(m[1]) + ': ' + m[2]; }]
  ];

  function translate(raw, node) {
    var t = raw.replace(/\s+/g, ' ').trim();
    if (!t || t.length > 260) return null;
    var out = null;
    if (Object.prototype.hasOwnProperty.call(EXACT, t)) {
      var v = EXACT[t];
      out = typeof v === 'function' ? v(node) : v;
    }
    if (out == null) out = attemptSentence(t);
    if (out == null) {
      for (var i = 0; i < RULES.length; i++) {
        var m = t.match(RULES[i][0]);
        if (m) { out = RULES[i][1](m); break; }
      }
    }
    if (out == null) {
      for (var k = 0; k < STEPS.length; k++) {
        var en = STEPS[k][0];
        if (t.indexOf(en) === 0 && STEP_REST.test(t.slice(en.length))) { out = STEPS[k][1] + t.slice(en.length); break; }
      }
    }
    if (out == null) { var f = monthFix(t); if (f !== t) out = f; }
    return out == null || out === t ? null : out;
  }

  // ───────────────────────── Recorrido del DOM ─────────────────────────
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, TEMPLATE: 1, TITLE: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label'];
  function skipped(el) {
    for (; el && el !== document.documentElement; el = el.parentElement) {
      if (SKIP[el.tagName] || el.id === 'smart-es-root' || el.id === 'smart-es-about') return true;
    }
    return false;
  }
  function doText(n) {
    var v = n.nodeValue;
    if (!v || !v.trim() || skipped(n.parentElement)) return;
    var t = translate(v, n);
    if (t != null) n.nodeValue = v.match(/^\s*/)[0] + t + v.match(/\s*$/)[0];
  }
  function doAttrs(el) {
    if (skipped(el)) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (v) { var t = translate(v, null); if (t != null) el.setAttribute(ATTRS[i], t); }
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function fixHead() {
    if (document.documentElement.lang !== 'es') document.documentElement.lang = 'es';
    if (document.title === 'Smart Test Report') document.title = 'Reporte Inteligente de Pruebas';
  }

  var queue = [], timer = null, observer = null;
  var OPTS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS };
  function flush() {
    timer = null;
    if (observer) observer.disconnect();           // los cambios que hace esta función no se re-procesan
    try { for (var i = 0; i < queue.length; i++) walk(queue[i]); fixHead(); syncAbout(); } catch (e) { /* nunca romper el reporte */ }
    queue = [];
    if (observer) observer.observe(document.body, OPTS);
  }
  function schedule() { if (!timer) timer = setTimeout(flush, 30); }

  // ───────────────────────── Apartado «Sobre este reporte» ─────────────────────────
  // Resumen visible para stakeholders, arriba del Resumen (Insights). Es un nodo propio (plantilla about.html)
  // que se re-inserta si la interfaz lo desplaza y se oculta en las demás vistas.
  var AB_KEY = 'smartEs.acercaAbierto.v1';          // '0' = el usuario lo colapsó
  var aboutEl = null;
  function onInsights() {
    var h = location.hash || '';
    return h === '' || h === '#' || h === '#/insights' || h.indexOf('#/insights/') === 0 || h.indexOf('#/insights?') === 0;
  }
  function buildAbout() {
    var tpl = document.getElementById('smart-es-about-tpl');
    if (!tpl || !tpl.content.firstElementChild) return null;
    var el = tpl.content.firstElementChild.cloneNode(true);
    var open = true;
    try { open = localStorage.getItem(AB_KEY) !== '0'; } catch (e) { /* sin almacenamiento */ }
    el.open = open;
    el.addEventListener('toggle', function () { try { localStorage.setItem(AB_KEY, el.open ? '1' : '0'); } catch (e) { /* ignorar */ } });
    var btn = el.querySelector('[data-es-guide]');
    if (btn) btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();       // el botón vive dentro del <summary>: no debe plegar el apartado
      if (window.__smartEsOpenGuide) window.__smartEsOpenGuide();
    });
    // Pestañas (WAI-ARIA): clic o flechas ← → / Inicio / Fin
    var tabs = [].slice.call(el.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var p = el.querySelector('#' + t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length :
                e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
        if (n >= 0) { e.preventDefault(); e.stopPropagation(); select(tabs[n], true); }
      });
    });
    return el;
  }
  function syncAbout() {
    if (!aboutEl) { aboutEl = buildAbout(); if (!aboutEl) return; }
    var page = document.querySelector('main .page');
    if (!page || !onInsights()) { aboutEl.hidden = true; return; }
    var head = null;
    for (var i = 0; i < page.children.length; i++) { if (page.children[i].classList.contains('page__head')) { head = page.children[i]; break; } }
    var ref = head ? head.nextSibling : page.firstChild;
    if (aboutEl.parentNode !== page || aboutEl.previousElementSibling !== head) page.insertBefore(aboutEl, ref);
    aboutEl.hidden = false;
  }

  // ───────────────────────── Guía del reporte ─────────────────────────
  var LS_KEY = 'smartEs.guiaVista.v1';
  function lsGet() { try { return localStorage.getItem(LS_KEY); } catch (e) { return null; } }
  function lsSet() { try { localStorage.setItem(LS_KEY, '1'); } catch (e) { /* sin almacenamiento */ } }

  function buildGuide() {
    var tpl = document.getElementById('smart-es-guide');
    if (!tpl) return;
    var root = document.createElement('div');
    root.id = 'smart-es-root';

    var fab = document.createElement('button');
    fab.id = 'smart-es-fab'; fab.type = 'button';
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span>Guía del reporte</span>';

    var back = document.createElement('div');
    back.id = 'smart-es-backdrop';
    back.innerHTML =
      '<div id="smart-es-dialog" role="dialog" aria-modal="true" aria-labelledby="smart-es-title">' +
        '<div class="es-head"><div>' +
          '<h2 id="smart-es-title">Guía del Smart Reporter</h2>' +
          '<p>Qué es este reporte, para qué sirve y cómo leer cada componente, métrica y resultado. Puedes volver a abrirla con el botón «Guía del reporte».</p>' +
        '</div><button type="button" class="es-x" aria-label="Cerrar guía">×</button></div>' +
        '<div class="es-chips" role="navigation" aria-label="Secciones de la guía"></div>' +
        '<div class="es-scroll" tabindex="0"></div>' +
      '</div>';

    var scroll = back.querySelector('.es-scroll');
    scroll.appendChild(tpl.content.cloneNode(true));
    var chips = back.querySelector('.es-chips');
    scroll.querySelectorAll('details.es-sec').forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'es-chip';
      b.textContent = d.querySelector('h3').textContent.replace(/^\d+\.\s*/, '');
      b.addEventListener('click', function () { d.open = true; d.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      chips.appendChild(b);
    });

    var closeBtn = back.querySelector('.es-x');
    function open() { back.classList.add('es-open'); closeBtn.focus(); lsSet(); }
    function close() { back.classList.remove('es-open'); fab.focus(); }
    window.__smartEsOpenGuide = open;
    fab.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', function (e) {
      if (!back.classList.contains('es-open')) return;
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {                       // el foco se queda dentro del diálogo
        var f = back.querySelectorAll('button, summary, [tabindex="0"]');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      } else if (['j', 'k', 'f', 'n', 'g', 'c', 'e', '/', '?'].indexOf(e.key) >= 0 && !e.ctrlKey && !e.metaKey) {
        e.stopPropagation();                        // no disparar los atajos del reporte con la guía abierta
      }
    }, true);

    root.appendChild(fab);
    root.appendChild(back);
    document.body.appendChild(root);

    // Primera visita: muestra la introducción una vez (después queda disponible en el botón)
    if (!lsGet() && window.top === window) setTimeout(open, 600);
  }

  function start() {
    try {
      fixHead();
      walk(document.body);
      buildGuide();
      syncAbout();
      window.addEventListener('hashchange', schedule);
      observer = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) queue.push(m.addedNodes[j]); }
          else queue.push(m.target);
        }
        schedule();
      });
      observer.observe(document.body, OPTS);
    } catch (e) { /* la capa en español es opcional: si algo falla, el reporte sigue igual */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
