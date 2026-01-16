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
  
  // 监听单词点击（Alt + 单击查词）
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

  // 移动端/触摸适配：监听文本选择
  // 当用户选中文本时，显示一个小的悬浮按钮"🔍"
  document.addEventListener('selectionchange', handleSelectionChange);
}

// 触摸查词按钮元素
let touchButton = null;

// 显示查词按钮
function showTouchButton(rect, word) {
  if (!touchButton) {
    touchButton = createElement('div', 'touch-btn');
    touchButton.innerHTML = '🔍';
    touchButton.style.cssText = `
      position: absolute;
      z-index: 2147483648;
      width: 40px;
      height: 40px;
      background: var(--elh-bg-primary, #fff);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 18px;
    `;
    document.body.appendChild(touchButton);
    
    // 点击按钮查词
    touchButton.addEventListener('click', (e) => {
      e.stopPropagation();
      // 获取当前选区
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // 更新当前单词状态 (供AI分析使用)
      const container = range.commonAncestorContainer;
      const contextElement = container.nodeType === 1 ? container : container.parentElement;
      
      currentWord = {
        word: word,
        element: null, // 选区查词没有特定的单词元素
        sentence: getParagraphContext(contextElement) || contextElement.textContent // 尝试获取上下文
      };
      
      showPopup(rect, word);
      loadWordData(word);
      
      hideTouchButton();
      // 清除选区，提升体验
      selection.removeAllRanges();
    });
  }
  
  // 计算位置：在选区上方/下方居中
  const top = rect.top + window.scrollY - 50; 
  const left = rect.left + window.scrollX + (rect.width / 2) - 20;
  
  touchButton.style.top = `${top}px`;
  touchButton.style.left = `${left}px`;
  touchButton.style.display = 'flex';
}

function hideTouchButton() {
  if (touchButton) {
    touchButton.style.display = 'none';
  }
}

// 节流处理选区变化
let selectionTimeout;
function handleSelectionChange() {
  // 只在没有弹窗开启时处理
  if (popupElement && popupElement.classList.contains(`${PLUGIN_PREFIX}popup-visible`)) return;

  clearTimeout(selectionTimeout);
  selectionTimeout = setTimeout(() => {
    // 仅在移动端/小屏设备显示查词按钮 (宽<=768px)
    if (window.innerWidth > 768) {
      hideTouchButton();
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      hideTouchButton();
      return;
    }
    
    const text = selection.toString().trim();
    // 简单的英语单词检查：1-30个字母，不包含换行
    if (/^[a-zA-Z\s-]{1,30}$/.test(text) && !text.includes('\n')) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // 检查rect是否有效
      if (rect.width > 0 && rect.height > 0) {
        showTouchButton(rect, text);
      }
    } else {
      hideTouchButton();
    }
  }, 300); // 300ms延迟，等待选区稳定
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
  
  // 拖拽功能
  const header = popupElement.querySelector(`.${PLUGIN_PREFIX}popup-header`);
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = popupElement.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    
    // 防止选中文本
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    // 计算新位置 (相对于视口 + 滚动偏移)
    const newLeft = e.clientX - dragOffsetX + window.scrollX;
    const newTop = e.clientY - dragOffsetY + window.scrollY;
    
    popupElement.style.left = `${newLeft}px`;
    popupElement.style.top = `${newTop}px`;
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

/**
 * 处理单词点击（仅 Alt + 单击触发）
 * @param {Event} e 事件
 */
async function handleWordClick(e) {
  const wordElement = e.target.closest(`.${PLUGIN_PREFIX}word`);
  if (!wordElement) return;
  
  // 只有按住 Alt 键时才触发查词，否则保持原有行为（如链接跳转）
  if (!e.altKey) {
    return;
  }
  
  e.preventDefault();
  e.stopPropagation();
  
  const word = wordElement.dataset.word;
  if (!word) return;
  
  // 获取单词位置
  const rect = wordElement.getBoundingClientRect();
  
  currentWord = {
    word,
    element: wordElement,
    sentence: getParagraphContext(wordElement)  // 使用段落上下文
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
    aiContent.innerHTML = `<div class="${PLUGIN_PREFIX}ai-error">解析失败：${data.rawOutput || data.explanation}</div>`;
    return;
  }
  
  let html = '';
  
  // 1. 详细释义
  if (data.detailedMeaning) {
    html += `
      <div class="${PLUGIN_PREFIX}ai-section">
        <div class="${PLUGIN_PREFIX}ai-label">📖 详细释义</div>
        <div class="${PLUGIN_PREFIX}ai-value">
          <div><strong>${data.detailedMeaning.chinese || ''}</strong></div>
          ${data.detailedMeaning.english ? `<div class="sub-text">${data.detailedMeaning.english}</div>` : ''}
          ${data.detailedMeaning.partOfSpeech ? `<div class="pos">${data.detailedMeaning.partOfSpeech}</div>` : ''}
        </div>
      </div>
    `;
  }
  
  // 2. 发音技巧
  if (data.pronunciation) {
    html += `
      <div class="${PLUGIN_PREFIX}ai-section">
        <div class="${PLUGIN_PREFIX}ai-label">🗣️ 发音技巧</div>
        <div class="${PLUGIN_PREFIX}ai-value">
          ${data.pronunciation.ipa ? `<div class="ipa">${data.pronunciation.ipa}</div>` : ''}
          ${data.pronunciation.tips ? `<div>${data.pronunciation.tips}</div>` : ''}
        </div>
      </div>
    `;
  }
  
  // 3. 语境解释
  if (data.contextualAnalysis) {
    html += `
      <div class="${PLUGIN_PREFIX}ai-section">
        <div class="${PLUGIN_PREFIX}ai-label">📝 语境解释</div>
        <div class="${PLUGIN_PREFIX}ai-value">
          ${data.contextualAnalysis.usage ? `<div><strong>用法：</strong>${data.contextualAnalysis.usage}</div>` : ''}
          ${data.contextualAnalysis.nuance ? `<div><strong>精妙之处：</strong>${data.contextualAnalysis.nuance}</div>` : ''}
          ${data.contextualAnalysis.synonymsInContext && data.contextualAnalysis.synonymsInContext.length > 0 
            ? `<div><strong>近义词：</strong>${data.contextualAnalysis.synonymsInContext.join(', ')}</div>` 
            : ''}
        </div>
      </div>
    `;
  }
  
  // 4. 助记技巧
  if (data.mnemonicTechniques) {
    html += `
      <div class="${PLUGIN_PREFIX}ai-section">
        <div class="${PLUGIN_PREFIX}ai-label">💡 助记技巧</div>
        <div class="${PLUGIN_PREFIX}ai-value">
          ${data.mnemonicTechniques.visualization ? `<div><strong>形象记忆：</strong>${data.mnemonicTechniques.visualization}</div>` : ''}
          ${data.mnemonicTechniques.association ? `<div><strong>关联记忆：</strong>${data.mnemonicTechniques.association}</div>` : ''}
          ${data.mnemonicTechniques.story ? `<div><strong>记忆口诀：</strong>${data.mnemonicTechniques.story}</div>` : ''}
        </div>
      </div>
    `;
  }
  
  // 5. 例句
  if (data.examples && data.examples.length > 0) {
    html += `
      <div class="${PLUGIN_PREFIX}ai-section">
        <div class="${PLUGIN_PREFIX}ai-label">💬 例句</div>
        <div class="${PLUGIN_PREFIX}ai-value">
          ${data.examples.map(ex => `<div class="example">• ${ex}</div>`).join('')}
        </div>
      </div>
    `;
  }
  
  // 旧格式兼容（如果没有新格式数据）
  if (!html && data.explanation) {
    html = `
      <div class="${PLUGIN_PREFIX}ai-section">
        <div class="${PLUGIN_PREFIX}ai-label">解释</div>
        <div class="${PLUGIN_PREFIX}ai-value">${data.explanation}</div>
      </div>
    `;
  }
  
  aiContent.innerHTML = html || '<div>暂无数据</div>';
}

/**
 * 获取段落上下文
 * @param {HTMLElement} wordElement 单词元素
 * @returns {string} 段落
 */
function getParagraphContext(wordElement) {
  // 向上查找包含该单词的段落
  let parent = wordElement;
  
  // 首先查找最近的段落元素
  while (parent && parent !== document.body) {
    const tagName = parent.tagName.toLowerCase();
    
    // 段落级别元素
    if (tagName === 'p' || tagName === 'div' || tagName === 'section' || 
        tagName === 'article' || tagName === 'li' || tagName === 'blockquote' ||
        tagName === 'td' || tagName === 'dd') {
      const text = parent.textContent.trim();
      // 如果段落文本长度合理（10-500字符），使用它
      if (text.length >= 10 && text.length <= 500) {
        return text;
      }
      // 如果太长，尝试获取前后若干字符
      if (text.length > 500) {
        return extractLocalContext(wordElement, parent, 250);
      }
    }
    
    parent = parent.parentElement;
  }
  
  // 如果没找到合适的段落，获取周围文本
  return extractLocalContext(wordElement, document.body, 150);
}

/**
 * 提取单词周围的局部上下文
 * @param {HTMLElement} wordElement 单词元素
 * @param {HTMLElement} container 容器元素
 * @param {number} maxLength 最大长度
 * @returns {string} 上下文
 */
function extractLocalContext(wordElement, container, maxLength = 200) {
  const fullText = container.textContent;
  const wordText = wordElement.textContent;
  const wordIndex = fullText.indexOf(wordText);
  
  if (wordIndex === -1) {
    return fullText.substring(0, maxLength);
  }
  
  // 获取单词前后的文本
  const start = Math.max(0, wordIndex - maxLength / 2);
  const end = Math.min(fullText.length, wordIndex + wordText.length + maxLength / 2);
  
  let context = fullText.substring(start, end).trim();
  
  // 尝试在句子边界截断
  if (start > 0) {
    const firstPeriod = context.indexOf('. ');
    if (firstPeriod > 0 && firstPeriod < 50) {
      context = context.substring(firstPeriod + 2);
    }
  }
  
  if (end < fullText.length) {
    const lastPeriod = context.lastIndexOf('. ');
    if (lastPeriod > context.length - 50 && lastPeriod > 0) {
      context = context.substring(0, lastPeriod + 1);
    }
  }
  
  return context || wordText;
}

export { hidePopup };
