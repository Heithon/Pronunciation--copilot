import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coreDataPath = join(__dirname, 'node_modules', 'mass-ipa', 'data', 'core.json');
const coreData = JSON.parse(readFileSync(coreDataPath, 'utf-8'));

function checkWord(word) {
  return coreData[word.toLowerCase().trim()] || null;
}

console.log('Checking problematic words:\n');

const tests = [
  { word: 'biodiversity', parts: ['bio', 'diversity', 'diverse'] },
  { word: 'chatbots', parts: ['chatbot', 'chat', 'bot', 'robot'] },
  { word: 'cryptocurrency', parts: ['crypto', 'currency', 'cryptic'] },
];

tests.forEach(({ word, parts }) => {
  console.log(`${word}:`);
  console.log(`  Direct lookup: ${checkWord(word) || 'NOT FOUND'}`);
  console.log(`  Possible parts:`);
  parts.forEach(part => {
    const ipa = checkWord(part);
    console.log(`    - ${part.padEnd(15)} ${ipa || 'NOT FOUND'}`);
  });
  console.log('');
});

console.log('\nAnalysis:');
console.log('These are compound words or modern terms likely not in the dictionary.');
console.log('Options:');
console.log('1. Add them to COMMON_PHONETICS as manual overrides');
console.log('2. Wait for them to be added to future dictionary updates');
console.log('3. Use a compound word splitting algorithm (complex)');
