/**
 * Baidu Translation API Integration
 * Official Doc: https://fanyi-api.baidu.com/doc/21
 */

import { md5 } from '../utils/md5.js';

const BAIDU_API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

/**
 * Call Baidu Translation API
 * @param {string} query - Text to translate
 * @param {string} appid - Baidu APP ID
 * @param {string} key - Baidu Secret Key
 * @param {string} from - Source language (default: 'en')
 * @param {string} to - Target language (default: 'zh')
 * @returns {Promise<object>} Translation result
 */
export async function translateWithBaidu(query, appid, key, from = 'en', to = 'zh') {
  if (!appid || !key) {
    throw new Error('Baidu API credentials not configured');
  }
  
  // Generate salt (random number)
  const salt = Date.now().toString();
  
  // Generate sign: MD5(appid + query + salt + key)
  const sign = md5(appid + query + salt + key);
  
  // Build URL with parameters
  const params = new URLSearchParams({
    q: query,
    from: from,
    to: to,
    appid: appid,
    salt: salt,
    sign: sign
  });
  
  const url = `${BAIDU_API_URL}?${params.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Baidu API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.error_code) {
      throw new Error(`Baidu API error ${data.error_code}: ${data.error_msg || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    console.error('[Baidu API] Error:', error);
    throw error;
  }
}

/**
 * Parse Baidu translation response to dictionary format
 * @param {object} data - Baidu API response
 * @param {string} word - Original word
 * @returns {object} Parsed dictionary data
 */
export function parseBaiduResponse(data, word) {
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
