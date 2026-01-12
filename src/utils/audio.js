/**
 * 音频工具函数
 * PCM 转 WAV 和音频播放
 */

/**
 * 将 PCM 数据转换为 WAV 格式
 * @param {ArrayBuffer} pcmData PCM 音频数据
 * @param {number} sampleRate 采样率
 * @param {number} numChannels 声道数
 * @param {number} bitsPerSample 位深
 * @returns {ArrayBuffer} WAV 格式数据
 */
export function pcmToWav(pcmData, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const pcmBytes = new Uint8Array(pcmData);
  const wavHeader = createWavHeader(pcmBytes.length, sampleRate, numChannels, bitsPerSample);
  
  const wavBuffer = new ArrayBuffer(44 + pcmBytes.length);
  const wavView = new Uint8Array(wavBuffer);
  
  wavView.set(new Uint8Array(wavHeader), 0);
  wavView.set(pcmBytes, 44);
  
  return wavBuffer;
}

/**
 * 创建 WAV 文件头
 * @param {number} dataLength PCM 数据长度
 * @param {number} sampleRate 采样率
 * @param {number} numChannels 声道数
 * @param {number} bitsPerSample 位深
 * @returns {ArrayBuffer} WAV 头部
 */
function createWavHeader(dataLength, sampleRate, numChannels, bitsPerSample) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  
  // RIFF 标识
  writeString(view, 0, 'RIFF');
  // 文件大小 - 8
  view.setUint32(4, 36 + dataLength, true);
  // WAVE 标识
  writeString(view, 8, 'WAVE');
  // fmt 子块标识
  writeString(view, 12, 'fmt ');
  // fmt 子块大小
  view.setUint32(16, 16, true);
  // 音频格式 (1 = PCM)
  view.setUint16(20, 1, true);
  // 声道数
  view.setUint16(22, numChannels, true);
  // 采样率
  view.setUint32(24, sampleRate, true);
  // 字节率
  view.setUint32(28, byteRate, true);
  // 块对齐
  view.setUint16(32, blockAlign, true);
  // 位深
  view.setUint16(34, bitsPerSample, true);
  // data 子块标识
  writeString(view, 36, 'data');
  // data 子块大小
  view.setUint32(40, dataLength, true);
  
  return header;
}

/**
 * 写入字符串到 DataView
 * @param {DataView} view DataView
 * @param {number} offset 偏移
 * @param {string} string 字符串
 */
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * 播放音频
 * @param {ArrayBuffer | Blob | string} audioData 音频数据或 URL
 * @returns {Promise<void>}
 */
export function playAudio(audioData) {
  return new Promise((resolve, reject) => {
    let audio;
    
    if (typeof audioData === 'string') {
      // URL
      audio = new Audio(audioData);
    } else if (audioData instanceof Blob) {
      audio = new Audio(URL.createObjectURL(audioData));
    } else if (audioData instanceof ArrayBuffer) {
      const blob = new Blob([audioData], { type: 'audio/wav' });
      audio = new Audio(URL.createObjectURL(blob));
    } else {
      reject(new Error('Unsupported audio data type'));
      return;
    }
    
    audio.onended = () => {
      if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
      resolve();
    };
    
    audio.onerror = (error) => {
      if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
      reject(error);
    };
    
    audio.play().catch(reject);
  });
}

/**
 * 使用 Web Speech API 朗读文本（备用方案）
 * @param {string} text 要朗读的文本
 * @param {object} options 选项
 * @returns {Promise<void>}
 */
export function speakWithWebSpeech(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Web Speech API not supported'));
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    
    // 选择英语语音
    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(event.error));
    
    speechSynthesis.speak(utterance);
  });
}

/**
 * 停止所有正在播放的语音
 */
export function stopSpeaking() {
  if (window.speechSynthesis) {
    speechSynthesis.cancel();
  }
}

/**
 * Base64 转 ArrayBuffer
 * @param {string} base64 Base64 字符串
 * @returns {ArrayBuffer}
 */
export function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
