import { spawn } from 'child_process';
import path from 'path';

/**
 * Delega en el CLI oficial de @playwright/mcp (bin: playwright-mcp, cli.js)
 * en vez de envolver createConnection() manualmente.
 *
 * Por qué: createConnection() devuelve un Server del SDK de Model Context
 * Protocol (@modelcontextprotocol/sdk) que hay que conectar a un Transport
 * (stdio o SSE) — ninguna versión publicada de ese SDK está hoy libre de
 * vulnerabilidades conocidas (ver auditoría de npm audit del proyecto: las
 * versiones >=1.25.0 dependen de @hono/node-server con un Path Traversal en
 * Windows; las versiones <1.25.4 tienen fuga de datos entre clientes + ReDoS
 * en el SDK mismo). El CLI de @playwright/mcp (que SÍ es una dependencia ya
 * instalada del proyecto) resuelve el transporte internamente sin exponer
 * esa dependencia aquí, y además soporta muchas más opciones que el wrapper
 * manual que reemplaza.
 *
 * Variables de entorno:
 *   HEADLESS=false        — abre el navegador con ventana visible (default: headless)
 *   MCP_HOST              — interfaz de red a bindear (solo aplica si MCP_PORT está definido)
 *   MCP_PORT              — si se define, usa transporte SSE/HTTP en ese puerto;
 *                           sin definir, usa transporte stdio (el modo estándar para
 *                           clientes que lanzan el proceso directamente, ej. Claude Desktop)
 *   MCP_ALLOWED_HOSTS     — lista separada por comas de hosts permitidos (pasada tal cual
 *                           a --allowed-hosts del CLI) — único control de acceso real disponible
 *
 * Nota: el CLI no implementa autenticación por token. Si se expone MCP_HOST más allá de
 * localhost, usa MCP_ALLOWED_HOSTS para restringir qué clientes pueden conectarse.
 */

const HEADLESS = process.env.HEADLESS !== 'false';
const MCP_HOST = process.env.MCP_HOST ?? '127.0.0.1';
const MCP_PORT = process.env.MCP_PORT;
const MCP_ALLOWED_HOSTS = process.env.MCP_ALLOWED_HOSTS;

// Risk 6: advertir si el servidor podría ser accesible fuera de localhost
if (MCP_HOST !== '127.0.0.1' && MCP_HOST !== 'localhost' && !MCP_ALLOWED_HOSTS) {
  console.error('⚠️ [MCP] MCP_HOST no es localhost y no se definió MCP_ALLOWED_HOSTS — el browser puede ser controlado remotamente por cualquier cliente.');
}
console.error('ℹ️  [MCP] El CLI de @playwright/mcp no implementa autenticación por token; usa MCP_ALLOWED_HOSTS para restringir clientes si expones la red.');

const args: string[] = ['--browser', 'chromium'];
if (HEADLESS) args.push('--headless');
if (MCP_PORT) {
  args.push('--port', MCP_PORT, '--host', MCP_HOST);
}
if (MCP_ALLOWED_HOSTS) {
  args.push('--allowed-hosts', MCP_ALLOWED_HOSTS);
}

// Todos los logs propios van a stderr — en modo stdio (sin MCP_PORT), stdout
// ES el canal JSON-RPC hacia el cliente MCP y no debe mezclarse con texto libre.
console.error(`✅ [MCP] Iniciando playwright-mcp — headless=${HEADLESS}${MCP_PORT ? ` host=${MCP_HOST} port=${MCP_PORT}` : ' (stdio)'}`);
console.error('   Para modo visual: HEADLESS=false npm run mcp:server');

// Risk: el "exports" de @playwright/mcp/package.json solo expone "." y
// "./package.json" — cli.js no es importable como subpath directo, pero SÍ
// existe físicamente junto a package.json. Resolvemos "./package.json"
// (permitido por exports) y ubicamos cli.js como archivo hermano.
let cliPath: string;
try {
  const pkgJsonPath = require.resolve('@playwright/mcp/package.json');
  cliPath = path.join(path.dirname(pkgJsonPath), 'cli.js');
} catch (err: any) {
  console.error(`❌ [MCP] No se encontró @playwright/mcp: ${err.message}`);
  console.error('   Verifica que la dependencia esté instalada: npm ci');
  process.exit(1);
}

const child = spawn(process.execPath, [cliPath, ...args], { stdio: 'inherit' });

function shutdown(signal: NodeJS.Signals): void {
  console.error(`\n🛑 [MCP] ${signal} recibido — cerrando playwright-mcp...`);
  child.kill(signal);
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

child.on('error', (err: any) => {
  console.error(`❌ [MCP] No se pudo iniciar playwright-mcp: ${err.message}`);
  console.error('   Si Chromium no está instalado ejecuta: npx playwright install chromium');
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(0);
  process.exit(code ?? 0);
});
