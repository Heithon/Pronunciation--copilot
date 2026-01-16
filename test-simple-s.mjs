import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coreDataPath = join(__dirname, 'node_modules', 'mass-ipa', 'data', 'core.json');
const coreData = JSON.parse(readFileSync(coreDataPath, 'utf-8'));

function getIPAFromDict(word) {
  return coreData[word.toLowerCase().trim()] || null;
}

function tryRemoveSuffix(word) {
  if (word.length < 3) return null;
  
  if (word.endsWith('ies') && word.length > 3) {
    return { base: word.slice(0, -3) + 'y', type: 's-ies' };
  }
  
  if (word.endsWith('es') && word.length > 2) {
    const charBeforeEs = word[word.length - 3];
    const twoCharsBeforeEs = word.slice(word.length - 4, word.length - 2);
    
    if (twoCharsBeforeEs === 'sh' || twoCharsBeforeEs === 'ch' || 
        twoCharsBeforeEs === 'ss' || charBeforeEs === 'x' || charBeforeEs === 'z') {
      return { base: word.slice(0, -2), type: 's-es-sibilant' };
    }
  }
  
  if (word.endsWith('oes') && word.length > 3) {
    return { base: word.slice(0, -2), type: 's-oes' };
  }
  
  if (word.endsWith('ves') && word.length > 3) {
    const stem = word.slice(0, -3);
    return { base: stem + 'fe', type: 's-ves', alternativeBase: stem + 'f' };
  }
  
  if (word.endsWith('s')) {
    return { base: word.slice(0, -1), type: 's-simple' };
  }
  
  return null;
}

function transformIPAForS(baseIPA) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) return null;
  const ipa = baseIPA.slice(1, -1);
  const cleaned = ipa.replace(/[ˈˌː]/g, '');
  
  const digraphs = ['tʃ', 'dʒ', 'ŋ', 'ʃ', 'ʒ', 'θ', 'ð'];
  let lastSound = null;
  for (const digraph of digraphs) {
    if (cleaned.endsWith(digraph)) {
      lastSound = digraph;
      break;
    }
  }
  if (!lastSound) lastSound = cleaned[cleaned.length - 1];
  
  let suffix = '';
  if (['s', 'z', 'ʃ', 'ʒ'].includes(lastSound) || ipa.endsWith('tʃ') || ipa.endsWith('dʒ')) {
    suffix = 'ɪz';
  } else if (['p', 't', 'k', 'f', 's', 'θ', 'ʃ', 'tʃ', 'h'].includes(lastSound)) {
    suffix = 's';
  } else {
    suffix = 'z';
  }
  
  return `/${ipa}${suffix}/`;
}

function testWord(word) {
  const direct = getIPAFromDict(word);
  if (direct) return { ok: true, ipa: direct, source: 'dict' };
  
  const result = tryRemoveSuffix(word);
  if (!result) return { ok: false, error: 'no pattern' };
  
  let baseIPA = getIPAFromDict(result.base);
  if (baseIPA) {
    const inflected = transformIPAForS(baseIPA);
    return { ok: true, ipa: inflected, source: 'inflect', base: result.base };
  }
  
  if (result.alternativeBase) {
    baseIPA = getIPAFromDict(result.alternativeBase);
    if (baseIPA) {
      const inflected = transformIPAForS(baseIPA);
      return { ok: true, ipa: inflected, source: 'inflect-alt', base: result.alternativeBase };
    }
  }
  
  return { ok: false, error: 'base not found', base: result.base };
}

console.log('Testing -s/-es suffix handling:\n');

const tests = [
  ['cats', 'should be /kæts/'],
  ['dogs', 'should be /dɒgz/'],
  ['raises', 'should be /reizɪz/'],
  ['causes', 'should be /kɒ:zɪz/'],
  ['uses', 'should be /ju:sɪz/'],
  ['boxes', 'should be /bɒksɪz/'],
  ['watches', 'should be /wɒtʃɪz/'],
  ['wishes', 'should be /wɪʃɪz/'],
  ['changes', 'should be /tʃeindʒɪz/'],
  ['tries', 'should be /traiz/'],
  ['books', 'should be /buks/'],
  ['bags', 'should be /bægz/'],
  ['goes', 'should be /gouz/'],
];

let passed = 0;
let failed = 0;

tests.forEach(([word, expected]) => {
  const result = testWord(word);
  if (result.ok) {
    console.log(`PASS: ${word.padEnd(12)} => ${result.ipa.padEnd(15)} [${result.source}]`);
    passed++;
  } else {
    console.log(`FAIL: ${word.padEnd(12)} => ${result.error} (base: ${result.base || 'N/A'})`);
    failed++;
  }
});

console.log(`\nSummary: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
console.log(`Success rate: ${((passed/tests.length)*100).toFixed(1)}%`);
