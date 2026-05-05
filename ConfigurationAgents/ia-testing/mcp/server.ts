import { createPlaywrightServer } from "@playwright/mcp";

// Risk 4: headless configurable via variable de entorno (HEADLESS=false npm run mcp:server)
const HEADLESS = process.env.HEADLESS !== 'false';

// Risk 6: advertir si el servidor podría ser accesible fuera de localhost
const MCP_HOST = process.env.MCP_HOST ?? '127.0.0.1';
if (MCP_HOST !== '127.0.0.1' && MCP_HOST !== 'localhost') {
  console.warn('⚠️ [MCP] MCP_HOST no es localhost — el browser puede ser controlado remotamente sin autenticación');
}
if (!process.env.MCP_TOKEN) {
  console.warn('⚠️ [MCP] MCP_TOKEN no configurado — cualquier cliente local puede conectarse al servidor MCP');
}

// Risk 3: referencia al servidor para cierre controlado
let server: Awaited<ReturnType<typeof createPlaywrightServer>> | null = null;

// Risk 3: handlers para SIGINT / SIGTERM — evita procesos browser huérfanos
async function shutdown(signal: string): Promise<void> {
  console.log(`\n🛑 [MCP] ${signal} recibido — cerrando servidor Playwright MCP...`);
  try {
    if (server) await (server as any).close?.();
  } catch (err: any) {
    console.warn(`⚠️ [MCP] Error durante el cierre: ${err.message}`);
  }
  process.exit(0);
}

process.on('SIGINT',  () => { shutdown('SIGINT').catch(() => process.exit(1)); });
process.on('SIGTERM', () => { shutdown('SIGTERM').catch(() => process.exit(1)); });

// Risk 2: try/catch para errores de inicio (browser no instalado, puerto ocupado, etc.)
async function start(): Promise<void> {
  try {
    server = await createPlaywrightServer({
      browser: "chromium",
      headless: HEADLESS,  // Risk 4: valor leído de env
    });

    await server.start();

    console.log(`✅ [MCP] Playwright MCP Server activo — headless=${HEADLESS}`);
    console.log('   Para modo visual: HEADLESS=false npm run mcp:server');
  } catch (err: any) {
    console.error(`❌ [MCP] No se pudo iniciar el servidor Playwright MCP: ${err.message}`);
    console.error('   Si Chromium no está instalado ejecuta: npx playwright install chromium');
    process.exit(1);
  }
}

start();

/*
Esta clase permite que la IA controle Playwright remotamente via protocolo MCP.
Iniciar con: npm run mcp:server
Variables de entorno:
  HEADLESS=false    — abre el browser con ventana visible (útil para debugging)
  MCP_HOST          — interfaz de red a usar (default: 127.0.0.1)
  MCP_TOKEN         — token de acceso (documentar uso cuando la lib lo soporte)
*/
