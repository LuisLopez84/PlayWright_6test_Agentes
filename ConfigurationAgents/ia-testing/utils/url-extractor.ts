import fs from 'fs';

export function extractBaseURL(testPath: string): string | null {
  try {
    const content = fs.readFileSync(testPath, 'utf-8');

    const match = content.match(/page\.goto\(['"`](.*?)['"`]\)/);

    if (!match) return null;

    const fullUrl = match[1];

    const url = new URL(fullUrl);

    return url.origin; // 🔥 SOLO dominio base
  } catch (error) {
    console.log("❌ Error extracting URL:", error);
    return null;
  }
}