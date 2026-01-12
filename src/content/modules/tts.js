/**
 * TTS 模块
 * 处理文字转语音功能
 */

import { playAudio, speakWithWebSpeech, base64ToArrayBuffer } from '../../utils/audio.js';

// 当前播放状态
let isPlaying = false;

/**
 * 请求 TTS 朗读
 * @param {string} text 要朗读的文本
 * @param {object} options 选项
 */
export async function requestTTS(text, options = {}) {
  if (isPlaying) {
    console.log('[TTS] Already playing');
    return;
  }
  
  if (!text || text.trim().length === 0) {
    console.warn('[TTS] Empty text');
    return;
  }
  
  isPlaying = true;
  
  try {
    // 尝试使用 Gemini TTS
    const response = await chrome.runtime.sendMessage({
      type: 'TTS',
      text: text.trim(),
      options
    });
    
    if (response.success && response.audio) {
      // 解码并播放音频
      const audioBuffer = base64ToArrayBuffer(response.audio);
      await playAudio(audioBuffer);
    } else if (response.fallbackToWebSpeech) {
      // 使用 Web Speech API 作为备用
      console.log('[TTS] Falling back to Web Speech API');
      await speakWithWebSpeech(text, {
        rate: options.speed || 1.0
      });
    } else if (response.error) {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('[TTS] Error:', error);
    
    // 尝试使用 Web Speech API
    try {
      console.log('[TTS] Attempting Web Speech API fallback');
      await speakWithWebSpeech(text, {
        rate: options.speed || 1.0
      });
    } catch (fallbackError) {
      console.error('[TTS] Web Speech fallback also failed:', fallbackError);
      throw error;
    }
  } finally {
    isPlaying = false;
  }
}

/**
 * 检查 TTS 是否可用
 * @returns {Promise<{gemini: boolean, webSpeech: boolean}>}
 */
export async function checkTTSAvailability() {
  const result = {
    gemini: false,
    webSpeech: 'speechSynthesis' in window
  };
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SETTINGS'
    });
    result.gemini = response.hasApiKey;
  } catch (error) {
    console.error('[TTS] Error checking availability:', error);
  }
  
  return result;
}

/**
 * 获取当前播放状态
 * @returns {boolean}
 */
export function getPlayingState() {
  return isPlaying;
}
