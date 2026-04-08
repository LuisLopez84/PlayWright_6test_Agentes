import fs from 'fs';
import path from 'path';
import { generateApiTests } from '../agents/network/api-test-generator.agent';

const networkDir = path.join('BoxRecordings', 'network');

async function run() {
  if (!fs.existsSync(networkDir)) {
    console.log('No network data found');
    return;
  }

  const files = fs.readdirSync(networkDir);

  for (const file of files) {
    const content = JSON.parse(
      fs.readFileSync(path.join(networkDir, file), 'utf-8')
    );

    const name = file.replace('.json', '');

    const apis = content.map((c: any) => ({
      url: c.url,
      method: c.method
    }));

    generateApiTests(name, apis);
  }
}

run();