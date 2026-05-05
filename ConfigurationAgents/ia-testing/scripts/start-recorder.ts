import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

// Uso: npm run record <NombreSuite> [url] [chromium|firefox|webkit]
const rawName = process.argv[2];
if (!rawName) {
  console.log("Debes indicar el nombre del flujo.");
  console.log("Uso:    npm run record <NombreSuite> [url] [navegador]");
  console.log("Ejemplo: npm run record Login https://staging.tuapp.com chromium");
  process.exit(1);
}

// Risk 2: sanitizar nombre — elimina caracteres ilegales en Windows (* ? " < > | : / \\)
const sanitizedName = rawName.replace(/[*?"<>|:/\\]+/g, "_");
if (sanitizedName !== rawName) {
  console.warn(`⚠️  Nombre sanitizado: "${rawName}" → "${sanitizedName}"`);
}

// Risk 1: URL de inicio — argumento posicional o fallback a BASE_URL env var
const startUrl = process.argv[3] || process.env.BASE_URL || "";

// Risk 3: selección de navegador — argumento posicional o BROWSER env var; default Chromium
const VALID_BROWSERS = ["chromium", "firefox", "webkit"];
const rawBrowser = (process.argv[4] || process.env.BROWSER || "chromium").toLowerCase();
const browser = VALID_BROWSERS.includes(rawBrowser) ? rawBrowser : "chromium";
if (rawBrowser && !VALID_BROWSERS.includes(rawBrowser)) {
  console.warn(`⚠️  Navegador no reconocido: "${rawBrowser}". Usando chromium. Opciones: ${VALID_BROWSERS.join(", ")}`);
}

const recordingsDir = path.join(process.cwd(), "BoxRecordings", "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const outputFile = path.join(recordingsDir, `${sanitizedName}.ts`);

// Risk 5: advertir antes de lanzar si ya existe una grabación con ese nombre
if (fs.existsSync(outputFile)) {
  console.warn(`⚠️  Ya existe una grabación con este nombre: ${outputFile}`);
  console.warn("   Se sobreescribirá al cerrar el navegador. Usa un nombre diferente para preservarla.");
}

console.log("🎬 Iniciando grabadora de Playwright...");
console.log(`   Suite     : ${sanitizedName}`);
console.log(`   Navegador : ${browser}`);
console.log(`   URL inicio: ${startUrl || "(ninguna — navega manualmente)"}`);
console.log(`   Salida    : ${outputFile}`);

// Risk 7 (arquitectónico): playwright codegen captura solo interacciones UI.
// Para capturar también el tráfico de red usa network-sniffer.ts por separado.

// Construir argumentos de codegen
const codegenArgs = [
  "playwright", "codegen",
  "--browser", browser,     // Risk 3: navegador seleccionado
  "--output", outputFile,
];
if (startUrl) codegenArgs.push(startUrl); // Risk 1: URL inicial si se proporcionó

// Risk 4 (by design): spawnSync bloquea hasta que el usuario cierra el navegador — comportamiento correcto
// Risk 6 (by design): shell: true necesario para que npx funcione en PowerShell/CMD en Windows
const result = spawnSync("npx", codegenArgs, { stdio: "inherit", shell: true });

if (fs.existsSync(outputFile)) {
  console.log(`\n✅ Grabación guardada: ${outputFile}`);
  console.log("   Siguiente paso: npm run generate");
} else {
  console.log("\n⚠️  No se guardó ninguna grabación (el usuario cerró sin interactuar o canceló).");
}

process.exit(result.status ?? 0);
