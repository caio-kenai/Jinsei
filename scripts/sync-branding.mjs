import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const destination = new URL('../apps/web/public/branding/', import.meta.url);
mkdirSync(destination, { recursive: true });
for (const name of ['jinsei-logo.png', 'jinsei-icon.png', 'buy-me-a-monster.png']) {
  copyFileSync(
    new URL(`../assets/branding/${name}`, import.meta.url),
    fileURLToPath(new URL(name, destination)),
  );
}
const appIcon = fileURLToPath(new URL('../assets/branding/jinsei-icon.png', import.meta.url));
for (const size of [32, 64, 180])
  await sharp(appIcon)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(fileURLToPath(new URL(`favicon-${size}.png`, destination)));
const showcase = new URL('../apps/web/public/showcase/', import.meta.url);
mkdirSync(showcase, { recursive: true });
for (const [source, name, width] of [
  ['library-list-light.png', 'library-desktop.webp', 1280],
  ['library-mobile.png', 'library-mobile.webp', 390],
]) {
  const file = fileURLToPath(new URL(`../assets/screenshots/${source}`, import.meta.url));
  if (existsSync(file))
    await sharp(file)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(fileURLToPath(new URL(name, showcase)));
}
