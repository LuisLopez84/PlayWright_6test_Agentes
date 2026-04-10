import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/metrics', (req, res) => {
  const testResultsPath = path.join(process.cwd(), 'test-results');
  const stats = { passed: 0, failed: 0, total: 0 };
  if (fs.existsSync(testResultsPath)) {
    // Analizar resultados (simplificado)
    const files = fs.readdirSync(testResultsPath);
    stats.total = files.length;
  }
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Monitor dashboard en http://localhost:${PORT}`);
});