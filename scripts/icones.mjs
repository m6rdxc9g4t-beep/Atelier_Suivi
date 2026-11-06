// Génère les icônes iPhone (écran d'accueil) à partir de docs/brand/icone-iphone.svg.
// Usage : npm install --no-save sharp && node scripts/icones-iphone.mjs
// iOS arrondit lui-même les coins : l'image reste carrée, le cadre néon est dessiné dedans (comme Atelier Cuisine).
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile(new URL("../docs/brand/icone-iphone.svg", import.meta.url));

const sorties = [
  ["apple-icon-iphone.png", 180],
  ["iphone-192.png", 192],
  ["iphone-512.png", 512],
];

for (const [nom, taille] of sorties) {
  await sharp(svg, { density: 300 })
    .resize(taille, taille)
    .flatten({ background: "#060e10" })
    .png()
    .toFile(new URL(`../public/icons/${nom}`, import.meta.url).pathname);
  console.log(`public/icons/${nom} (${taille}×${taille})`);
}
