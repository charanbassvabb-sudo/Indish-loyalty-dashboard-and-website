// Generates the full favicon/PWA icon set from public/favicon.svg via code
// (sharp for SVG rasterization + compositing, png-to-ico for the classic
// .ico fallback). Run manually whenever the mark changes:
//   node scripts/gen-icons.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SVG_PATH = path.join(ROOT, "public", "favicon.svg");
const PUBLIC_DIR = path.join(ROOT, "public");

// Brand background (matches --background in src/index.css) used behind the
// mark for platforms that composite icons on solid tiles (iOS, Android).
const BRAND_BG = { r: 22, g: 17, b: 28, alpha: 1 };

async function main() {
  const svg = await readFile(SVG_PATH);

  // Transparent, browser-tab-sized PNGs — chrome UI shows through, so no
  // background needed here.
  for (const size of [16, 32, 48]) {
    await sharp(svg, { density: 384 })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(PUBLIC_DIR, `favicon-${size}x${size}.png`));
    console.log(`wrote favicon-${size}x${size}.png`);
  }

  // Classic .ico fallback bundling the three small sizes.
  const icoBuffers = await Promise.all(
    [16, 32, 48].map((size) => readFile(path.join(PUBLIC_DIR, `favicon-${size}x${size}.png`))),
  );
  const ico = await pngToIco(icoBuffers);
  await writeFile(path.join(PUBLIC_DIR, "favicon.ico"), ico);
  console.log("wrote favicon.ico");

  // Platform tiles: mark on a solid brand-dark rounded square, with generous
  // padding so it survives Android's maskable-icon safe-zone cropping.
  async function brandTile(size, { radius = 0 } = {}) {
    const markSize = Math.round(size * 0.6);
    const mark = await sharp(svg, { density: 384 })
      .resize(markSize, markSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const base = sharp({
      create: { width: size, height: size, channels: 4, background: BRAND_BG },
    });

    let composed = base.composite([{ input: mark, gravity: "center" }]).png();

    if (radius > 0) {
      const maskSvg = Buffer.from(
        `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
      );
      const rounded = await composed.toBuffer();
      composed = sharp(rounded).composite([{ input: maskSvg, blend: "dest-in" }]).png();
    }

    return composed.toBuffer();
  }

  const appleTouch = await brandTile(180, { radius: 36 });
  await writeFile(path.join(PUBLIC_DIR, "apple-touch-icon.png"), appleTouch);
  console.log("wrote apple-touch-icon.png");

  for (const size of [192, 512]) {
    const tile = await brandTile(size);
    await writeFile(path.join(PUBLIC_DIR, `android-chrome-${size}x${size}.png`), tile);
    console.log(`wrote android-chrome-${size}x${size}.png`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
