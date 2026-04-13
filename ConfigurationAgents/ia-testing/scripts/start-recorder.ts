import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const name = process.argv[2];
if (!name) {
  console.log("Debes indicar el nombre del flujo.");
  console.log("Ejemplo: npm run record Login");
  process.exit(1);
}

const recordingsDir = path.join(process.cwd(), "BoxRecordings", "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const outputFile = path.join(recordingsDir, `${name}.ts`);

console.log("Iniciando grabadora de Playwright...");
console.log("Archivo de salida:", outputFile);

const child = spawn(
  "npx",
  ["playwright", "codegen", "--output", outputFile],
  { stdio: "inherit", shell: true }
);

child.on("close", (code) => {
  if (fs.existsSync(outputFile)) {
    console.log(`\nGrabación guardada: ${outputFile}`);
    console.log(`Ahora puedes ejecutar: npm run generate`);
  } else {
    console.log("\nNo se guardó ninguna grabación.");
  }
  process.exit(code ?? 0);
});