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
  
  // Rule 2: -es after sibilants (updated logic)
  if (word.endsWith('es') && word.length > 2) {
    const charBeforeEs = word[word.length - 3];
    const twoCharsBeforeEs = word.slice(word.length - 4, word.length - 2);
    
    if (twoCharsBeforeEs === 'sh' || twoCharsBeforeEs === 'ch' || 
        twoCharsBeforeEs === 'ss' || charBeforeEs === 'x' || charBeforeEs === 'z') {
      return { base: word.slice(0, -2), type: 's-es-sibilant' };
    }
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
  
  // Check for digraphs
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
  if (['s', 'z', 'ʃ', 'ʒ'].includes(lastSound) || 
      ipa.endsWith('tʃ') || ipa.endsWith('dʒ')) {
    suffix = 'ɪz';
  } else if (['p', 't', 'k', 'f', 's', 'θ', 'ʃ', 'tʃ', 'h'].includes(lastSound)) {
    suffix = 's';
  } else {
    suffix = 'z';
  }
  
  return `/${ipa}${suffix}/`;
}

console.log('Testing -s suffix words:\n');

const testWords = ['raises', 'causes', 'uses', 'boxes', 'watches', 'cats', 'dogs'];

testWords.forEach(word => {
  console.log(`\n${word}:`);
  
  // Direct lookup
  const direct = getIPAFromDict(word);
  console.log(`  Direct: ${direct || 'NOT FOUND'}`);
  
  if (!direct) {
    // Try inflection
    const result = tryRemoveSuffix(word);
    if (result) {
      console.log(`  Detected: -s suffix, base="${result.base}", type=${result.type}`);
      const baseIPA = getIPAFromDict(result.base);
      console.log(`  Base IPA: ${baseIPA || 'NOT FOUND'}`);
      if (baseIPA) {
        const inflected = transformIPAForS(baseIPA);
        console.log(`  Result: ${inflected}`);
      }
    } else {
      console.log(`  No inflection matched`);
    }
  }
});
