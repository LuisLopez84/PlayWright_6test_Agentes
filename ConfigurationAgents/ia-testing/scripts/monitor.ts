import http from 'http';
import fs from 'fs';
import path from 'path';

// Reemplaza a express (dependencia no instalada) — solo 2 rutas GET,
// el módulo http nativo de Node es suficiente y no agrega dependencias.
const PORT = 3001;

function sendJson(res: http.ServerResponse, body: unknown): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = req.url ?? '';

  if (url === '/health') {
    sendJson(res, { status: 'ok', timestamp: new Date() });
    return;
  }

  if (url === '/metrics') {
    const testResultsPath = path.join(process.cwd(), 'test-results');
    const stats = { passed: 0, failed: 0, total: 0 };
    if (fs.existsSync(testResultsPath)) {
      // Analizar resultados (simplificado)
      const files = fs.readdirSync(testResultsPath);
      stats.total = files.length;
    }
    sendJson(res, stats);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`Monitor dashboard en http://localhost:${PORT}`);
});
