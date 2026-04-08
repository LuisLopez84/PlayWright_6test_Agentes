import fs from 'fs';
import path from 'path';

export function resolveBaseUrl(): string {

  // 1. ENV tiene prioridad
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  // 2. Buscar metadata dinámicamente
  try {

    const metadataFile = fs.readdirSync('GenerateTest')
      .find(file => file.endsWith('.metadata.json'));

    if (metadataFile) {
      const metadataPath = path.join('GenerateTest', metadataFile);
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      if (metadata.baseURL) {
        return metadata.baseURL;
      }
    }

  } catch (e) {}

  // 3. fallback
  return 'http://localhost:3000';
}