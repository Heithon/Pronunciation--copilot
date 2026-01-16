import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coreDataPath = join(__dirname, 'node_modules', 'mass-ipa', 'data', 'core.json');
const coreData = JSON.parse(readFileSync(coreDataPath, 'utf-8'));

function checkInDict(word) {
  return coreData[word.toLowerCase().trim()] || null;
}

console.log('========================================');
console.log('Common English Suffix Coverage Test');
console.log('========================================\n');

const suffixTests = [
  {
    name: 'Already Supported',
    groups: [
      {
        suffix: '-ed (past tense)',
        examples: ['walked', 'tried', 'stopped', 'played', 'wanted'],
        notes: 'Should be supported'
      },
      {
        suffix: '-ing (gerund)',
        examples: ['walking', 'trying', 'running', 'playing', 'making'],
        notes: 'Should be supported'
      },
      {
        suffix: '-s/-es (plural/3rd person)',
        examples: ['walks', 'tries', 'boxes', 'raises', 'goes'],
        notes: 'Should be supported'
      },
      {
        suffix: '-ly (adverb)',
        examples: ['quickly', 'happily', 'dramatically', 'easily', 'slowly'],
        notes: 'Should be supported'
      }
    ]
  },
  {
    name: 'Possibly Unsupported',
    groups: [
      {
        suffix: '-ity (noun)',
        examples: ['ability', 'quality', 'reality', 'activity', 'security'],
        base: ['able', 'N/A', 'real', 'active', 'secure'],
        notes: 'Converts adjective to noun'
      },
      {
        suffix: '-y (adjective)',
        examples: ['happy', 'sunny', 'noisy', 'lucky', 'dirty'],
        base: ['N/A', 'sun', 'noise', 'luck', 'dirt'],
        notes: 'Forms adjectives from nouns'
      },
      {
        suffix: '-er (comparative)',
        examples: ['bigger', 'faster', 'happier', 'easier', 'hotter'],
        base: ['big', 'fast', 'happy', 'easy', 'hot'],
        notes: 'Comparative adjectives'
      },
      {
        suffix: '-est (superlative)',
        examples: ['biggest', 'fastest', 'happiest', 'easiest', 'hottest'],
        base: ['big', 'fast', 'happy', 'easy', 'hot'],
        notes: 'Superlative adjectives'
      },
      {
        suffix: '-tion/-sion (noun)',
        examples: ['action', 'decision', 'education', 'permission', 'creation'],
        base: ['act', 'decide', 'educate', 'permit', 'create'],
        notes: 'Verb to noun'
      },
      {
        suffix: '-ness (noun)',
        examples: ['happiness', 'sadness', 'kindness', 'darkness', 'weakness'],
        base: ['happy', 'sad', 'kind', 'dark', 'weak'],
        notes: 'Adjective to noun'
      },
      {
        suffix: '-ment (noun)',
        examples: ['movement', 'development', 'government', 'payment', 'treatment'],
        base: ['move', 'develop', 'govern', 'pay', 'treat'],
        notes: 'Verb to noun'
      },
      {
        suffix: '-able/-ible (adjective)',
        examples: ['readable', 'possible', 'comfortable', 'flexible', 'visible'],
        base: ['read', 'N/A', 'comfort', 'flex', 'N/A'],
        notes: 'Forms adjectives'
      },
      {
        suffix: '-ful (adjective)',
        examples: ['beautiful', 'helpful', 'useful', 'wonderful', 'powerful'],
        base: ['beauty', 'help', 'use', 'wonder', 'power'],
        notes: 'Full of X'
      },
      {
        suffix: '-less (adjective)',
        examples: ['hopeless', 'helpless', 'useless', 'endless', 'careless'],
        base: ['hope', 'help', 'use', 'end', 'care'],
        notes: 'Without X'
      },
      {
        suffix: '-ous (adjective)',
        examples: ['famous', 'dangerous', 'nervous', 'serious', 'curious'],
        base: ['fame', 'danger', 'nerve', 'N/A', 'N/A'],
        notes: 'Having quality of X'
      },
      {
        suffix: '-al (adjective)',
        examples: ['national', 'personal', 'natural', 'cultural', 'general'],
        base: ['nation', 'person', 'nature', 'culture', 'N/A'],
        notes: 'Relating to X'
      },
      {
        suffix: '-ive (adjective)',
        examples: ['creative', 'active', 'positive', 'negative', 'attractive'],
        base: ['create', 'act', 'N/A', 'N/A', 'attract'],
        notes: 'Tending to X'
      },
      {
        suffix: '-ic (adjective)',
        examples: ['historic', 'dramatic', 'economic', 'scientific', 'electric'],
        base: ['history', 'drama', 'economy', 'science', 'N/A'],
        notes: 'Relating to X'
      }
    ]
  }
];

function analyzeGroup(group) {
  const results = { inDict: 0, notInDict: 0, words: [] };
  
  group.examples.forEach((word, idx) => {
    const inDict = checkInDict(word);
    if (inDict) {
      results.inDict++;
      results.words.push({ word, status: 'IN_DICT', ipa: inDict });
    } else {
      results.notInDict++;
      const baseWord = group.base ? group.base[idx] : null;
      const baseIPA = baseWord && baseWord !== 'N/A' ? checkInDict(baseWord) : null;
      results.words.push({ 
        word, 
        status: 'MISSING', 
        base: baseWord,
        baseIPA: baseIPA
      });
    }
  });
  
  return results;
}

let totalSupported = 0;
let totalUnsupported = 0;
const unsupportedSuffixes = [];

suffixTests.forEach(category => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(category.name);
  console.log('='.repeat(60));
  
  category.groups.forEach(group => {
    const results = analyzeGroup(group);
    const coverage = ((results.inDict / group.examples.length) * 100).toFixed(0);
    
    console.log(`\n${group.suffix}`);
    console.log(`  ${group.notes}`);
    console.log(`  Coverage: ${results.inDict}/${group.examples.length} (${coverage}%) in dictionary`);
    
    if (results.notInDict > 0) {
      console.log(`  Missing words:`);
      results.words.forEach(({ word, status, base, baseIPA }) => {
        if (status === 'MISSING') {
          const baseInfo = base && base !== 'N/A' 
            ? baseIPA 
              ? `base "${base}" found: ${baseIPA}`
              : `base "${base}" NOT in dict`
            : 'no known base';
          console.log(`    - ${word.padEnd(20)} [${baseInfo}]`);
        }
      });
      
      totalUnsupported += results.notInDict;
      
      if (parseInt(coverage) < 50) {
        unsupportedSuffixes.push({
          suffix: group.suffix,
          coverage: parseInt(coverage),
          missing: results.notInDict,
          hasBaseWords: results.words.some(w => w.status === 'MISSING' && w.baseIPA)
        });
      }
    } else {
      console.log(`  All words found in dictionary!`);
    }
    
    totalSupported += results.inDict;
  });
});

console.log(`\n${'='.repeat(60)}`);
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Total words tested: ${totalSupported + totalUnsupported}`);
console.log(`In dictionary: ${totalSupported}`);
console.log(`Missing: ${totalUnsupported}`);
console.log(`Overall coverage: ${((totalSupported/(totalSupported+totalUnsupported))*100).toFixed(1)}%`);

if (unsupportedSuffixes.length > 0) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('RECOMMENDATION: Add support for these suffixes');
  console.log('='.repeat(60));
  
  unsupportedSuffixes.forEach(({ suffix, coverage, missing, hasBaseWords }) => {
    const priority = hasBaseWords ? 'HIGH' : 'MEDIUM';
    console.log(`\n${suffix}`);
    console.log(`  Coverage: ${coverage}%, Missing: ${missing} words`);
    console.log(`  Priority: ${priority} (${hasBaseWords ? 'base words available' : 'base words may not exist'})`);
  });
} else {
  console.log(`\nAll common suffixes have good dictionary coverage!`);
}
