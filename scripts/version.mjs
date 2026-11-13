import { readFile, writeFile } from 'node:fs/promises';

const packages = [
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/contracts/package.json',
];
const root = JSON.parse(await readFile(packages[0], 'utf8'));
const version = root.version;
if (!/^\d+\.\d+\.\d$/.test(version))
  throw new Error('Versão deve usar major.minor.patch, com patch de 0 a 9');
const values = [
  ...packages.map((path) => ({ path, pattern: /"version": "([^"]+)"/ })),
  { path: 'packages/contracts/src/index.ts', pattern: /export const appVersion = '([^']+)'/ },
  { path: 'docker/app/Dockerfile', pattern: /org.opencontainers.image.version="([^"]+)"/ },
  { path: 'compose.selfhost.yml', pattern: /JINSEI_VERSION:-([\d.]+)/ },
  { path: '.env.selfhost.example', pattern: /JINSEI_VERSION=([\d.]+)/ },
  { path: 'tests/fixtures/selfhost.env.example', pattern: /JINSEI_VERSION=([\d.]+)/ },
];
for (const item of values) {
  item.content = await readFile(item.path, 'utf8');
  if (item.content.match(item.pattern)?.[1] !== version)
    throw new Error(`Versão divergente: ${item.path}`);
}
if (!process.argv.includes('--next')) {
  console.log(`Versões consistentes: ${version}`);
} else {
  const [major, minor, patch] = version.split('.').map(Number);
  const next = patch < 9 ? `${major}.${minor}.${patch + 1}` : `${major}.${minor + 1}.0`;
  console.log(`${version} → ${next}`);
  if (process.argv.includes('--write')) {
    for (const item of values) {
      // Files above contain only release-version occurrences of this exact value.
      await writeFile(item.path, item.content.replaceAll(version, next));
    }
    console.log('Versão atualizada. Revise, valide e registre os arquivos antes de publicar.');
  }
}
