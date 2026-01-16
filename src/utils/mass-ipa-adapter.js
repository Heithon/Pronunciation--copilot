/**
 * Mass-IPA Browser Extension Adapter
 * 
 * Provides a browser extension compatible wrapper for mass-ipa library.
 * Handles chunk loading using chrome.runtime.getURL() instead of regular fetch paths.
 */

// Core dictionary data (will be loaded at initialization)
let coreData = null;
let chunkIndex = null;
const chunkCache = new Map();

/**
 * Load core dictionary from extension resources
 */
async function loadCoreData() {
  if (coreData) return coreData;
  
  try {
    const url = chrome.runtime.getURL('mass-ipa-data/core.json');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load core.json: ${response.status}`);
    }
    coreData = await response.json();
    console.log(`[Mass-IPA] Loaded ${Object.keys(coreData).length} words from core dictionary`);
    return coreData;
  } catch (error) {
    console.error('[Mass-IPA] Error loading core data:', error);
    coreData = {};
    return coreData;
  }
}

/**
 * Load chunk index from extension resources
 */
async function loadChunkIndex() {
  if (chunkIndex) return chunkIndex;
  
  try {
    const url = chrome.runtime.getURL('mass-ipa-data/chunk-index.json');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load chunk-index.json: ${response.status}`);
    }
    chunkIndex = await response.json();
    console.log(`[Mass-IPA] Loaded chunk index with ${Object.keys(chunkIndex).length} chunks`);
    return chunkIndex;
  } catch (error) {
    console.error('[Mass-IPA] Error loading chunk index:', error);
    chunkIndex = {};
    return chunkIndex;
  }
}

/**
 * Find which chunk contains a given word
 * @param {string} word - Normalized word to find
 * @returns {Promise<string|null>} Chunk ID or null
 */
async function findChunkForWord(word) {
  const index = await loadChunkIndex();
  
  // Search through chunks to find the right one
  for (const [chunkId, info] of Object.entries(index)) {
    if (word >= info.start && word <= info.end) {
      return chunkId;
    }
  }
  
  return null;
}

/**
 * Load a specific chunk by ID
 * @param {string} chunkId - Chunk identifier (e.g., "chunk-01")
 * @returns {Promise<Object>} Chunk data
 */
async function loadChunk(chunkId) {
  // Check cache first
  if (chunkCache.has(chunkId)) {
    return chunkCache.get(chunkId);
  }
  
  try {
    const url = chrome.runtime.getURL(`mass-ipa-data/chunks/${chunkId}.json`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${chunkId}: ${response.status}`);
    }
    const chunkData = await response.json();
    
    // Cache it
    chunkCache.set(chunkId, chunkData);
    console.log(`[Mass-IPA] Loaded chunk ${chunkId} with ${Object.keys(chunkData).length} words`);
    
    return chunkData;
  } catch (error) {
    console.error(`[Mass-IPA] Error loading chunk ${chunkId}:`, error);
    return {};
  }
}

/**
 * Get IPA pronunciation synchronously from core dictionary
 * @param {string} word - English word
 * @returns {string|null} IPA notation or null
 */
export function getIPASync(word) {
  if (!word || typeof word !== 'string') {
    return null;
  }
  
  if (!coreData) {
    console.warn('[Mass-IPA] Core data not loaded yet, call initMassIPA() first');
    return null;
  }
  
  const normalized = word.toLowerCase().trim();
  return coreData[normalized] || null;
}

/**
 * Get IPA pronunciation from full dictionary (core + chunks)
 * @param {string} word - English word
 * @returns {Promise<string|null>} IPA notation or null
 */
export async function getIPA(word) {
  if (!word || typeof word !== 'string') {
    return null;
  }
  
  const normalized = word.toLowerCase().trim();
  
  // 1. Try core dictionary first (synchronous, fastest)
  await loadCoreData(); // Ensure core is loaded
  if (coreData && coreData[normalized]) {
    return coreData[normalized];
  }
  
  // 2. Find and load the appropriate chunk
  const chunkId = await findChunkForWord(normalized);
  if (!chunkId) {
    return null; // Word not found in any chunk
  }
  
  try {
    const chunkData = await loadChunk(chunkId);
    return chunkData[normalized] || null;
  } catch (error) {
    console.error(`[Mass-IPA] Error loading chunk for word "${word}":`, error);
    return null;
  }
}

/**
 * Check if a word exists in the core dictionary
 * @param {string} word - English word
 * @returns {boolean}
 */
export function hasWord(word) {
  if (!word || typeof word !== 'string' || !coreData) {
    return false;
  }
  
  const normalized = word.toLowerCase().trim();
  return normalized in coreData;
}

/**
 * Check if a word exists in the full dictionary (core + chunks)
 * @param {string} word - English word
 * @returns {Promise<boolean>}
 */
export async function hasWordFull(word) {
  if (!word || typeof word !== 'string') {
    return false;
  }
  
  const normalized = word.toLowerCase().trim();
  
  // Check core first
  await loadCoreData();
  if (coreData && normalized in coreData) {
    return true;
  }
  
  // Check if chunk exists
  const chunkId = await findChunkForWord(normalized);
  if (!chunkId) {
    return false;
  }
  
  // Load chunk and check
  const chunkData = await loadChunk(chunkId);
  return normalized in chunkData;
}

/**
 * Batch lookup multiple words efficiently
 * @param {string[]} words - Array of words to look up
 * @returns {Promise<Map<string, string|null>>} Map of word -> IPA
 */
export async function getIPABatch(words) {
  const results = new Map();
  
  for (const word of words) {
    const ipa = await getIPA(word);
    results.set(word, ipa);
  }
  
  return results;
}

/**
 * Get statistics about loaded data
 * @returns {Object} Stats object
 */
export function getStats() {
  return {
    coreSize: coreData ? Object.keys(coreData).length : 0,
    cachedChunks: chunkCache.size,
    totalChunks: chunkIndex ? Object.keys(chunkIndex).length : 0
  };
}

/**
 * Initialize mass-ipa by pre-loading core dictionary
 * Call this when the extension loads for better performance
 * @returns {Promise<void>}
 */
export async function initMassIPA() {
  await Promise.all([
    loadCoreData(),
    loadChunkIndex()
  ]);
  console.log('[Mass-IPA] Initialization complete:', getStats());
}

/**
 * Clear chunk cache to free memory
 */
export function clearCache() {
  chunkCache.clear();
  console.log('[Mass-IPA] Cache cleared');
}

// Auto-initialize when module is imported
initMassIPA().catch(err => {
  console.error('[Mass-IPA] Auto-initialization failed:', err);
});
