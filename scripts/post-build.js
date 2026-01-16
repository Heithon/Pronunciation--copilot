/**
 * Post-build script to copy CSS files and mass-ipa data to dist
 * Vite/crxjs doesn't automatically copy CSS files referenced in manifest
 */

import { cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('📋 Post-build tasks...');

// 1. Copy CSS files
console.log('\n📋 Copying CSS files to dist...');
const stylesDir = join(__dirname, '../dist/src/content/styles');
mkdirSync(stylesDir, { recursive: true });

const cssFiles = ['phonetics.css', 'popup.css', 'selection.css'];
cssFiles.forEach(file => {
  const src = join(__dirname, `../src/content/styles/${file}`);
  const dest = join(stylesDir, file);
  cpSync(src, dest);
  console.log(`  ✅ Copied ${file}`);
});

// 2. Copy mass-ipa data files
console.log('\n📚 Copying mass-ipa data files...');
const massIpaDataDir = join(__dirname, '../dist/mass-ipa-data');
mkdirSync(massIpaDataDir, { recursive: true });

// Copy core.json
const coreJsonSrc = join(__dirname, '../node_modules/mass-ipa/data/core.json');
if (existsSync(coreJsonSrc)) {
  cpSync(coreJsonSrc, join(massIpaDataDir, 'core.json'));
  console.log('  ✅ Copied core.json');
} else {
  console.warn('  ⚠️  core.json not found');
}

// Copy chunk-index.json
const chunkIndexSrc = join(__dirname, '../node_modules/mass-ipa/data/chunk-index.json');
if (existsSync(chunkIndexSrc)) {
  cpSync(chunkIndexSrc, join(massIpaDataDir, 'chunk-index.json'));
  console.log('  ✅ Copied chunk-index.json');
} else {
  console.warn('  ⚠️  chunk-index.json not found');
}

// Copy chunks directory
const chunksSrc = join(__dirname, '../node_modules/mass-ipa/data/chunks');
const chunksDest = join(massIpaDataDir, 'chunks');
if (existsSync(chunksSrc)) {
  mkdirSync(chunksDest, { recursive: true });
  cpSync(chunksSrc, chunksDest, { recursive: true });
  console.log('  ✅ Copied chunks directory');
} else {
  console.warn('  ⚠️  chunks directory not found');
}

console.log('\n✅ All post-build tasks completed!');
