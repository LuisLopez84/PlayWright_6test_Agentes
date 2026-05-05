import fs from "fs";

/**
 * Ensures `dir` exists as a directory. Creates it (and any ancestors) if needed.
 *
 * Risk 2: wraps mkdirSync in try/catch and re-throws with a contextual message.
 * Risk 3: after creation, verifies the path is a directory — not a file.
 */
export function ensureDir(dir: string): void {
  try {
    fs.mkdirSync(dir, { recursive: true }); // Risk 1+4: idempotente, sin existsSync previo
  } catch (err: any) {
    throw new Error(`[ensureDir] No se pudo crear el directorio "${dir}": ${err.message}`);
  }

  // Risk 3: si la ruta ya existía como archivo, mkdirSync lanza en algunos SO
  // pero no en todos — verificamos explícitamente.
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    throw new Error(`[ensureDir] La ruta "${dir}" existe pero es un archivo, no un directorio.`);
  }
}
