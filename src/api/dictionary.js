/**
 * English Dictionary API Integration
 * Uses Free Dictionary API (completely free, no API key required)
 * Provides English definitions, phonetics, and audio
 */

// Free Dictionary API endpoint
const FREE_DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// Request cache
const requestCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Lookup word using selected dictionary API
 * @param {string} word - Word to lookup
 * @param {string} apiType - API type ('freedict' or 'baidu')
 * @returns {Promise<object|null>} Dictionary data
 */
export async function lookupWord(word, apiType = null) {
  const normalizedWord = word.toLowerCase().trim();
  
  if (!normalizedWord || !/^[a-zA-Z'-]+$/.test(normalizedWord)) {
    return null;
  }
  
  // Get API type from settings if not specified
  if (!apiType) {
    const settings = await chrome.storage.local.get('settings');
    apiType = settings.settings?.dictionaryAPI || 'freedict';
    console.log('[Dictionary API] Using API type from settings:', apiType);
  } else {
    console.log('[Dictionary API] Using specified API type:', apiType);
  }
  
  // Check cache
  const cacheKey = `${apiType}_${normalizedWord}`;
  const cached = requestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    console.log('[Dictionary API] Sending lookup request:', { word: normalizedWord, api: apiType });
    
    // Use background service worker to send request
    const response = await chrome.runtime.sendMessage({
      type: 'LOOKUP_WORD',
      word: normalizedWord,
      api: apiType
    });
    
    console.log('[Dictionary API] Response received:', response);
    
    if (!response.success) {
      console.log('[Dictionary] Lookup failed:', response.error);
      return null;
    }
    
    const parsed = apiType === 'baidu' 
      ? parseBaiduResponse(response.data, normalizedWord)
      : parseFreeDictResponse(response.data, normalizedWord);
    
    // Cache result
    requestCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
    
    return parsed;
  } catch (error) {
    console.error('[Dictionary API] Error:', error);
    return null;
  }
}

/**
 * Parse Free Dictionary API response
 * @param {Array} data - API response (array of entries)
 * @param {string} word - Original word
 * @returns {object|null} Parsed dictionary data
 */
function parseFreeDictResponse(data, word) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  
  const entry = data[0];
  
  // Extract phonetics
  const phonetics = entry.phonetics || [];
  const usPhonetic = phonetics.find(p => p.audio && p.audio.includes('-us.')) || {};
  const ukPhonetic = phonetics.find(p => p.audio && p.audio.includes('-uk.')) || {};
  const anyPhonetic = phonetics.find(p => p.text) || {};
  
  // Extract meanings
  const meanings = (entry.meanings || []).map(m => ({
    partOfSpeech: m.partOfSpeech || '',
    definitions: (m.definitions || []).slice(0, 5).map(d => ({
      definition: d.definition || '',
      example: d.example || null,
      synonyms: d.synonyms || []
    }))
  }));
  
  return {
    word: entry.word || word,
    phonetic: entry.phonetic || anyPhonetic.text || '',
    phoneticUS: usPhonetic.text || entry.phonetic || '',
    phoneticUK: ukPhonetic.text || entry.phonetic || '',
    audioUS: usPhonetic.audio || '',
    audioUK: ukPhonetic.audio || '',
    meanings: meanings,
    sourceUrl: entry.sourceUrls?.[0] || '',
    // Note: Free Dictionary API provides English definitions only
    // No Chinese translation available
    language: 'en'
  };
}

/**
 * Get phonetic only (simplified)
 * @param {string} word - Word
 * @returns {Promise<string|null>} Phonetic notation
 */
export async function getPhonetic(word) {
  const data = await lookupWord(word, 'freedict'); // Always use FreeDictionary for phonetics
  return data ? data.phonetic : null;
}

/**
 * Parse Baidu translation response
 * @param {object} data - Baidu API response
 * @param {string} word - Original word
 * @returns {object|null} Parsed dictionary data
 */
function parseBaiduResponse(data, word) {
  if (!data || !data.trans_result || !Array.isArray(data.trans_result)) {
    return null;
  }
  
  const translations = data.trans_result.map(t => t.dst).join('; ');
  
  return {
    word: word,
    phonetic: '', // Baidu doesn't provide phonetics
    phoneticUS: '',
    phoneticUK: '',
    audioUS: '',
    audioUK: '',
    meanings: [{
      partOfSpeech: '',
      definitions: [{
        definition: translations,
        chinese: translations,
        example: null
      }]
    }],
    translation: translations,
    language: 'zh',
    source: 'baidu'
  };
}

/**
 * Clear cache
 */
export function clearCache() {
  requestCache.clear();
}
