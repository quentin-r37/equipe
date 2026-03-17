import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../src/lib/assets/favicon.svg');
const outDir = resolve(__dirname, '../static/icons');

mkdirSync(outDir, { recursive: true });

const svgBuffer = readFileSync(svgPath);

const sizes = [192, 512];

for (const size of sizes) {
	// Regular icon (transparent background)
	await sharp(svgBuffer)
		.resize(size, size)
		.png()
		.toFile(resolve(outDir, `icon-${size}x${size}.png`));

	console.log(`Generated icon-${size}x${size}.png`);

	// Maskable icon (solid background with padding for safe zone)
	const iconSize = Math.round(size * 0.6); // icon occupies 60% of canvas (within 80% safe zone)
	const iconBuffer = await sharp(svgBuffer).resize(iconSize, iconSize).png().toBuffer();

	await sharp({
		create: {
			width: size,
			height: size,
			channels: 4,
			background: { r: 3, g: 83, b: 233, alpha: 1 } // #0353e9
		}
	})
		.composite([{ input: iconBuffer, gravity: 'centre' }])
		.png()
		.toFile(resolve(outDir, `icon-maskable-${size}x${size}.png`));

	console.log(`Generated icon-maskable-${size}x${size}.png`);
}

console.log('All icons generated.');
