/**
 * Browser-compatible IPA Converter
 * Uses pre-loaded IPA dictionary (no Node.js dependencies)
 */

// IPA dictionary will be loaded dynamically
let ipaDict = null;

/**
 * Load IPA dictionary
 */
async function loadDictionary() {
  if (ipaDict) return ipaDict;
  
  try {
    // Try to load from generated dict first
    const response = await fetch(chrome.runtime.getURL('src/data/ipa-dict.json'));
    if (response.ok) {
      ipaDict = await response.json();
      console.log(`[IPA Converter] Loaded ${Object.keys(ipaDict).length} words`);
      return ipaDict;
    }
  } catch (error) {
    console.warn('[IPA Converter] Could not load ipa-dict.json, will use empty dict');
  }
  
  // Fallback to empty dict
  ipaDict = {};
  return ipaDict;
}

/**
 * Convert English word to IPA (browser-compatible)
 * @param {string} word - English word
 * @returns {Promise<string|null>} IPA notation or null
 */
export async function wordToIPA(word) {
  const dict = await loadDictionary();
  const normalized = word.toLowerCase().replace(/[^a-z'-]/g, '');
  
  if (!normalized) return null;
  
  return dict[normalized] || null;
}

/**
 * Synchronous version (returns null if dict not loaded)
 * @param {string} word - English word
 * @returns {string|null} IPA notation or null
 */
export function wordToIPASync(word) {
  if (!ipaDict) return null;
  
  const normalized = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!normalized) return null;
  
  return ipaDict[normalized] || null;
}

/**
 * Convert English text to IPA
 * @param {string} text - English text
 * @returns {Promise<Map<string, string>>} Map of word -> IPA
 */
export async function textToIPA(text) {
  const dict = await loadDictionary();
  const words = text.match(/\b[a-zA-Z'-]+\b/g) || [];
  const results = new Map();
  
  words.forEach(word => {
    const lower = word.toLowerCase();
    if (!results.has(lower) && dict[lower]) {
      results.set(lower, dict[lower]);
    }
  });
  
  return results;
}

/**
 * Check if word exists in dictionary
 * @param {string} word - English word
 * @returns {Promise<boolean>}
 */
export async function hasWord(word) {
  const dict = await loadDictionary();
  const normalized = word.toLowerCase().replace(/[^a-z'-]/g, '');
  return !!dict[normalized];
}

// Pre-load dictionary when module loads
loadDictionary();
