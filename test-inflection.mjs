/**
 * Standalone Test Script for IPA Inflection System
 * Tests word inflection detection and IPA transformation
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load mass-ipa core data directly
const coreDataPath = join(__dirname, 'node_modules', 'mass-ipa', 'data', 'core.json');
const coreData = JSON.parse(readFileSync(coreDataPath, 'utf-8'));

console.log(`Loaded ${Object.keys(coreData).length} words from core dictionary\n`);

function getIPAFromDict(word) {
  const normalized = word.toLowerCase().trim();
  return coreData[normalized] || null;
}

// Inflection detection functions
const IRREGULAR_PAST_TENSE = new Set([
  'went', 'came', 'saw', 'made', 'took', 'got', 'gave', 'found', 'thought',
  'told', 'left', 'kept', 'felt', 'brought', 'began', 'ran', 'sat', 'stood'
]);

const IRREGULAR_PLURALS = new Set([
  'men', 'women', 'children', 'teeth', 'feet', 'geese', 'mice', 'lice'
]);

function tryRemoveEdSuffix(word) {
  if (word.length < 4 || IRREGULAR_PAST_TENSE.has(word)) return null;
  if (!word.endsWith('ed')) return null;
  
  const stem = word.slice(0, -2);
  
  if (stem.length >= 2 && 
      stem[stem.length - 1] === stem[stem.length - 2] &&
      isConsonant(stem[stem.length - 1])) {
    return { base: stem.slice(0, -1), type: 'ed-double' };
  }
  
  if (stem.endsWith('i')) {
    return { base: stem.slice(0, -1) + 'y', type: 'ed-y-to-i' };
  }
  
  return { base: stem, type: 'ed-simple' };
}

function tryRemoveSuffix(word) {
  if (word.length < 3 || IRREGULAR_PLURALS.has(word)) return null;
  
  if (word.endsWith('ies') && word.length > 3) {
    return { base: word.slice(0, -3) + 'y', type: 's-ies' };
  }
  
  if (word.endsWith('es') && word.length > 2) {
    const stem = word.slice(0, -2);
    if (stem.endsWith('sh') || stem.endsWith('ch') || 
        stem.endsWith('s') || stem.endsWith('x') || stem.endsWith('z')) {
      return { base: stem, type: 's-es-sibilant' };
    }
  }
  
  if (word.endsWith('s')) {
    return { base: word.slice(0, -1), type: 's-simple' };
  }
  
  return null;
}

function tryRemoveIngSuffix(word) {
  if (word.length < 5 || !word.endsWith('ing')) return null;
  
  const stem = word.slice(0, -3);
  
  if (stem.length >= 2 && 
      stem[stem.length - 1] === stem[stem.length - 2] &&
      isConsonant(stem[stem.length - 1])) {
    return { base: stem.slice(0, -1), type: 'ing-double', alternativeBase: stem };
  }
  
  return { base: stem + 'e', type: 'ing-e-dropped', alternativeBase: stem };
}

function tryRemoveLySuffix(word) {
  if (word.length < 4 || !word.endsWith('ly')) return null;
  
  const stem = word.slice(0, -2);
  
  if (stem.endsWith('i') && stem.length > 1) {
    return { base: stem.slice(0, -1) + 'y', type: 'ly-ily' };
  }
  
  return { base: stem, type: 'ly-simple', alternativeBase: stem + 'e' };
}

function isConsonant(char) {
  return char && !'aeiou'.includes(char.toLowerCase());
}

function getLastSound(ipa) {
  const cleaned = ipa.replace(/[ˈˌː]/g, '');
  const digraphs = ['tʃ', 'dʒ', 'ŋ', 'ʃ', 'ʒ', 'θ', 'ð'];
  for (const digraph of digraphs) {
    if (cleaned.endsWith(digraph)) return digraph;
  }
  return cleaned[cleaned.length - 1] || null;
}

function isVoicelessConsonant(sound) {
  return ['p', 't', 'k', 'f', 's', 'θ', 'ʃ', 'tʃ', 'h'].includes(sound);
}

function transformIPAForEd(baseIPA) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) return null;
  const ipa = baseIPA.slice(1, -1);
  const lastSound = getLastSound(ipa);
  if (!lastSound) return null;
  
  let suffix = '';
  if (lastSound === 't' || lastSound === 'd') {
    suffix = 'ɪd';
  } else if (isVoicelessConsonant(lastSound)) {
    suffix = 't';
  } else {
    suffix = 'd';
  }
  
  return `/${ipa}${suffix}/`;
}

function transformIPAForS(baseIPA) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) return null;
  const ipa = baseIPA.slice(1, -1);
  const lastSound = getLastSound(ipa);
  if (!lastSound) return null;
  
  let suffix = '';
  if (['s', 'z', 'ʃ', 'ʒ'].includes(lastSound) || 
      ipa.endsWith('tʃ') || ipa.endsWith('dʒ')) {
    suffix = 'ɪz';
  } else if (isVoicelessConsonant(lastSound)) {
    suffix = 's';
  } else {
    suffix = 'z';
  }
  
  return `/${ipa}${suffix}/`;
}

function transformIPAForIng(baseIPA) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) return null;
  const ipa = baseIPA.slice(1, -1);
  return `/${ipa}ɪŋ/`;
}

function transformIPAForLy(baseIPA) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) return null;
  const ipa = baseIPA.slice(1, -1);
  return `/${ipa}li/`;
}

function getInflectedIPA(word) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing word: "${word}"`);
  console.log('='.repeat(60));
  
  // Try -ly suffix
  const lyResult = tryRemoveLySuffix(word);
  if (lyResult) {
    console.log(`✓ Detected -ly suffix: base="${lyResult.base}", type=${lyResult.type}`);
    let baseIPA = getIPAFromDict(lyResult.base);
    console.log(`  Base IPA for "${lyResult.base}": ${baseIPA || 'NOT FOUND'}`);
    if (baseIPA) {
      const result = transformIPAForLy(baseIPA);
      console.log(`  Transformed: ${result}`);
      return result;
    }
    if (lyResult.alternativeBase) {
      console.log(`  Trying alternative base: "${lyResult.alternativeBase}"`);
      baseIPA = getIPAFromDict(lyResult.alternativeBase);
      console.log(`  Base IPA for "${lyResult.alternativeBase}": ${baseIPA || 'NOT FOUND'}`);
      if (baseIPA) {
        const result = transformIPAForLy(baseIPA);
        console.log(`  Transformed: ${result}`);
        return result;
      }
    }
  }
  
  // Try -ing suffix
  const ingResult = tryRemoveIngSuffix(word);
  if (ingResult) {
    console.log(`✓ Detected -ing suffix: base="${ingResult.base}", type=${ingResult.type}`);
    let baseIPA = getIPAFromDict(ingResult.base);
    console.log(`  Base IPA for "${ingResult.base}": ${baseIPA || 'NOT FOUND'}`);
    if (baseIPA) {
      const result = transformIPAForIng(baseIPA);
      console.log(`  Transformed: ${result}`);
      return result;
    }
    if (ingResult.alternativeBase) {
      console.log(`  Trying alternative base: "${ingResult.alternativeBase}"`);
      baseIPA = getIPAFromDict(ingResult.alternativeBase);
      console.log(`  Base IPA for "${ingResult.alternativeBase}": ${baseIPA || 'NOT FOUND'}`);
      if (baseIPA) {
        const result = transformIPAForIng(baseIPA);
        console.log(`  Transformed: ${result}`);
        return result;
      }
    }
  }
  
  // Try -ed suffix
  const edResult = tryRemoveEdSuffix(word);
  if (edResult) {
    console.log(`✓ Detected -ed suffix: base="${edResult.base}", type=${edResult.type}`);
    const baseIPA = getIPAFromDict(edResult.base);
    console.log(`  Base IPA for "${edResult.base}": ${baseIPA || 'NOT FOUND'}`);
    if (baseIPA) {
      const result = transformIPAForEd(baseIPA);
      console.log(`  Transformed: ${result}`);
      return result;
    }
  }
  
  // Try -s suffix
  const sResult = tryRemoveSuffix(word);
  if (sResult) {
    console.log(`✓ Detected -s suffix: base="${sResult.base}", type=${sResult.type}`);
    const baseIPA = getIPAFromDict(sResult.base);
    console.log(`  Base IPA for "${sResult.base}": ${baseIPA || 'NOT FOUND'}`);
    if (baseIPA) {
      const result = transformIPAForS(baseIPA);
      console.log(`  Transformed: ${result}`);
      return result;
    }
  }
  
  console.log('✗ No inflection pattern matched');
  return null;
}

function testWord(word) {
  // First try direct lookup
  const directIPA = getIPAFromDict(word);
  if (directIPA) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Word: "${word}"`);
    console.log(`Direct lookup: ${directIPA}`);
    console.log('='.repeat(60));
    return directIPA;
  }
  
  // Try inflection
  return getInflectedIPA(word);
}

// Main test
function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║       IPA Inflection System Test                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const testWords = [
    'questions',
    'algorithms',
    'mechanics',
    'evolving',
    'maintaining'
  ];
  
  const results = {};
  
  for (const word of testWords) {
    results[word] = testWord(word);
  }
  
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL RESULTS                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  for (const [word, ipa] of Object.entries(results)) {
    const status = ipa ? '✓' : '✗';
    const padding = ' '.repeat(20 - word.length);
    console.log(`${status} ${word}${padding}${ipa || 'NO IPA FOUND'}`);
  }
  
  console.log('\n');
}

runTests();
