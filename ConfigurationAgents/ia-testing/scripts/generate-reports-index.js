const fs = require('fs');
const path = require('path');

const reportsDir = path.join(process.cwd(), 'reports');
const indexFile = path.join(reportsDir, 'index.html');

if (!fs.existsSync(reportsDir)) {
  console.log('❌ No existe la carpeta reports');
  process.exit(1);
}

const suites = fs.readdirSync(reportsDir).filter(item => {
  const fullPath = path.join(reportsDir, item);
  return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'index.html'));
});

if (suites.length === 0) {
  console.log('⚠️ No se encontraron reportes');
  process.exit(0);
}

const links = suites.map(suite => {
  return `<li><a href="${suite}/index.html" target="_blank">${suite}</a></li>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Índice de Reportes de Pruebas</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    h1 { color: #333; }
    ul { list-style: none; padding: 0; }
    li { margin: 10px 0; }
    a { text-decoration: none; background: #007bff; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; transition: 0.3s; }
    a:hover { background: #0056b3; }
  </style>
</head>
<body>
  <h1>📊 Reportes de Pruebas</h1>
  <ul>${links}</ul>
</body>
</html>`;

try {
  fs.writeFileSync(indexFile, html);
  console.log(`✅ Índice generado: ${indexFile}`);
  console.log(`   Ábrelo con: npx playwright show-report reports/ (o navega a la carpeta reports)`);
} catch (err) {
  console.error(`❌ Error escribiendo índice en ${indexFile}:`, err.message);
  process.exit(1);
}