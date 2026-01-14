/**
 * Service Worker - Extension Background Script
 * 处理来自 Content Script 的消息，集成 Gemini API
 */

import { analyzeWordInContext, textToSpeech, validateApiKey } from '../api/gemini.js';
import { md5 } from '../utils/md5.js';

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

    case 'SAVE_API_KEY':
      return handleSaveApiKey(message);
    
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
async function handleLookupWord({ word, api = 'freedict' }) {
  console.log('[Service Worker] handleLookupWord called:', { word, api });
  
  try {
    if (api === 'baidu') {
      console.log('[Service Worker] Using Baidu API');
      
      // 百度翻译API
      const settings = await chrome.storage.local.get(['baiduAppId', 'baiduSecret']);
      console.log('[Service Worker] Baidu settings loaded:', { 
        hasAppId: !!settings.baiduAppId, 
        hasSecret: !!settings.baiduSecret 
      });
      
      if (!settings.baiduAppId || !settings.baiduSecret) {
        console.error('[Service Worker] Baidu credentials missing');
        return { 
          success: false, 
          error: '请先在设置页面配置百度翻译API密钥' 
        };
      }
      
      // 使用百度API（md5已在顶部导入）
      const appid = settings.baiduAppId;
      const key = settings.baiduSecret;
      const salt = Date.now().toString();
      
      // 生成签名：MD5(appid+q+salt+密钥)
      const signString = appid + word + salt + key;
      const sign = md5(signString);
      
      console.log('[Service Worker] ========== 百度API签名调试 ==========');
      console.log('[Service Worker] APP ID:', appid);
      console.log('[Service Worker] 查询词:', word);
      console.log('[Service Worker] Salt:', salt);
      console.log('[Service Worker] 密钥:', key.substring(0, 4) + '****' + key.substring(key.length - 4));
      console.log('[Service Worker] 签名字符串:', signString);
      console.log('[Service Worker] MD5签名:', sign);
      console.log('[Service Worker] ==========================================');
      
      const params = new URLSearchParams({
        q: word,
        from: 'en',
        to: 'zh',
        appid: appid,
        salt: salt,
        sign: sign
      });
      
      const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?${params.toString()}`;
      console.log('[Service Worker] Fetching:', url);
      
      const response = await fetch(url);
      console.log('[Service Worker] Fetch response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Baidu API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[Service Worker] Baidu API response:', data);
      
      if (data.error_code) {
        console.error('[Service Worker] Baidu API error:', data);
        return {
          success: false,
          error: `百度API错误 ${data.error_code}: ${data.error_msg || '未知错误'}`
        };
      }
      
      return { success: true, data };
    } else {
      console.log('[Service Worker] Using Free Dictionary API');
      
      // 使用 Free Dictionary API (完全免费，无需 API key)
      const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, notFound: true };
        }
        throw new Error(`Dictionary API error: ${response.status}`);
      }
      
      const data = await response.json();
      return { success: true, data };
    }
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
 * 保存 API Key (带验证)
 */
async function handleSaveApiKey({ apiKey }) {
  try {
    const isValid = await validateApiKey(apiKey);
    if (isValid) {
      await chrome.storage.local.set({ gemini_api_key: apiKey });
      return { success: true };
    } else {
      return { success: false, error: 'API Key 验证失败，请检查是否正确' };
    }
  } catch (error) {
    console.error('API Key validation error:', error);
    return { success: false, error: error.message };
  }
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
