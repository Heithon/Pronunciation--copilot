/**
 * Convert common-phonetics.js to JSON
 * Simple script to create browser-usable IPA dictionary
 */

import { COMMON_PHONETICS } from '../src/data/common-phonetics.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('📋 Converting common-phonetics to JSON...');

const count = Object.keys(COMMON_PHONETICS).length;
console.log(`✅ ${count} words found`);

// Write to JSON
const outputPath = join(__dirname, '../src/data/ipa-dict.json');
writeFileSync(outputPath, JSON.stringify(COMMON_PHONETICS, null, 0));

console.log(`✅ Saved to ipa-dict.json`);
const sizeInKB = (Buffer.byteLength(JSON.stringify(COMMON_PHONETICS)) / 1024).toFixed(2);
console.log(`📦 File size: ${sizeInKB} KB`);
