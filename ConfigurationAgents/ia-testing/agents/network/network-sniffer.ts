import fs from 'fs';
import path from 'path';

// Referencias al listener activo para poder removerlo en stopNetworkSniffer
let _calls: any[] = [];
let _activeHandler: ((request: any) => void) | null = null;
let _activePage: any = null;

export function startNetworkSniffer(page: any): void {
  _calls = [];
  _activePage = page;

  _activeHandler = (request: any) => {
    const url = request.url();
    const method = request.method();
    console.log(`[Sniffer] Solicitud capturada: ${method} ${url}`);
    _calls.push({ url, method });
  };

  page.on('request', _activeHandler);
  console.log('[Sniffer] Iniciando captura de red');
}

export function stopNetworkSniffer(name: string): void {
  // Remover el listener para evitar memory leaks
  if (_activePage && _activeHandler) {
    _activePage.off('request', _activeHandler);
    _activeHandler = null;
    _activePage = null;
  }

  console.log(`[Sniffer] Deteniendo captura. Total solicitudes: ${_calls.length}`);
  try {
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '-');
    const dir = path.join('BoxRecordings', 'network');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(_calls, null, 2));
    console.log(`📡 API calls saved: ${filePath} (${_calls.length} requests)`);
  } catch (error: any) {
    console.error(`[Sniffer] Error al guardar el archivo: ${error.message}`);
  } finally {
    _calls = [];
  }
}
