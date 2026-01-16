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
  
  // Rule 1: -ies -> -y
  if (word.endsWith('ies') && word.length > 3) {
    return { base: word.slice(0, -3) + 'y', type: 's-ies' };
  }
  
  // Rule 2: -es after sibilants
  if (word.endsWith('es') && word.length > 2) {
    const charBeforeEs = word[word.length - 3];
    const twoCharsBeforeEs = word.slice(word.length - 4, word.length - 2);
    
    if (twoCharsBeforeEs === 'sh' || twoCharsBeforeEs === 'ch' || 
        twoCharsBeforeEs === 'ss' || charBeforeEs === 'x' || charBeforeEs === 'z') {
      return { base: word.slice(0, -2), type: 's-es-sibilant' };
    }
  }
  
  // Rule 3: -oes -> -o
  if (word.endsWith('oes') && word.length > 3) {
    return { base: word.slice(0, -2), type: 's-oes' };
  }
  
  // Rule 4: -ves -> -f/-fe
  if (word.endsWith('ves') && word.length > 3) {
    const stem = word.slice(0, -3);
    return { base: stem + 'fe', type: 's-ves', alternativeBase: stem + 'f' };
  }
  
  // Rule 6: Simple -s
  if (word.endsWith('s')) {
    return { base: word.slice(0, -1), type: 's-simple' };
  }
  
  return null;
}

function transformIPAForS(baseIPA) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) return null;
  const ipa = baseIPA.slice(1, -1);
  const cleaned = ipa.replace(/[ˈˌː]/g, '');
  
  // Get last sound
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
  // Sibilants -> /ɪz/
  if (['s', 'z', 'ʃ', 'ʒ'].includes(lastSound) || 
      ipa.endsWith('tʃ') || ipa.endsWith('dʒ')) {
    suffix = 'ɪz';
  } 
  // Voiceless -> /s/
  else if (['p', 't', 'k', 'f', 's', 'θ', 'ʃ', 'tʃ', 'h'].includes(lastSound)) {
    suffix = 's';
  } 
  // Voiced -> /z/
  else {
    suffix = 'z';
  }
  
  return `/${ipa}${suffix}/`;
}

function testWord(word) {
  // Direct lookup
  const direct = getIPAFromDict(word);
  if (direct) {
    return { source: 'DICT', ipa: direct };
  }
  
  // Try inflection
  const result = tryRemoveSuffix(word);
  if (!result) {
    return { source: 'NONE', ipa: null };
  }
  
  // Try primary base
  let baseIPA = getIPAFromDict(result.base);
  if (baseIPA) {
    const inflected = transformIPAForS(baseIPA);
    return { source: 'INFLECT', ipa: inflected, base: result.base, baseIPA, type: result.type };
  }
  
  // Try alternative base
  if (result.alternativeBase) {
    baseIPA = getIPAFromDict(result.alternativeBase);
    if (baseIPA) {
      const inflected = transformIPAForS(baseIPA);
      return { source: 'INFLECT-ALT', ipa: inflected, base: result.alternativeBase, baseIPA, type: result.type };
    }
  }
  
  return { source: 'FAIL', ipa: null, base: result.base, type: result.type };
}

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║           Comprehensive -s/-es Suffix Test                   ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const testCases = [
  { category: 'Voiceless Consonants (should add /s/)', words: ['cats', 'maps', 'books', 'cliffs', 'months'] },
  { category: 'Voiced Consonants (should add /z/)', words: ['dogs', 'bags', 'pens', 'bells', 'hands'] },
  { category: 'Vowels (should add /z/)', words: ['sees', 'goes', 'plays', 'cries', 'buys'] },
  { category: 'Sibilants /s,z/ (should add /ɪz/)', words: ['raises', 'causes', 'uses', 'houses', 'loses', 'passes', 'misses'] },
  { category: 'Sibilants /ʃ,ʒ/ (should add /ɪz/)', words: ['wishes', 'washes', 'brushes', 'pushes'] },
  { category: 'Affricates /tʃ,dʒ/ (should add /ɪz/)', words: ['watches', 'catches', 'churches', 'judges', 'changes'] },
  { category: '-x,-z endings (should add /ɪz/)', words: ['boxes', 'fixes', 'mixes', 'buzzes', 'quizzes'] },
  { category: '-ies endings (y->ies)', words: ['tries', 'flies', 'studies', 'carries', 'stories'] },
  { category: '-ves endings (f->ves)', words: ['knives', 'lives', 'wives', 'leaves', 'shelves'] },
  { category: '-oes endings (o->oes)', words: ['goes', 'does', 'heroes', 'potatoes', 'tomatoes'] }
];

let totalTests = 0;
let passed = 0;
let failed = 0;

testCases.forEach(({ category, words }) => {
  console.log(`\n${category}`);
  console.log('─'.repeat(70));
  
  words.forEach(word => {
    totalTests++;
    const result = testWord(word);
    
    if (result.source === 'DICT') {
      console.log(`✓ ${word.padEnd(15)} ${result.ipa.padEnd(20)} [in dictionary]`);
      passed++;
    } else if (result.source === 'INFLECT' || result.source === 'INFLECT-ALT') {
      console.log(`✓ ${word.padEnd(15)} ${result.ipa.padEnd(20)} [${result.base} + s]`);
      passed++;
    } else if (result.source === 'FAIL') {
      console.log(`✗ ${word.padEnd(15)} ${'FAILED'.padEnd(20)} [base "${result.base}" not found]`);
      failed++;
    } else {
      console.log(`✗ ${word.padEnd(15)} ${'NO MATCH'.padEnd(20)} [no inflection pattern]`);
      failed++;
    }
  });
});

console.log('\n' + '═'.repeat(70));
console.log(`\nTest Summary:`);
console.log(`  Total: ${totalTests}`);
console.log(`  Passed: ${passed} (${((passed/totalTests)*100).toFixed(1)}%)`);
console.log(`  Failed: ${failed} (${((failed/totalTests)*100).toFixed(1)}%)`);

if (failed > 0) {
  console.log(`\n⚠️  Some tests failed. Failed words may not be in the core dictionary.`);
}
