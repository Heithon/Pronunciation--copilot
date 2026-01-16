import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coreDataPath = join(__dirname, 'node_modules', 'mass-ipa', 'data', 'core.json');
const coreData = JSON.parse(readFileSync(coreDataPath, 'utf-8'));

function checkInDict(word) {
  return coreData[word.toLowerCase().trim()] !== undefined;
}

const suffixTests = [
  { name: '-ed', examples: ['walked', 'tried', 'stopped'], supported: true },
  { name: '-ing', examples: ['walking', 'trying', 'running'], supported: true },
  { name: '-s/-es', examples: ['walks', 'boxes', 'raises'], supported: true },
  { name: '-ly', examples: ['quickly', 'happily', 'slowly'], supported: true },
  { name: '-er (comparative)', examples: ['bigger', 'faster', 'happier', 'nicer', 'hotter'], supported: false },
  { name: '-est (superlative)', examples: ['biggest', 'fastest', 'happiest', 'nicest', 'hottest'], supported: false },
  { name: '-ity', examples: ['ability', 'quality', 'reality', 'activity'], supported: false },
  { name: '-y (adj)', examples: ['happy', 'sunny', 'noisy', 'dirty', 'lucky'], supported: false },
  { name: '-tion', examples: ['action', 'creation', 'education'], supported: false },
  { name: '-ness', examples: ['happiness', 'sadness', 'kindness'], supported: false },
  { name: '-ment', examples: ['movement', 'development', 'payment'], supported: false },
  { name: '-able/-ible', examples: ['readable', 'possible', 'comfortable'], supported: false },
  { name: '-ful', examples: ['beautiful', 'helpful', 'useful'], supported: false },
  { name: '-less', examples: ['hopeless', 'helpless', 'useless'], supported: false },
];

console.log('Suffix Coverage Analysis\n');
console.log('Suffix                   Support  In Dict  Missing  Coverage');
console.log('-'.repeat(65));

const needSupport = [];

suffixTests.forEach(({ name, examples, supported }) => {
  const inDict = examples.filter(w => checkInDict(w)).length;
  const missing = examples.length - inDict;
  const coverage = Math.round((inDict / examples.length) * 100);
  
  const supportStatus = supported ? 'YES' : 'NO ';
  const coverageStatus = coverage >= 80 ? 'GOOD' : coverage >= 50 ? 'OK  ' : 'LOW ';
  
  console.log(`${name.padEnd(24)} ${supportStatus}      ${inDict}/${examples.length}      ${missing}       ${coverage}% [${coverageStatus}]`);
  
  if (!supported && coverage < 80) {
    needSupport.push({ name, coverage, missing, examples });
  }
});

console.log('\n' + '='.repeat(65));
console.log('RECOMMENDATIONS\n');

if (needSupport.length > 0) {
  console.log('These suffixes need inflection support:\n');
  
  needSupport.forEach(({ name, coverage, missing, examples }) => {
    console.log(`${name}:`);
    console.log(`  Coverage: ${coverage}%, Missing: ${missing} words`);
    console.log(`  Examples: ${examples.slice(0, 3).join(', ')}`);
    console.log('');
  });
} else {
  console.log('All common suffixes have good coverage!');
}
