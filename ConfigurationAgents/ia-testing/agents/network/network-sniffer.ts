import fs from 'fs';
import path from 'path';

let calls: any[] = [];

export function startNetworkSniffer(page: any) {
  calls = [];
  console.log('[Sniffer] Iniciando captura de red');
  page.on('request', (request: any) => {
    const url = request.url();
    const method = request.method();
    console.log(`[Sniffer] Solicitud capturada: ${method} ${url}`);
    calls.push({ url, method });
  });
}

export function stopNetworkSniffer(name: string) {
  console.log(`[Sniffer] Deteniendo captura. Total solicitudes: ${calls.length}`);
  try {
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '-');
    const dir = path.join('BoxRecordings', 'network');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Sniffer] Creado directorio: ${dir}`);
    }
    const filePath = path.join(dir, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(calls, null, 2));
    console.log(`📡 API calls saved: ${filePath} (${calls.length} requests)`);
  } catch (error) {
    console.error(`[Sniffer] Error al guardar el archivo: ${error.message}`);
  }
}