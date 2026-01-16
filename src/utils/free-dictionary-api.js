/**
 * Free Dictionary API Helper
 * Fetches IPA pronunciation from thefreedictionary API as a fallback
 */

// Cache for API results to avoid repeated queries
const apiCache = new Map();
const MAX_CACHE_SIZE = 1000;

/**
 * Query Free Dictionary API for IPA pronunciation
 * @param {string} word - Word to look up
 * @returns {Promise<string|null>} IPA pronunciation or null
 */
export async function queryFreeDictionary(word) {
  const normalized = word.toLowerCase().trim();
  
  // Check cache first
  if (apiCache.has(normalized)) {
    return apiCache.get(normalized);
  }
  
  try {
    // Free Dictionary API
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      // Add timeout
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) {
      // Word not found or API error
      apiCache.set(normalized, null);
      return null;
    }
    
    const data = await response.json();
    
    // Extract IPA from response
    if (Array.isArray(data) && data.length > 0) {
      const entry = data[0];
      
      // Try to get IPA from phonetics array
      if (entry.phonetics && Array.isArray(entry.phonetics)) {
        for (const phonetic of entry.phonetics) {
          if (phonetic.text) {
            let ipa = phonetic.text.trim();
            
            // Ensure it's wrapped in slashes
            if (!ipa.startsWith('/')) {
              ipa = '/' + ipa;
            }
            if (!ipa.endsWith('/')) {
              ipa = ipa + '/';
            }
            
            // Cache the result
            cacheResult(normalized, ipa);
            
            return ipa;
          }
        }
      }
      
      // Also check if there's a direct phonetic field
      if (entry.phonetic) {
        let ipa = entry.phonetic.trim();
        if (!ipa.startsWith('/')) {
          ipa = '/' + ipa;
        }
        if (!ipa.endsWith('/')) {
          ipa = ipa + '/';
        }
        
        cacheResult(normalized, ipa);
        return ipa;
      }
    }
    
    // No IPA found
    cacheResult(normalized, null);
    return null;
    
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.warn(`[Free Dictionary] Timeout querying "${word}"`);
    } else if (error.name === 'AbortError') {
      console.warn(`[Free Dictionary] Request aborted for "${word}"`);
    } else {
      console.warn(`[Free Dictionary] Error querying "${word}":`, error.message);
    }
    
    // Cache null result to avoid repeated failed queries
    cacheResult(normalized, null);
    return null;
  }
}

/**
 * Cache a result with size limit
 */
function cacheResult(word, ipa) {
  // Simple LRU-like cache management
  if (apiCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (first key)
    const firstKey = apiCache.keys().next().value;
    apiCache.delete(firstKey);
  }
  
  apiCache.set(word, ipa);
}

/**
 * Clear the API cache
 */
export function clearAPICache() {
  apiCache.clear();
}

/**
 * Get cache statistics
 */
export function getAPICacheStats() {
  return {
    size: apiCache.size,
    maxSize: MAX_CACHE_SIZE
  };
}
