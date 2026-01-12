/**
 * English-Chinese Dictionary API Integration
 * Uses iciba.com API for English-Chinese translations
 * Fallback to Free Dictionary API for English definitions
 */

// iciba API endpoint
const ICIBA_API = 'https://dict-co.iciba.com/api/dictionary.php';
const FREE_DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// Request cache
const requestCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Lookup word using iciba API (English-Chinese)
 * @param {string} word - Word to lookup
 * @returns {Promise<object|null>} Dictionary data
 */
export async function lookupWord(word) {
  const normalizedWord = word.toLowerCase().trim();
  
  if (!normalizedWord || !/^[a-zA-Z'-]+$/.test(normalizedWord)) {
    return null;
  }
  
  // Check cache
  const cached = requestCache.get(normalizedWord);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    // Use background service worker to send request
    const response = await chrome.runtime.sendMessage({
      type: 'LOOKUP_WORD',
      word: normalizedWord,
      api: 'iciba'
    });
    
    if (!response.success) {
      return null;
    }
    
    const parsed = parseIcibaResponse(response.data, normalizedWord);
    
    // Cache result
    requestCache.set(normalizedWord, { data: parsed, timestamp: Date.now() });
    
    return parsed;
  } catch (error) {
    console.error('[Dictionary API] Error:', error);
    return null;
  }
}

/**
 * Parse iciba API response
 * @param {object} data - API response
 * @param {string} word - Original word
 * @returns {object} Parsed dictionary data
 */
function parseIcibaResponse(data, word) {
  if (!data || data.errno !== 0) {
    return null;
  }
  
  const symbols = data.symbols?.[0] || {};
  const baseInfo = data.baseInfo || {};
  
  return {
    word: word,
    phonetic: symbols.ph_en ? `/${symbols.ph_en}/` : (symbols.ph_am ? `/${symbols.ph_am}/` : ''),
    phoneticUS: symbols.ph_am ? `/${symbols.ph_am}/` : '',
    phoneticUK: symbols.ph_en ? `/${symbols.ph_en}/` : '',
    audioUS: symbols.ph_am_mp3 || '',
    audioUK: symbols.ph_en_mp3 || '',
    meanings: parseMeanings(symbols.parts),
    translation: baseInfo.translate_result || '',
    exchange: data.exchange || {},
    // Additional info
    collins: data.collins || null,
    oxford: data.oxford || null
  };
}

/**
 * Parse meanings from iciba response
 * @param {Array} parts - Parts array from API
 * @returns {Array} Formatted meanings
 */
function parseMeanings(parts) {
  if (!parts || !Array.isArray(parts)) {
    return [];
  }
  
  return parts.map(part => ({
    partOfSpeech: part.part || '',
    definitions: (part.means || []).map(mean => ({
      definition: mean.word_mean || mean,
      chinese: mean.word_mean || mean,
      example: null
    }))
  }));
}

/**
 * Get phonetic only (simplified)
 * @param {string} word - Word
 * @returns {Promise<string|null>} Phonetic notation
 */
export async function getPhonetic(word) {
  const data = await lookupWord(word);
  return data ? data.phonetic : null;
}

/**
 * Clear cache
 */
export function clearCache() {
  requestCache.clear();
}
