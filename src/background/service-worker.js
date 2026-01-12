/**
 * Service Worker - Extension Background Script
 * 处理来自 Content Script 的消息，集成 Gemini API
 */

import { analyzeWordInContext, textToSpeech, validateApiKey } from '../api/gemini.js';

// 监听来自 Content Script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(error => {
    console.error('[Service Worker] Error:', error);
    sendResponse({ error: error.message });
  });
  return true; // 保持消息通道打开
});

// 监听长连接 (用于流式传输)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'AI_STREAM') {
    port.onMessage.addListener((message) => {
      if (message.type === 'START_ANALYZE') {
        handleAIAnalyzeStream(port, message);
      }
    });
  }
});

/**
 * 处理消息
 * @param {object} message 消息
 * @param {object} sender 发送者
 * @returns {Promise<object>} 响应
 */
async function handleMessage(message, sender) {
  switch (message.type) {
    case 'AI_ANALYZE':
      return handleAIAnalyze(message);
    
    case 'TTS':
      return handleTTS(message);
    
    case 'LOOKUP_WORD':
      return handleLookupWord(message);
    
    case 'VALIDATE_API_KEY':
      return handleValidateApiKey(message);
    
    case 'GET_SETTINGS':
      return handleGetSettings();
    
    case 'SAVE_SETTINGS':
      return handleSaveSettings(message);
    
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

/**
 * 处理 AI 分析请求 (单次响应 - 旧兼容)
 */
async function handleAIAnalyze({ word, sentence }) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API Key not configured. Please set it in extension options.');
  }
  
  const result = await analyzeWordInContext(apiKey, word, sentence);
  return { success: true, data: result };
}

/**
 * 处理 AI 分析请求 (流式响应)
 */
async function handleAIAnalyzeStream(port, { word, sentence }) {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      port.postMessage({ type: 'ERROR', error: 'API Key not configured. Please set it in extension options.' });
      return;
    }

    const result = await analyzeWordInContext(apiKey, word, sentence, (chunk) => {
      // 发送流式片段
      port.postMessage({ type: 'CHUNK', text: chunk });
    });

    // 发送最终结果
    port.postMessage({ type: 'COMPLETE', data: result });
  } catch (error) {
    console.error('[Service Worker] Stream Error:', error);
    port.postMessage({ type: 'ERROR', error: error.message });
  }
}

/**
 * 处理 TTS 请求
 */
async function handleTTS({ text, options = {} }) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API Key not configured. Please set it in extension options.');
  }
  
  try {
    const audioData = await textToSpeech(apiKey, text, options);
    // 将 ArrayBuffer 转为 Base64 以便传输
    const base64 = arrayBufferToBase64(audioData);
    return { success: true, audio: base64 };
  } catch (error) {
    // TTS 失败时，返回错误让客户端使用 Web Speech API 作为备用
    return { success: false, error: error.message, fallbackToWebSpeech: true };
  }
}

/**
 * 处理词典查询请求（通过后台避免 CORS）
 */
async function handleLookupWord({ word, api = 'iciba' }) {
  try {
    let url;
    
    if (api === 'iciba') {
      // iciba API for English-Chinese
      url = `https://dict-co.iciba.com/api/dictionary.php?w=${encodeURIComponent(word)}&type=json&key=YOURAPIKEY`;
    } else {
      // Free Dictionary API  (fallback)
      url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, notFound: true };
      }
      throw new Error(`Dictionary API error: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[Dictionary] Lookup error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 验证 API Key
 */
async function handleValidateApiKey({ apiKey }) {
  const isValid = await validateApiKey(apiKey);
  return { success: true, valid: isValid };
}

/**
 * 获取设置
 */
async function handleGetSettings() {
  const result = await chrome.storage.local.get(['settings', 'gemini_api_key']);
  return {
    success: true,
    settings: result.settings || getDefaultSettings(),
    hasApiKey: !!result.gemini_api_key
  };
}

/**
 * 保存设置
 */
async function handleSaveSettings({ settings, apiKey }) {
  const updates = {};
  if (settings) {
    updates.settings = settings;
  }
  if (apiKey !== undefined) {
    updates.gemini_api_key = apiKey;
  }
  await chrome.storage.local.set(updates);
  return { success: true };
}

/**
 * 获取 API Key
 */
async function getApiKey() {
  const result = await chrome.storage.local.get('gemini_api_key');
  return result.gemini_api_key || null;
}

/**
 * 默认设置
 */
function getDefaultSettings() {
  return {
    enablePhonetics: true,
    enableDictionary: true,
    enableTTS: true,
    theme: 'auto',
    fontSize: 'medium',
    ttsSpeed: 1.0
  };
}

/**
 * ArrayBuffer 转 Base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 安装时初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('[English Learning Helper] Extension installed');
});
