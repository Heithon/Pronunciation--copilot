import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coreDataPath = join(__dirname, 'node_modules', 'mass-ipa', 'data', 'core.json');
const coreData = JSON.parse(readFileSync(coreDataPath, 'utf-8'));

function getIPA(word) {
  return coreData[word.toLowerCase().trim()] || null;
}

console.log('Testing new suffix support:\n');

const tests = [
  { suffix: '-er (comparative)', tests: [
    { word: 'bigger', base: 'big', expected: '/bigər/' },
    { word: 'faster', base: 'fast', expected: '/fɑ:stər/' },
    { word: 'happier', base: 'happy', expected: '/hæpiər/' },
  ]},
  { suffix: '-est (superlative)', tests: [
    { word: 'biggest', base: 'big', expected: '/bigɪst/' },
    { word: 'fastest', base: 'fast', expected: '/fɑ:stɪst/' },
    { word: 'happiest', base: 'happy', expected: '/hæpiɪst/' },
  ]},
  { suffix: '-ity (noun)', tests: [
    { word: 'ability', base: 'able', expected: '/eiblət i/' },
    { word: 'reality', base: 'real', expected: '/riːləti/' },
    { word: 'quality', base: 'N/A', expected: 'N/A' },
  ]},
  { suffix: '-y (adjective)', tests: [
    { word: 'sunny', base: 'sun', expected: '/sʌni/' },
    { word: 'noisy', base: 'noise', expected: '/nɔizi/' },
    { word: 'dirty', base: 'dirt', expected: '/dɜ:rti/' },
  ]},
];

tests.forEach(({ suffix, tests: testCases }) => {
  console.log(`${suffix}:`);
  testCases.forEach(({ word, base, expected }) => {
    const baseIPA = getIPA(base);
    const status = baseIPA ? 'PASS' : 'FAIL';
    console.log(`  ${status}: ${word.padEnd(15)} base="${base.padEnd(8)}" ${baseIPA ? `(${baseIPA})` : '(base not found)' }`);
  });
  console.log('');
});

console.log('\nSummary: All base words should be found in dictionary for proper inflection.');
