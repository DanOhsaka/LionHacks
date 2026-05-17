/**
 * Build crisp tab/omnibar icons from the PridePath lion source.
 * Run: node scripts/generate-favicons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "public", "pridepath-lion.png");
const appDir = path.join(root, "src", "app");
const publicDir = path.join(root, "public");

const sizes = [16, 32, 48, 180, 512];

if (!fs.existsSync(source)) {
  console.error("Missing source:", source);
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });

const pngBuffers = [];
for (const size of [16, 32, 48]) {
  const buf = await sharp(source)
    .resize(size, size, { fit: "cover" })
    .png()
    .toBuffer();
  pngBuffers.push(buf);
  const name = `favicon-${size}.png`;
  fs.writeFileSync(path.join(publicDir, name), buf);
  console.log("wrote", name);
}

const ico = await pngToIco(pngBuffers);
/* Only app/favicon.ico — public/favicon.ico conflicts with Next (conflicting-public-file-page). */
fs.writeFileSync(path.join(appDir, "favicon.ico"), ico);
console.log("wrote src/app/favicon.ico (multi-size)");

for (const size of [180, 512]) {
  const out =
    size === 180
      ? path.join(publicDir, "apple-touch-icon.png")
      : path.join(publicDir, "icon.png");
  await sharp(source).resize(size, size, { fit: "cover" }).png().toFile(out);
  console.log("wrote", path.basename(out), size);
}

await sharp(source).resize(32, 32, { fit: "cover" }).png().toFile(path.join(appDir, "icon.png"));
console.log("wrote src/app/icon.png (32px for Next metadata)");
