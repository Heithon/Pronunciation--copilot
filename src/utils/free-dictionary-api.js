/**
 * Free Dictionary API Helper
 * Fetches IPA pronunciation from thefreedictionary API as a fallback
 */

// Cache for API results to avoid repeated queries
const apiCache = new Map();
const MAX_CACHE_SIZE = 1000;

// Request queue and throttling
const apiQueue = [];
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 200; // 200ms between requests
const MAX_CONCURRENT_REQUESTS = 3;
let activeRequests = 0;
let isProcessingQueue = false;

/**
 * Process queued API requests with rate limiting
 */
async function processQueue() {
  if (isProcessingQueue || activeRequests >= MAX_CONCURRENT_REQUESTS || apiQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  // Throttle: ensure minimum interval between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    setTimeout(() => {
      isProcessingQueue = false;
      processQueue();
    }, MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest);
    return;
  }
  
  const { word, resolve, reject } = apiQueue.shift();
  activeRequests++;
  lastRequestTime = Date.now();
  
  try {
    const result = await fetchFromAPI(word);
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    isProcessingQueue = false;
    
    // Process next item in queue
    if (apiQueue.length > 0) {
      processQueue();
    }
  }
}

/**
 * Actual API fetch function
 */
async function fetchFromAPI(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(5000)
  });
  
  if (!response.ok) {
    return null;
  }
  
  const data = await response.json();
  
  // Extract IPA from response
  if (Array.isArray(data) && data.length > 0) {
    const entry = data[0];
    
    if (entry.phonetics && Array.isArray(entry.phonetics)) {
      for (const phonetic of entry.phonetics) {
        if (phonetic.text) {
          let ipa = phonetic.text.trim();
          if (!ipa.startsWith('/')) ipa = '/' + ipa;
          if (!ipa.endsWith('/')) ipa = ipa + '/';
          return ipa;
        }
      }
    }
    
    if (entry.phonetic) {
      let ipa = entry.phonetic.trim();
      if (!ipa.startsWith('/')) ipa = '/' + ipa;
      if (!ipa.endsWith('/')) ipa = ipa + '/';
      return ipa;
    }
  }
  
  return null;
}

/**
 * Query Free Dictionary API for IPA pronunciation (with queueing and rate limiting)
 * @param {string} word - Word to look up
 * @returns {Promise<string|null>} IPA pronunciation or null
 */
export async function queryFreeDictionary(word) {
  const normalized = word.toLowerCase().trim();
  
  // Check cache first
  if (apiCache.has(normalized)) {
    return apiCache.get(normalized);
  }
  
  // Add to queue and return promise
  return new Promise((resolve, reject) => {
    apiQueue.push({ word: normalized, resolve, reject });
    processQueue(); // Start processing if not already running
  }).then(result => {
    // Cache the result
    cacheResult(normalized, result);
    return result;
  }).catch(error => {
    // Cache null on error to avoid repeated failed requests
    cacheResult(normalized, null);
    
    if (error.name === 'TimeoutError') {
      console.warn(`[Free Dictionary] Timeout querying "${word}"`);
    } else if (error.name === 'AbortError') {
      console.warn(`[Free Dictionary] Request aborted for "${word}"`);
    } else {
      console.warn(`[Free Dictionary] Error querying "${word}":`, error.message);
    }
    
    return null;
  });
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
