/**
 * Chrome Storage API 封装
 * 提供设置管理和缓存功能
 */

const STORAGE_KEYS = {
  API_KEY: "gemini_api_key",
  SETTINGS: "settings",
  PHONETICS_CACHE: "phonetics_cache",
};

const DEFAULT_SETTINGS = {
  enablePhonetics: true,
  enableDictionary: true,
  enableTTS: true,
  theme: "auto", // 'light', 'dark', 'auto'
  fontSize: "medium", // 'small', 'medium', 'large'
  ttsSpeed: 1.0,
  maxCacheSize: 1000,
};

/**
 * 获取存储的值
 * @param {string} key 存储键
 * @param {*} defaultValue 默认值
 * @returns {Promise<*>}
 */
export async function get(key, defaultValue = null) {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
  } catch (error) {
    console.error("[Storage] Get error:", error);
    return defaultValue;
  }
}

/**
 * 设置存储值
 * @param {string} key 存储键
 * @param {*} value 值
 * @returns {Promise<void>}
 */
export async function set(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.error("[Storage] Set error:", error);
    throw error;
  }
}

/**
 * 删除存储值
 * @param {string} key 存储键
 * @returns {Promise<void>}
 */
export async function remove(key) {
  try {
    await chrome.storage.local.remove(key);
  } catch (error) {
    console.error("[Storage] Remove error:", error);
    throw error;
  }
}

/**
 * 获取 Gemini API Key
 * @returns {Promise<string|null>}
 */
export async function getApiKey() {
  return get(STORAGE_KEYS.API_KEY, null);
}

/**
 * 设置 Gemini API Key
 * @param {string} apiKey
 * @returns {Promise<void>}
 */
export async function setApiKey(apiKey) {
  return set(STORAGE_KEYS.API_KEY, apiKey);
}

/**
 * 获取用户设置
 * @returns {Promise<object>}
 */
export async function getSettings() {
  const settings = await get(STORAGE_KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...settings };
}

/**
 * 更新用户设置
 * @param {object} updates 要更新的设置
 * @returns {Promise<void>}
 */
export async function updateSettings(updates) {
  const current = await getSettings();
  const newSettings = { ...current, ...updates };
  return set(STORAGE_KEYS.SETTINGS, newSettings);
}

/**
 * 获取音标缓存
 * @returns {Promise<object>}
 */
export async function getPhoneticsCache() {
  return get(STORAGE_KEYS.PHONETICS_CACHE, {});
}

/**
 * 更新音标缓存
 * @param {string} word 单词
 * @param {object} data 音标数据
 * @returns {Promise<void>}
 */
export async function cachePhoneticsData(word, data) {
  const cache = await getPhoneticsCache();
  const settings = await getSettings();

  // 如果缓存已满，删除最旧的条目
  const keys = Object.keys(cache);
  if (keys.length >= settings.maxCacheSize) {
    delete cache[keys[0]];
  }

  cache[word.toLowerCase()] = {
    data,
    timestamp: Date.now(),
  };

  return set(STORAGE_KEYS.PHONETICS_CACHE, cache);
}

/**
 * 从缓存获取音标数据
 * @param {string} word 单词
 * @returns {Promise<object|null>}
 */
export async function getCachedPhonetics(word) {
  const cache = await getPhoneticsCache();
  const entry = cache[word.toLowerCase()];

  if (!entry) return null;

  // 缓存有效期 7 天
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - entry.timestamp > maxAge) {
    return null;
  }

  return entry.data;
}

export { STORAGE_KEYS, DEFAULT_SETTINGS };
