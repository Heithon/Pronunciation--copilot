/**
 * Check if test words are in dictionary or inflected
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load mass-ipa core data
const coreDataPath = join(__dirname, 'node_modules', 'mass-ipa', 'data', 'core.json');
const coreData = JSON.parse(readFileSync(coreDataPath, 'utf-8'));

console.log('Checking test words in dictionary...\n');

const testWords = [
  'questions',
  'algorithms', 
  'mechanics',
  'evolving',
  'maintaining'
];

testWords.forEach(word => {
  const directIPA = coreData[word];
  const status = directIPA ? '✓ IN DICT' : '✗ NOT IN DICT';
  console.log(`${status}  ${word.padEnd(20)} ${directIPA || '(needs inflection)'}`);
});
