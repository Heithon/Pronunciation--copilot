import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coreDataPath = join(__dirname, 'node_modules', 'mass-ipa', 'data', 'core.json');
const coreData = JSON.parse(readFileSync(coreDataPath, 'utf-8'));

console.log('Testing "raises":\n');

// Check if raises is in dictionary
const raisesIPA = coreData['raises'];
console.log(`1. Direct lookup "raises": ${raisesIPA || 'NOT FOUND'}`);

// Check if raise is in dictionary
const raiseIPA = coreData['raise'];
console.log(`2. Base word "raise": ${raiseIPA || 'NOT FOUND'}`);

// Simulate inflection detection
if (!raisesIPA) {
  console.log('\n3. Inflection detection:');
  
  // Try removing 's'
  const base = 'raises'.slice(0, -1);
  console.log(`   - Remove 's': "${base}"`);
  console.log(`   - Base IPA: ${coreData[base] || 'NOT FOUND'}`);
  
  // Try removing 'es'
  const base2 = 'raises'.slice(0, -2);
  console.log(`   - Remove 'es': "${base2}"`);
  console.log(`   - Base IPA: ${coreData[base2] || 'NOT FOUND'}`);
  
  if (coreData[base2]) {
    // Simulate transformation
    const baseIPA = coreData[base2];
    console.log(`\n4. Transformation:`);
    console.log(`   - Base IPA: ${baseIPA}`);
    
    // Get last sound
    const ipa = baseIPA.slice(1, -1);
    const cleaned = ipa.replace(/[ˈˌː]/g, '');
    const lastChar = cleaned[cleaned.length - 1];
    console.log(`   - Last sound: "${lastChar}"`);
    console.log(`   - Is sibilant (s,z,ʃ,ʒ): ${['s','z','ʃ','ʒ'].includes(lastChar)}`);
    
    let suffix;
    if (['s', 'z', 'ʃ', 'ʒ'].includes(lastChar)) {
      suffix = 'ɪz';
    } else {
      suffix = 's or z (voicing rule)';
    }
    console.log(`   - Should add: /${suffix}/`);
    console.log(`   - Result: /${ipa}${suffix === 'ɪz' ? 'ɪz' : suffix}/`);
  }
}
