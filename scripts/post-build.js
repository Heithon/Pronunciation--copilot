/**
 * Post-build script to copy CSS files to dist
 * Vite/crxjs doesn't automatically copy CSS files referenced in manifest
 */

import { cpSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('📋 Copying CSS files to dist...');

// Create styles directory
const stylesDir = join(__dirname, '../dist/src/content/styles');
mkdirSync(stylesDir, { recursive: true });

// Copy CSS files
const cssFiles = ['phonetics.css', 'popup.css', 'selection.css'];
cssFiles.forEach(file => {
  const src = join(__dirname, `../src/content/styles/${file}`);
  const dest = join(stylesDir, file);
  cpSync(src, dest);
  console.log(`  ✅ Copied ${file}`);
});

console.log('✅ CSS files copied successfully!');
