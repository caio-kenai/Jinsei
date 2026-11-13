import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const destination = new URL('../apps/web/public/branding/', import.meta.url);
mkdirSync(destination, { recursive: true });
for (const name of ['jinsei-logo.png', 'buy-me-a-monster.png']) {
  copyFileSync(
    new URL(`../assets/branding/${name}`, import.meta.url),
    fileURLToPath(new URL(name, destination)),
  );
}
