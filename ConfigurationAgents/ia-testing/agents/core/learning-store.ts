import fs from 'fs';
import path from 'path';

interface ActionSignature {
  url: string;
  action: string;    // 'click' | 'fill' | 'select'
  targetText: string;
}

interface LearnedSelector {
  selector: string;
  successCount: number;
  lastUsed: string;  // ISO timestamp
}

const DB_PATH   = path.join(process.cwd(), 'learning-db.json');
const LOCK_PATH = DB_PATH + '.lock';
const TMP_PATH  = DB_PATH + '.tmp';

// TTL: entradas no usadas en 30 días se descartan
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Estado del timer de guardado diferido (módulo-level para que un solo timer corra por proceso)
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _dirty = false;

class LearningStore {
  private db: Map<string, LearnedSelector[]> = new Map();

  constructor() {
    this.load();
  }

  // ── URL normalization (Risk 2) ─────────────────────────────────────────────
  // Normaliza segmentos dinámicos para que /product/123 y /product/456
  // compartan la misma clave de aprendizaje.
  private normalizeUrl(url: string): string {
    const normalize = (s: string) =>
      s
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/{uuid}')
        .replace(/\/\d+/g, '/{id}');
    try {
      const u = new URL(url);
      return u.origin + normalize(u.pathname);
    } catch {
      return normalize(url);
    }
  }

  private getKey(sig: ActionSignature): string {
    return `${this.normalizeUrl(sig.url)}|${sig.action}|${sig.targetText}`;
  }

  // ── Disk I/O ───────────────────────────────────────────────────────────────

  private load(): void {
    if (!fs.existsSync(DB_PATH)) return;
    try {
      const data   = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      const cutoff = Date.now() - TTL_MS;
      for (const [key, selectors] of Object.entries(data)) {
        // Risk 3/4: filtrar entradas expiradas usando lastUsed
        const fresh = (selectors as LearnedSelector[]).filter(
          s => new Date(s.lastUsed).getTime() > cutoff,
        );
        if (fresh.length > 0) this.db.set(key, fresh);
      }
    } catch {
      // JSON corrupto → empezar limpio
    }
  }

  // Risk 7: releer disco para ver cambios de otros workers
  private reload(): void {
    this.db.clear();
    this.load();
  }

  // Risk 1/6: escritura atómica con lockfile y merge de datos de otros workers
  private flushToDisk(): void {
    // Limpiar lock obsoleto (proceso que murió sin liberar el lock)
    if (fs.existsSync(LOCK_PATH)) {
      try {
        const age = Date.now() - fs.statSync(LOCK_PATH).mtimeMs;
        if (age > 10_000) fs.unlinkSync(LOCK_PATH);
      } catch { /* ignore */ }
    }

    // Intentar adquirir lock (flag 'wx' falla si ya existe — atómico a nivel SO)
    try {
      fs.writeFileSync(LOCK_PATH, String(process.pid), { flag: 'wx' });
    } catch {
      // Otro worker tiene el lock — saltar este flush
      return;
    }

    try {
      // Merge: leer estado actual en disco + superponer nuestra memoria
      const merged: Record<string, LearnedSelector[]> = {};
      if (fs.existsSync(DB_PATH)) {
        try {
          Object.assign(merged, JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')));
        } catch { /* JSON corrupto — ignorar */ }
      }
      for (const [key, value] of this.db.entries()) {
        merged[key] = value;  // nuestra versión tiene precedencia
      }

      // Escritura atómica: escribir en .tmp y renombrar (rename es atómico en POSIX/NTFS)
      fs.writeFileSync(TMP_PATH, JSON.stringify(merged, null, 2), 'utf-8');
      fs.renameSync(TMP_PATH, DB_PATH);
    } finally {
      try { fs.unlinkSync(LOCK_PATH); } catch { /* ya eliminado */ }
    }

    _dirty = false;
  }

  // Risk 1: guardar con debounce para agrupar escrituras rápidas consecutivas
  private scheduleSave(): void {
    _dirty = true;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      _saveTimer = null;
      this.flushToDisk();
    }, 500);
  }

  // ── API pública ────────────────────────────────────────────────────────────

  recordSuccess(sig: ActionSignature, usedSelector: string): void {
    const key      = this.getKey(sig);
    const existing = this.db.get(key) ?? [];
    const found    = existing.find(e => e.selector === usedSelector);
    if (found) {
      found.successCount++;
      found.lastUsed = new Date().toISOString();
    } else {
      existing.push({ selector: usedSelector, successCount: 1, lastUsed: new Date().toISOString() });
    }
    existing.sort((a, b) => b.successCount - a.successCount);
    this.db.set(key, existing.slice(0, 5));
    this.scheduleSave();
  }

  // Risk 5/7: recarga disco para ver healings de otros workers; filtra TTL al retornar
  getBestSelector(sig: ActionSignature): string | null {
    this.reload();
    const key      = this.getKey(sig);
    const selectors = this.db.get(key);
    if (!selectors || selectors.length === 0) return null;
    const cutoff = Date.now() - TTL_MS;
    const fresh  = selectors.filter(s => new Date(s.lastUsed).getTime() > cutoff);
    return fresh.length > 0 ? fresh[0].selector : null;
  }

  recordFailure(sig: ActionSignature, failedSelector: string): void {
    const key      = this.getKey(sig);
    const selectors = this.db.get(key);
    if (!selectors) return;
    const idx = selectors.findIndex(e => e.selector === failedSelector);
    if (idx !== -1) {
      selectors.splice(idx, 1);
      this.db.set(key, selectors);
      this.scheduleSave();
    }
  }

  // Forzar escritura inmediata de cambios pendientes (llamar en salida del proceso)
  flush(): void {
    if (!_dirty) return;
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    this.flushToDisk();
  }
}

export const learningStore = new LearningStore();

// Garantizar que las escrituras pendientes se persistan al terminar el proceso
process.on('exit',   () => learningStore.flush());
process.on('SIGTERM', () => { learningStore.flush(); process.exit(0); });
