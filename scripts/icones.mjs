// Génère toutes les icônes de l'app à partir des deux sources de docs/brand/ (charte v2 « Linear ») :
//   icone-suivi.svg             carré arrondi, coins transparents → icônes PWA, app Mac
//   icone-suivi-plein-cadre.svg plein cadre, opaque → écran d'accueil (iPhone, iPad, Mac) et icône « maskable » :
//                               le système arrondit lui-même.
// Usage : npm install --no-save sharp && node scripts/icones.mjs
// Puis, pour l'app Mac : python3 -c "from PIL import Image; Image.open('mac/icon-1024.png').save('mac/AppIcon.icns', sizes=[(16,16),(32,32),(64,64),(128,128),(256,256),(512,512),(1024,1024)])" && rm mac/icon-1024.png
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const arrondie = await readFile(new URL("../docs/brand/icone-suivi.svg", import.meta.url));
const pleinCadre = await readFile(new URL("../docs/brand/icone-suivi-plein-cadre.svg", import.meta.url));
const out = (p) => new URL(`../${p}`, import.meta.url).pathname;

const sorties = [
  [arrondie, "public/icons/icon-192.png", 192],
  [arrondie, "public/icons/icon-512.png", 512],
  [pleinCadre, "public/icons/icon-maskable-512.png", 512],
  [pleinCadre, "public/icons/apple-icon-main.png", 180],
  [pleinCadre, "public/icons/apple-icon-iphone.png", 180],
  [pleinCadre, "public/icons/iphone-192.png", 192],
  [pleinCadre, "public/icons/iphone-512.png", 512],
];

for (const [svg, chemin, taille] of sorties) {
  await sharp(svg, { density: 300 }).resize(taille, taille).png().toFile(out(chemin));
  console.log(`${chemin} (${taille}×${taille})`);
}

// App Mac : grille de macOS (carré de 824 px centré dans 1024, marge transparente)
await sharp(arrondie, { density: 300 })
  .resize(824, 824)
  .extend({ top: 100, bottom: 100, left: 100, right: 100, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(out("mac/icon-1024.png"));
console.log("mac/icon-1024.png (1024×1024, pour AppIcon.icns)");
