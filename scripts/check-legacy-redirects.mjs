import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const vercelConfig = JSON.parse(await readFile('vercel.json', 'utf8'));
const vercelConfigText = JSON.stringify(vercelConfig);
if (vercelConfigText.includes('/api/legacy-redirect')) {
  throw new Error('vercel.json still references the missing legacy redirect API route.');
}

const redirectMap = JSON.parse(await readFile('redirects.generated.json', 'utf8'));
const samples = [
  '/raw/raw1',
  '/products/prod1',
  '/buildings/build10',
  '/technology/tech99',
  '/cooking/cook1',
];

for (const source of samples) {
  const redirect = redirectMap.find((entry) => entry.source === source);
  if (!redirect) {
    throw new Error(`Missing legacy redirect mapping for ${source}.`);
  }

  const outputPath = join('dist', ...source.slice(1).split('/'), 'index.html');
  if (!existsSync(outputPath)) {
    throw new Error(`Missing built redirect page at ${outputPath}. Run pnpm run build first.`);
  }

  const html = await readFile(outputPath, 'utf8');
  if (!html.includes(redirect.destination)) {
    throw new Error(`${outputPath} does not point to ${redirect.destination}.`);
  }
}

console.log(`Verified ${samples.length} legacy redirect pages.`);
