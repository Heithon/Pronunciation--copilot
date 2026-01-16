/**
 * IPA Converter for Browser Extension
 * Uses mass-ipa library with full dictionary support (core + lazy-loaded chunks)
 */

import { COMMON_PHONETICS } from '../data/common-phonetics.js';
import { getIPA, getIPASync, hasWord as hasWordCore, hasWordFull, getIPABatch, initMassIPA, getStats } from './mass-ipa-adapter.js';

/**
 * Convert English word to IPA (synchronous - core dictionary only)
 * Fast lookup for common words (50k most frequent)
 * @param {string} word - English word
 * @returns {string|null} IPA notation or null
 */
export function wordToIPASync(word) {
  const normalized = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!normalized) return null;
  
  // Check common phonetics first (for user-specific overrides)
  if (COMMON_PHONETICS[normalized]) {
    return COMMON_PHONETICS[normalized];
  }
  
  // Use mass-ipa core dictionary
  return getIPASync(normalized);
}

/**
 * Convert English word to IPA (async - full dictionary)
 * Includes rare words via lazy-loaded chunks
 * @param {string} word - English word
 * @returns {Promise<string|null>} IPA notation or null
 */
export async function wordToIPA(word) {
  const normalized = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!normalized) return null;
  
  // Check common phonetics first
  if (COMMON_PHONETICS[normalized]) {
    return COMMON_PHONETICS[normalized];
  }
  
  // Use mass-ipa full dictionary (with chunk loading)
  return await getIPA(normalized);
}

/**
 * Convert English text to IPA
 * Processes multiple words efficiently
 * @param {string} text - English text
 * @returns {Promise<Map<string, string>>} Map of word -> IPA
 */
export async function textToIPA(text) {
  const words = text.match(/\b[a-zA-Z'-]+\b/g) || [];
  const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
  const results = new Map();
  
  // Process words in batch
  for (const word of uniqueWords) {
    const normalized = word.replace(/[^a-z'-]/g, '');
    if (!normalized) continue;
    
    // Check override dictionary first
    if (COMMON_PHONETICS[normalized]) {
      results.set(word, COMMON_PHONETICS[normalized]);
    } else {
      // Use async lookup for full coverage
      const ipa = await getIPA(normalized);
      if (ipa) {
        results.set(word, ipa);
      }
    }
  }
  
  return results;
}

/**
 * Check if word exists in dictionary (synchronous - core only)
 * @param {string} word - English word
 * @returns {boolean}
 */
export function hasWordSync(word) {
  const normalized = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!normalized) return false;
  
  if (COMMON_PHONETICS[normalized]) {
    return true;
  }
  
  return hasWordCore(normalized);
}

/**
 * Check if word exists in full dictionary (async - core + chunks)
 * @param {string} word - English word
 * @returns {Promise<boolean>}
 */
export async function hasWordInDictionary(word) {
  const normalized = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!normalized) return false;
  
  if (COMMON_PHONETICS[normalized]) {
    return true;
  }
  
  return await hasWordFull(normalized);
}

/**
 * Get dictionary statistics
 * @returns {Object} Statistics about loaded dictionaries
 */
export function getDictionaryStats() {
  const massIpaStats = getStats();
  return {
    commonPhoneticsSize: Object.keys(COMMON_PHONETICS).length,
    massIpaCoreSize: massIpaStats.coreSize,
    massIpaCachedChunks: massIpaStats.cachedChunks,
    massIpaTotalChunks: massIpaStats.totalChunks
  };
}

/**
 * Initialize the IPA converter
 * Pre-loads core dictionary for better performance
 * @returns {Promise<void>}
 */
export async function initIPAConverter() {
  await initMassIPA();
  console.log('[IPA Converter] Initialized with stats:', getDictionaryStats());
}

// Legacy export for backward compatibility
export const hasWord = hasWordInDictionary;

// Auto-initialize when module loads
initIPAConverter().catch(err => {
  console.error('[IPA Converter] Initialization failed:', err);
});

