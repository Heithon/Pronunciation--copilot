const fs = require('fs');
const path = require('path');

// 1. Setup variables
const output = {};
let count = 0;

// High frequency words missing from source or needing overrides
const fallbackWords = {
  'the': '/ðə/',
  'to': '/tə/',
  'of': '/əv/',
  'a': '/ə/',
  'and': '/ənd/',
  'that': '/ðæt/'
};

// Target words to inspect
const inspectWords = ['the', 'impossible', 'artificial', 'of', 'a', 'to', 'happy', 'actually'];

// 2. Extract Data
console.log('📦 Loading ipa-dict data...');
// Use fs to read the file directly as text because it is a webpack bundle 
const bundlePath = path.join(__dirname, '../node_modules/ipa-dict/lib/en_US.js');
const fileContent = fs.readFileSync(bundlePath, 'utf8');

const startMarker = 'module.exports = JSON.parse("';
const startIndex = fileContent.indexOf(startMarker);

if (startIndex === -1) {
  console.error('❌ Could not find JSON start marker');
  process.exit(1);
}

const jsonStart = startIndex + startMarker.length;
let i = jsonStart;
let isEscaped = false;

// Scan forward to find the matching closing quote
while (i < fileContent.length) {
  const char = fileContent[i];
  if (isEscaped) {
    isEscaped = false;
  } else {
    if (char === '\\') {
      isEscaped = true;
    } else if (char === '"') {
      // Found the end of the string!
      break;
    }
  }
  i++;
}

if (i >= fileContent.length) {
  console.error('❌ Could not find closing quote for JSON string');
  process.exit(1);
}

let jsonString = fileContent.substring(jsonStart, i);
let rawData;

try {
  // Parsing the JS string literal into a string
  const innerJson = JSON.parse('"' + jsonString + '"');
  // Parsing the JSON content
  rawData = JSON.parse(innerJson);
} catch (e) {
  console.error('❌ JSON Parsing failed in try-catch block.');
  console.error(e.message);
  process.exit(1);
}

console.log(`📚 Raw dictionary has ${Object.keys(rawData).length} entries.`);

// 3. Process Data
if (rawData['The']) console.log("Found 'The' in rawData"); 

for (const [word, ipas] of Object.entries(rawData)) {
  if (!ipas || ipas.length === 0) continue;
  
  let ipa = ipas[0];
  
  // Clean up: remove explicit / / and whitespace
  ipa = ipa.trim().replace(/^\/|\/$/g, '');
  
  // Normalize symbols
  // ɫ -> l (Dark L to clear L)
  ipa = ipa.replace(/ɫ/g, 'l');
  // ɹ -> r (Approximant R to standard R)
  ipa = ipa.replace(/ɹ/g, 'r');
  // ɡ -> g (Script G to standard G)
  ipa = ipa.replace(/ɡ/g, 'g');
  // ɛ -> e (Open-mid front unrounded vowel to e - simpler for learners)
  ipa = ipa.replace(/ɛ/g, 'e');
  
  // Custom Normalization: Add length markers for Tense Vowels in Stressed Syllables
  // Users expect /i:/ for green, /u:/ for blue, /ɑ:/ for car.
  ipa = addLengthMarkers(ipa);

  // Fix Syllabic L: /əl$/ -> /l/
  // e.g. /impɑsəbəl/ -> /impɑsəbl/
  ipa = ipa.replace(/əl$/, 'l');
  
  output[word] = `/${ipa}/`;
  count++;
}

/**
 * Adds length markers (ː) to tense vowels (i, u, ɑ, ɔ, ɜ) when they appear in a stressed position.
 * Rule: In a stress group (started by ˈ or ˌ), the FIRST vowel nucleus is stressed.
 *       Subsequent vowels in the same group are unstressed.
 *       If no stress mark is present at start (e.g. monosyllables in some raw data, or unstress start), 
 *       we assume the first vowel is stressed if the word is monosyllabic? 
 *       Actually ipa-dict (CMU) usually marks primary stress for all content words.
 */
function addLengthMarkers(ipa) {
  // 1. Identification of Vowels (including localized ones from our previous steps: e, ɑ, etc.)
  // Vowels in our set: i, ɪ, e, æ, u, ʊ, o, ɔ, ɑ, ʌ, ə, ɚ, ɝ, aɪ, aʊ, ɔɪ...
  // We only want to lengthen: i, u, ɑ, ɔ, ɜ (mapped from ɝ)
  
  // First, map ɝ -> ɜr (US) or ɜː (UK)? 
  // User liked "artificial" /ɑːr.../. So let's map ɝ -> ɜr and then lengthen ɜ -> ɜːr ?
  // Actually, simply: 
  // i -> iː
  // u -> uː
  // ɑ -> ɑː
  // ɔ -> ɔː
  
  // Regex to find Stress Groups:
  // Split by (ˈ|ˌ) but keep delimiters.
  const parts = ipa.split(/([ˈˌ])/);
  
  let result = '';
  
  // State: Are we expecting the "Stress Vowel"? 
  // If we just saw ˈ or ˌ, the NEXT vowel we find is the Stressed one.
  // What about the very beginning? If no marker?
  // e.g. "about" /əˈbaʊt/. First part "ə". Unstressed.
  // e.g. "see" /ˈsi/. First part "". Second "ˈ". Third "si".
  // If the word has NO stress markers at all? (Function words sometimes).
  // basic assumption: if we are in a group preceded by ˈ or ˌ, first vowel is stressed.
  // Otherwise (start of word without stress), first vowel is unstressed.
  
  let expectingStressVowel = false;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (part === 'ˈ' || part === 'ˌ') {
      result += part;
      expectingStressVowel = true;
      continue;
    }
    
    // Process the segment text
    // We need to replace only the FIRST occurrence of a target vowel if expectingStressVowel is true.
    // But wait, there might be consonant clusters. "str..."
    // We iterate chars or use replace with callback?
    
    // We want to lengthen: i(?!ː|ng), u, ɑ, ɔ.
    // Note: avoid double lengthening if run multiple times (though we run once).
    // Note: 'ng' check? /iŋ/ is usually short /ɪŋ/ but represented as /i/ in some notations? 
    // CMU uses IH for 'sing' (/sɪŋ/). IPADict probably uses /ɪ/. So /i/ is safe to lengthen.
    
    let processedPart = part;
    
    if (expectingStressVowel) {
      // Find the first vowel index
      // Vowels: a-z, æ, ɑ, ɔ, ə, etc.
      // Simply: match the first char that is one of our targets [i, u, ɑ, ɔ] OR any other vowel to consume the "Stress slot".
      // We need to know if we hit *any* vowel.
      // If we hit 'e' (bed), it consumes the stress, so subsequent 'i's are unstressed.
      
      // Regex for ANY vowel symbol we use:
      // i, ɪ, e, æ, u, ʊ, o, ɔ, ɑ, ʌ, ə, a, ɚ, ɝ
      // Simplified: [iɪeæuʊoɔɑʌəaɝ] (unicode aware)
      
      const vowelRegex = /[iɪeæuʊoɔɑʌəaɚɝ]/;
      const match = part.match(vowelRegex);
      
      if (match) {
        const firstVowel = match[0];
        const idx = match.index;
        
        // Is this a target for lengthening?
        if (['i', 'u', 'ɑ', 'ɔ'].includes(firstVowel)) {
          // Lengthen it!
          const before = part.slice(0, idx);
          const after = part.slice(idx + 1);
          processedPart = before + firstVowel + 'ː' + after;
        }
        
        // We found natural vowel nucleus of this stress group. 
        // Any further vowels in this `part` (syllable coda or next unstressed syllables in same stress group?) are unstressed.
        expectingStressVowel = false; 
      }
    }
    
    result += processedPart;
  }
  
  return result;
}

// 4. Apply Fallbacks
for (const [word, ipa] of Object.entries(fallbackWords)) {
  if (!output[word]) {
    console.log(`⚠️ Adding fallback for missing word: ${word}`);
    // Fallbacks usually already use standard symbols, but just to be safe:
    let normalized = ipa.replace(/ɹ/g, 'r').replace(/ɡ/g, 'g').replace(/ɛ/g, 'e');
    output[word] = normalized;
    count++;
  } else {
    // Optional: Force override specific words if we prefer our version?
    // User asked for "authoritative", but for "the", our /ðə/ is definitely better than missing.
    // If the dict has 'the' (which it didn't), we would use it.
  }
}

// 5. Verify & Save
console.log('\n📝 Verification (Generated):');
inspectWords.forEach(word => {
  console.log(`   ${word}: ${output[word] || 'N/A'}`);
});

console.log(`✅ Extracted ${count} words.`);

const outputPath = path.join(__dirname, '../src/data/ipa-dict.json');
fs.writeFileSync(outputPath, JSON.stringify(output));
console.log(`💾 Saved to ${outputPath}`);
