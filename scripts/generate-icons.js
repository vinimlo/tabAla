import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 48, 128];
const inputSvg = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  const svgBuffer = fs.readFileSync(inputSvg);

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon${size}.png`));

    console.log(`✓ Gerado icon${size}.png`);
  }

  console.log('\nTodos os ícones foram gerados!');
}

generateIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
