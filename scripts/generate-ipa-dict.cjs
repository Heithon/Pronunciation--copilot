/**
 * Generate complete IPA dictionary from CMU Pronouncing Dictionary
 * Using CommonJS for compatibility
 */

const { writeFileSync } = require('fs');
const { join } = require('path');
const cmuDict = require('cmu-pronouncing-dictionary');

// ARPABET to IPA mapping
const ARPABET_TO_IPA = {
  'AA': 'ɑː', 'AE': 'æ', 'AH': 'ʌ', 'AO': 'ɔː', 'AW': 'aʊ',
  'AY': 'aɪ', 'EH': 'e', 'ER': 'ɜːr', 'EY': 'eɪ', 'IH': 'ɪ',
  'IY': 'iː', 'OW': 'oʊ', 'OY': 'ɔɪ', 'UH': 'ʊ', 'UW': 'uː',
  'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð', 'F': 'f',
  'G': 'g', 'HH': 'h', 'JH': 'dʒ', 'K': 'k', 'L': 'l',
  'M': 'm', 'N': 'n', 'NG': 'ŋ', 'P': 'p', 'R': 'r',
  'S': 's', 'SH': 'ʃ', 'T': 't', 'TH': 'θ', 'V': 'v',
  'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʒ'
};

function arpaToIPA(arpa) {
  const phones = arpa.split(' ');
  let ipa = '';
  let stressIndex = -1;
  
  phones.forEach((phone, index) => {
    const basePhone = phone.replace(/[012]/g, '');
    const hasStress = phone.match(/1/);
    
    if (hasStress && stressIndex === -1) {
      stressIndex = index;
    }
    
    if (ARPABET_TO_IPA[basePhone]) {
      if (hasStress && ipa.length > 0) {
        ipa += 'ˈ';
      }
      ipa += ARPABET_TO_IPA[basePhone];
    }
  });
  
  return ipa;
}

console.log('⏳ Generating complete IPA dictionary from CMU dict...');
console.log(`📚 CMU dict contains ${Object.keys(cmuDict.dictionary).length} entries`);

const ipaDict = {};
let count = 0;
let skipped = 0;

for (const [word, arpa] of Object.entries(cmuDict.dictionary)) {
  const normalized = word.toLowerCase();
  
  // Skip non-alphabetic (but allow hyphens and apostrophes)
  if (!/^[a-z'-]+$/.test(normalized)) {
    skipped++;
    continue;
  }
  
  if (!ipaDict[normalized]) {
    const ipa = arpaToIPA(arpa);
    if (ipa) {
      ipaDict[normalized] = `/${ipa}/`;
      count++;
    }
  }
}

console.log(`✅ Processed ${count} words (skipped ${skipped} non-standard)`);

// Write to JSON
const outputPath = join(__dirname, '../src/data/ipa-dict.json');
writeFileSync(outputPath, JSON.stringify(ipaDict));

console.log(`✅ Saved to ${outputPath}`);
const sizeInMB = (Buffer.byteLength(JSON.stringify(ipaDict)) / 1024 / 1024).toFixed(2);
console.log(`📦 File size: ${sizeInMB} MB`);

// Show sample
const samples = Object.entries(ipaDict).slice(0, 10);
console.log('\n📝 Sample entries:');
samples.forEach(([word, ipa]) => {
  console.log(`   ${word}: ${ipa}`);
});
