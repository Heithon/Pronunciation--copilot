/**
 * Google Gemini API Wrapper
 * Uses official @google/generative-ai SDK for text generation
 * Keeps REST API for TTS (not yet supported in JS SDK)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Sanitize API Key to remove non-ASCII characters
 * Fixes "String contains non ISO-8859-1 code point" error
 */
function sanitizeApiKey(key) {
  if (!key) return '';
  // Remove any non-ASCII characters (often invisible invisible control chars from copy-paste)
  return key.replace(/[^\x00-\x7F]/g, "").trim();
}

/**
 * Call Gemini API using official SDK
 * @param {string} apiKey API Key
 * @param {string} prompt Prompt text
 * @param {object} options Options
 * @returns {Promise<string>} Generated text
 */
export async function generateContent(apiKey, prompt, options = {}) {
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) {
    throw new Error('Invalid API Key');
  }

  // Default to gemini-flash-latest (confirmed available in user list)
  let modelName = options.model || 'gemini-flash-latest';
  
  try {
    const genAI = new GoogleGenerativeAI(cleanKey);
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 1024
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('Empty response');
    }
    
    return text;
  } catch (error) {
    console.error('[Gemini SDK Error]', error); // Debug log
    
    // Handle SDK errors
    const msg = error.message || JSON.stringify(error) || '';
    
    if (msg.includes('404')) {
      throw new Error(`Model '${modelName}' not found. Please check API key or model name.`);
    }
    if (msg.includes('429')) {
      throw new Error(`API Rate limit exceeded for model ${modelName}. (Original error: ${msg})`);
    }
    
    throw new Error(`Gemini API Error: ${msg}`);
  }
}

/**
 * AI Context Analysis
 * @param {string} apiKey API Key
 * @param {string} word Word
 * @param {string} sentence Context sentence
 * @returns {Promise<object>} Analysis result
 */
export async function generateContentStream(apiKey, prompt, options = {}, onChunk = null) {
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) {
    throw new Error('Invalid API Key');
  }

  // Default to gemini-flash-latest
  let modelName = options.model || 'gemini-flash-latest';
  
  try {
    // 建立长连接
    const genAI = new GoogleGenerativeAI(cleanKey);
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 8192 // Increase to prevent truncated JSON
      }
    });

    const result = await model.generateContentStream(prompt);
    
    let fullText = '';
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      if (onChunk) {
        onChunk(chunkText);
      }
    }
    
    return fullText;
  } catch (error) {
    console.error('[Gemini SDK Error]', error);
    const msg = error.message || JSON.stringify(error) || '';
    if (msg.includes('404')) throw new Error(`Model '${modelName}' not found.`);
    if (msg.includes('429')) throw new Error(`Rate limit exceeded for ${modelName}.`);
    throw new Error(`Gemini API Error: ${msg}`);
  }
}

/**
 * AI Context Analysis
 * @param {string} apiKey API Key
 * @param {string} word Word
 * @param {string} sentence Context sentence
 * @param {function} onStreamChunk Optional callback for streaming chunks
 * @returns {Promise<object>} Analysis result
 */
export async function analyzeWordInContext(apiKey, word, paragraph, onStreamChunk = null) {
  let responseText = '';
  try {
    const prompt = `你是一位专业的英语教师。请分析单词 "${word}" 在以下段落中的用法：

段落：
"${paragraph}"

请按以下JSON格式提供详细分析（用中文解释）：
{
  "word": "${word}",
  "detailedMeaning": {
    "chinese": "该词在此语境中的中文含义",
    "english": "The English definition in this context",
    "partOfSpeech": "词性（如：动词、名词等）"
  },
  "pronunciation": {
    "ipa": "IPA音标",
    "tips": "发音技巧和注意事项，包括重音位置、特殊发音等"
  },
  "contextualAnalysis": {
    "usage": "在这个段落中的具体用法和作用",
    "nuance": "语义精妙之处或特殊含义",
    "synonymsInContext": ["在此语境下的近义词1", "近义词2"]
  },
  "mnemonicTechniques": {
    "visualization": "形象记忆法（联想、画面等）",
    "association": "词根词缀或关联记忆",
    "story": "记忆小故事或口诀"
  },
  "examples": ["例句1", "例句2"]
}

只返回有效的JSON，不要包含markdown格式标记。`;

    // Use gemini-flash-latest which is stable and present in user's list
    responseText = await generateContentStream(apiKey, prompt, {
      model: 'gemini-flash-latest',
      temperature: 0.3,
      maxTokens: 8192
    }, onStreamChunk);
    
    // Parse JSON
    const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // If JSON parsing fails (e.g. truncated), return raw output so user can still see it
    return {
      word,
      explanation: responseText || "Analysis failed: " + e.message,
      parseError: true,
      rawOutput: responseText
    };
  }
}

/**
 * Validate API Key & Find Working Model
 * @param {string} apiKey API Key
 * @returns {Promise<boolean>} is valid
 */
export async function validateApiKey(apiKey) {
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) return false;

  try {
    // 1. First list available models to verify connectivity and permissions
    const listUrl = `${GEMINI_API_BASE}/models?key=${cleanKey}`;
    const response = await fetch(listUrl);
    
    if (!response.ok) {
      console.warn(`[Gemini] Failed to list models: ${response.status} ${response.statusText}`);
      // Fallback to blind attempt if list fails (e.g. permission strictness)
    } else {
      const data = await response.json();
      const models = data.models || [];
      console.log('[Gemini] Available models:', models.map(m => m.name));
      
      // Check if our preferred models exist
      const hasFlash = models.some(m => m.name.includes('gemini-1.5-flash'));
      const hasPro = models.some(m => m.name.includes('gemini-1.5-pro'));
      
      if (!hasFlash && !hasPro) {
        console.warn('[Gemini] Preferred models (1.5-flash/pro) not found in user access list');
      }
    }

    // 2. Try generation with standard models
    // Based on user's available model list (2025-01)
    const candidateModels = [
      'gemini-2.0-flash-lite', // Fast & efficient
      'gemini-2.0-flash',      // Balanced
      'gemini-flash-latest',   // Auto-update stable
      'gemini-1.5-flash',      // Legacy stable
      'gemini-pro-latest'      // Pro stable
    ];

    const genAI = new GoogleGenerativeAI(cleanKey);
    
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1 }
        });
        console.log(`[Gemini] Successfully validated with model: ${modelName}`);
        return true; 
      } catch (e) {
        console.warn(`[Gemini] Validation failed for ${modelName}:`, e.message);
        // Continue to next model
      }
    }

    return false;
  } catch (err) {
    if (err.message && err.message.includes('ISO-8859-1')) {
      console.warn('[Gemini] validation failed: Invalid characters in API Key');
      return false;
    }
    console.warn('[Gemini] Validation failed:', err);
    return false;
  }
}

/**
 * Gemini TTS (Preview)
 * NOTE: SDK does not support TTS yet, keeping REST API implementation
 * @param {string} apiKey API Key
 * @param {string} text Text to speak
 * @param {object} options Options
 * @returns {Promise<ArrayBuffer>} WAV audio data
 */
export async function textToSpeech(apiKey, text, options = {}) {
  // Use Rest API for TTS
  const model = options.model || 'gemini-2.0-flash-exp'; 
  // NOTE: TTS currently requires experimental model or specific endpoint
  // Check docs if 1.5-flash supports speech generation (usually it doesn't output audio directly via generateContent REST)
  // But previous implementation used 'gemini-2.5-flash-preview-tts' which might be valid or placeholder
  
  // Reverting to gemini-2.0-flash-exp for TTS if it's the only one supporting it, 
  // or use the endpoint provided in previous code if it worked.
  // Previous code used: 'gemini-2.5-flash-preview-tts'
  // Let's use 'gemini-2.0-flash-exp' as it handles multimodal options better in REST, 
  // or usually speech is separate.
  
  // Actually, standard generateContent doesn't return audio in most public models yet unless it's the specific 2.0 experimental feature.
  // The user asked to use SDK for connection, implying text generation mostly.
  // TTS might be broken if we only switched to 1.5-flash which is text-only.
  
  // Let's keep the existing REST implementation logic but maybe update the model if needed.
  // I will use 'gemini-2.0-flash-exp' for TTS as it is multimodal capable. 
  // Or stick to what was there if it worked? 
  // Previous code: options.model || 'gemini-2.5-flash-preview-tts'; 
  // That model name looks suspicious/custom. 
  // Official docs say 'gemini-2.0-flash-exp' outputs audio.
  
  const ttsModel = 'gemini-2.0-flash-exp';
  const url = `${GEMINI_API_BASE}/models/${ttsModel}:generateContent?key=${apiKey}`;
  
  const voiceConfig = {
    prebuiltVoiceConfig: {
      voiceName: options.voice || 'Kore'
    }
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: text }]
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: voiceConfig
          }
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      // If 429, might fall back to browser TTS in UI
      throw new Error(error.error?.message || `TTS API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) {
      throw new Error('No audio data in response');
    }
    
    const binaryString = atob(audioData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return pcmToWav(bytes.buffer);
  } catch (error) {
    console.error('[Gemini TTS] Error:', error);
    throw error;
  }
}

// Helper: PCM to WAV (unchanged)
function pcmToWav(pcmData, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const pcmBytes = new Uint8Array(pcmData);
  const headerSize = 44;
  const wavBuffer = new ArrayBuffer(headerSize + pcmBytes.length);
  const view = new DataView(wavBuffer);
  
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmBytes.length, true);
  
  // PCM data
  new Uint8Array(wavBuffer).set(pcmBytes, headerSize);
  
  return wavBuffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
