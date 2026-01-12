/**
 * 词典模块
 * 处理单词点击事件，显示词典弹窗
 */

import { lookupWord } from '../../api/dictionary.js';
import { createElement, getAbsolutePosition, PLUGIN_PREFIX } from '../../utils/dom.js';
import { playAudio, speakWithWebSpeech } from '../../utils/audio.js';

// 弹窗元素
let popupElement = null;
let currentWord = null;

/**
 * 初始化词典模块
 */
export function initDictionary() {
  // 创建弹窗元素
  createPopupElement();
  
  // 监听单词点击
  document.addEventListener('click', handleWordClick);
  
  // 点击其他区域关闭弹窗
  document.addEventListener('click', (e) => {
    if (popupElement && !popupElement.contains(e.target) && 
        !e.target.closest(`.${PLUGIN_PREFIX}word`)) {
      hidePopup();
    }
  });
  
  // ESC 键关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hidePopup();
    }
  });
}

/**
 * 创建弹窗元素
 */
function createPopupElement() {
  popupElement = createElement('div', 'popup');
  popupElement.innerHTML = `
    <div class="${PLUGIN_PREFIX}popup-header">
      <div class="${PLUGIN_PREFIX}popup-word"></div>
      <div class="${PLUGIN_PREFIX}popup-phonetic"></div>
      <button class="${PLUGIN_PREFIX}popup-audio" title="播放发音">🔊</button>
      <button class="${PLUGIN_PREFIX}popup-close" title="关闭">×</button>
    </div>
    <div class="${PLUGIN_PREFIX}popup-content">
      <div class="${PLUGIN_PREFIX}popup-loading">加载中...</div>
      <div class="${PLUGIN_PREFIX}popup-meanings"></div>
    </div>
    <div class="${PLUGIN_PREFIX}popup-footer">
      <button class="${PLUGIN_PREFIX}popup-ai-btn">
        <span class="${PLUGIN_PREFIX}ai-icon">✨</span>
        AI 语境分析
      </button>
    </div>
    <div class="${PLUGIN_PREFIX}popup-ai-result" style="display: none;">
      <div class="${PLUGIN_PREFIX}ai-loading">AI 分析中...</div>
      <div class="${PLUGIN_PREFIX}ai-content"></div>
    </div>
  `;
  
  document.body.appendChild(popupElement);
  
  // 绑定事件
  popupElement.querySelector(`.${PLUGIN_PREFIX}popup-close`).addEventListener('click', hidePopup);
  popupElement.querySelector(`.${PLUGIN_PREFIX}popup-audio`).addEventListener('click', handleAudioClick);
  popupElement.querySelector(`.${PLUGIN_PREFIX}popup-ai-btn`).addEventListener('click', handleAIAnalysis);
}

/**
 * 处理单词点击
 * @param {Event} e 事件
 */
async function handleWordClick(e) {
  const wordElement = e.target.closest(`.${PLUGIN_PREFIX}word`);
  if (!wordElement) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const word = wordElement.dataset.word;
  if (!word) return;
  
  // 获取单词位置
  const rect = wordElement.getBoundingClientRect();
  
  currentWord = {
    word,
    element: wordElement,
    sentence: getSentenceContext(wordElement)
  };
  
  showPopup(rect, word);
  loadWordData(word);
}

/**
 * 显示弹窗
 * @param {DOMRect} rect 位置
 * @param {string} word 单词
 */
function showPopup(rect, word) {
  if (!popupElement) return;
  
  // 设置初始内容
  popupElement.querySelector(`.${PLUGIN_PREFIX}popup-word`).textContent = word;
  popupElement.querySelector(`.${PLUGIN_PREFIX}popup-phonetic`).textContent = '';
  popupElement.querySelector(`.${PLUGIN_PREFIX}popup-meanings`).innerHTML = '';
  popupElement.querySelector(`.${PLUGIN_PREFIX}popup-loading`).style.display = 'block';
  popupElement.querySelector(`.${PLUGIN_PREFIX}popup-ai-result`).style.display = 'none';
  
  // 显示弹窗
  popupElement.classList.add(`${PLUGIN_PREFIX}popup-visible`);
  
  // 计算位置
  const popupRect = popupElement.getBoundingClientRect();
  let top = rect.bottom + window.scrollY + 8;
  let left = rect.left + window.scrollX;
  
  // 确保不超出视口
  if (left + popupRect.width > window.innerWidth) {
    left = window.innerWidth - popupRect.width - 16;
  }
  if (left < 8) left = 8;
  
  if (top + popupRect.height > window.innerHeight + window.scrollY) {
    top = rect.top + window.scrollY - popupRect.height - 8;
  }
  
  popupElement.style.top = `${top}px`;
  popupElement.style.left = `${left}px`;
}

/**
 * 隐藏弹窗
 */
function hidePopup() {
  if (popupElement) {
    popupElement.classList.remove(`${PLUGIN_PREFIX}popup-visible`);
    currentWord = null;
  }
}

/**
 * 加载单词数据
 * @param {string} word 单词
 */
async function loadWordData(word) {
  try {
    const data = await lookupWord(word);
    
    if (!data) {
      popupElement.querySelector(`.${PLUGIN_PREFIX}popup-loading`).style.display = 'none';
      popupElement.querySelector(`.${PLUGIN_PREFIX}popup-meanings`).innerHTML = 
        `<p class="${PLUGIN_PREFIX}no-result">未找到该单词的释义</p>`;
      return;
    }
    
    // 更新音标
    popupElement.querySelector(`.${PLUGIN_PREFIX}popup-phonetic`).textContent = data.phonetic || '';
    
    // 存储音频 URL
    popupElement.dataset.audioUrl = data.audioUrl || '';
    
    // 渲染词义
    renderMeanings(data.meanings);
    
    popupElement.querySelector(`.${PLUGIN_PREFIX}popup-loading`).style.display = 'none';
  } catch (error) {
    console.error('[Dictionary] Error loading word data:', error);
    popupElement.querySelector(`.${PLUGIN_PREFIX}popup-loading`).style.display = 'none';
    popupElement.querySelector(`.${PLUGIN_PREFIX}popup-meanings`).innerHTML = 
      `<p class="${PLUGIN_PREFIX}error">加载失败，请稍后重试</p>`;
  }
}

/**
 * 渲染词义
 * @param {Array} meanings 词义数组
 */
function renderMeanings(meanings) {
  const container = popupElement.querySelector(`.${PLUGIN_PREFIX}popup-meanings`);
  
  let html = '';
  for (const meaning of meanings) {
    html += `
      <div class="${PLUGIN_PREFIX}meaning-group">
        <div class="${PLUGIN_PREFIX}part-of-speech">${meaning.partOfSpeech}</div>
        <ul class="${PLUGIN_PREFIX}definitions">
    `;
    
    for (const def of meaning.definitions) {
      html += `
        <li class="${PLUGIN_PREFIX}definition">
          <div class="${PLUGIN_PREFIX}def-text">${def.definition}</div>
          ${def.example ? `<div class="${PLUGIN_PREFIX}def-example">"${def.example}"</div>` : ''}
        </li>
      `;
    }
    
    html += '</ul></div>';
  }
  
  container.innerHTML = html;
}

/**
 * 处理音频播放点击
 */
async function handleAudioClick() {
  if (!currentWord) return;
  
  const audioUrl = popupElement.dataset.audioUrl;
  
  try {
    if (audioUrl) {
      await playAudio(audioUrl);
    } else {
      // 使用 Web Speech API 作为备用
      await speakWithWebSpeech(currentWord.word);
    }
  } catch (error) {
    console.error('[Dictionary] Audio playback failed:', error);
    // 尝试备用方案
    try {
      await speakWithWebSpeech(currentWord.word);
    } catch (e) {
      console.error('[Dictionary] Web Speech also failed:', e);
    }
  }
}

/**
 * 处理 AI 分析
 */
async function handleAIAnalysis() {
  if (!currentWord) return;
  
  const aiResultDiv = popupElement.querySelector(`.${PLUGIN_PREFIX}popup-ai-result`);
  const aiLoading = popupElement.querySelector(`.${PLUGIN_PREFIX}ai-loading`);
  const aiContent = popupElement.querySelector(`.${PLUGIN_PREFIX}ai-content`);
  
  // 显示 AI 区域
  aiResultDiv.style.display = 'block';
  aiLoading.style.display = 'block';
  aiContent.innerHTML = '';
  
  // 创建流式输出容器
  let streamContainer = document.createElement('div');
  streamContainer.className = `${PLUGIN_PREFIX}ai-stream-output`;
  streamContainer.style.whiteSpace = 'pre-wrap';
  streamContainer.style.fontSize = '0.9em';
  streamContainer.style.color = '#666';
  streamContainer.style.padding = '8px';
  streamContainer.style.background = '#f5f5f5';
  streamContainer.style.borderRadius = '4px';
  streamContainer.style.marginTop = '8px';
  streamContainer.style.maxHeight = '200px';
  streamContainer.style.overflowY = 'auto';
  aiContent.appendChild(streamContainer);

  try {
    // 建立长连接
    const port = chrome.runtime.connect({ name: 'AI_STREAM' });
    
    port.postMessage({
      type: 'START_ANALYZE',
      word: currentWord.word,
      sentence: currentWord.sentence
    });

    port.onMessage.addListener((msg) => {
      if (msg.type === 'CHUNK') {
        aiLoading.style.display = 'none'; // 收到第一个块时隐藏加载动画
        streamContainer.textContent += msg.text;
        // 自动滚动到底部
        streamContainer.scrollTop = streamContainer.scrollHeight;
      } else if (msg.type === 'COMPLETE') {
        port.disconnect();
        // 移除流式容器，显示结构化结果
        aiContent.innerHTML = ''; 
        renderAIResult(msg.data);
      } else if (msg.type === 'ERROR') {
        port.disconnect();
        aiLoading.style.display = 'none';
        // 如果已经有部分流式输出，保留它并显示错误
        if (streamContainer.textContent) {
          streamContainer.style.border = '1px solid red';
          const errorMsg = document.createElement('div');
          errorMsg.className = `${PLUGIN_PREFIX}error`;
          errorMsg.textContent = `生成中断: ${msg.error}`;
          aiContent.appendChild(errorMsg);
        } else {
          aiContent.innerHTML = `<p class="${PLUGIN_PREFIX}error">${msg.error}</p>`;
        }
      }
    });

  } catch (error) {
    console.error('[Dictionary] AI analysis failed:', error);
    aiLoading.style.display = 'none';
    aiContent.innerHTML = `<p class="${PLUGIN_PREFIX}error">AI 分析失败: ${error.message}</p>`;
  }
}

/**
 * 渲染 AI 分析结果
 * @param {object} data 分析数据
 */
function renderAIResult(data) {
  const aiContent = popupElement.querySelector(`.${PLUGIN_PREFIX}ai-content`);
  
  if (data.parseError) {
    // 使用 textContent 防止 XSS 并保留格式
    const p = document.createElement('p');
    p.className = `${PLUGIN_PREFIX}ai-text`;
    p.style.whiteSpace = 'pre-wrap'; // 保留换行符
    p.textContent = data.explanation;
    aiContent.appendChild(p);
    return;
  }
  
  let html = `
    <div class="${PLUGIN_PREFIX}ai-section">
      <div class="${PLUGIN_PREFIX}ai-label">语境含义</div>
      <div class="${PLUGIN_PREFIX}ai-value">${data.contextMeaning || ''}</div>
    </div>
    <div class="${PLUGIN_PREFIX}ai-section">
      <div class="${PLUGIN_PREFIX}ai-label">词性</div>
      <div class="${PLUGIN_PREFIX}ai-value">${data.partOfSpeech || ''}</div>
    </div>
    <div class="${PLUGIN_PREFIX}ai-section">
      <div class="${PLUGIN_PREFIX}ai-label">详细解释</div>
      <div class="${PLUGIN_PREFIX}ai-value">${data.explanation || ''}</div>
    </div>
  `;
  
  if (data.usageNotes) {
    html += `
      <div class="${PLUGIN_PREFIX}ai-section">
        <div class="${PLUGIN_PREFIX}ai-label">用法提示</div>
        <div class="${PLUGIN_PREFIX}ai-value">${data.usageNotes}</div>
      </div>
    `;
  }
  
  if (data.relatedExpressions && data.relatedExpressions.length > 0) {
    html += `
      <div class="${PLUGIN_PREFIX}ai-section">
        <div class="${PLUGIN_PREFIX}ai-label">相关表达</div>
        <div class="${PLUGIN_PREFIX}ai-value">${data.relatedExpressions.join(', ')}</div>
      </div>
    `;
  }
  
  aiContent.innerHTML = html;
}

/**
 * 获取句子上下文
 * @param {HTMLElement} wordElement 单词元素
 * @returns {string} 句子
 */
function getSentenceContext(wordElement) {
  // 尝试获取包含该单词的段落或句子
  let parent = wordElement.parentElement;
  let text = '';
  
  while (parent && parent !== document.body) {
    if (['P', 'DIV', 'SPAN', 'LI', 'TD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(parent.tagName)) {
      text = parent.textContent;
      break;
    }
    parent = parent.parentElement;
  }
  
  if (!text) {
    text = wordElement.closest('p, div, span')?.textContent || wordElement.textContent;
  }
  
  // 限制长度
  if (text.length > 500) {
    // 尝试找到包含目标单词的句子
    const word = wordElement.dataset.word;
    const sentences = text.split(/[.!?]+/);
    const targetSentence = sentences.find(s => s.toLowerCase().includes(word.toLowerCase()));
    if (targetSentence) {
      return targetSentence.trim();
    }
    return text.substring(0, 500) + '...';
  }
  
  return text.trim();
}

export { hidePopup };
