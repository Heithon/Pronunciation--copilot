/**
 * 音标模块
 * 检测英文单词并添加 IPA 音标标注
 * 使用 CMU 词典进行本地 IPA 转换
 */

import { wordToIPASync } from '../../utils/ipa-converter.js';
import { createElement, walkTextNodes, shouldSkipNode, PLUGIN_PREFIX } from '../../utils/dom.js';

// 内存缓存
const phoneticsCache = new Map();

// 英文单词正则表达式（只匹配2个字母以上的单词）
const WORD_REGEX = /\b[a-zA-Z]{2,}\b/g;

// 已处理的节点 WeakSet
const processedNodes = new WeakSet();

// 处理队列
let processingQueue = [];
let isProcessing = false;

/**
 * 初始化音标模块
 */
export function initPhonetics() {
  // 处理页面现有内容
  processPage();
  
  // 监听 DOM 变化
  const observer = new MutationObserver(handleMutations);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
}

/**
 * 处理整个页面
 */
function processPage() {
  walkTextNodes(document.body, processTextNode);
}

/**
 * 处理 DOM 变化
 */
function handleMutations(mutations) {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          walkTextNodes(node, processTextNode);
        } else if (node.nodeType === Node.TEXT_NODE) {
          processTextNode(node);
        }
      }
    }
  }
}

/**
 * 处理文本节点
 * @param {Text} textNode 文本节点
 */
function processTextNode(textNode) {
  if (processedNodes.has(textNode)) return;
  if (shouldSkipNode(textNode)) return;
  
  const text = textNode.textContent;
  const words = text.match(WORD_REGEX);
  
  if (!words || words.length === 0) return;
  
  processedNodes.add(textNode);
  
  // 创建包装元素
  const wrapper = document.createElement('span');
  wrapper.className = `${PLUGIN_PREFIX}text-wrapper`;
  
  let lastIndex = 0;
  let html = '';
  
  // 重新匹配以获取位置
  WORD_REGEX.lastIndex = 0;
  let match;
  
  while ((match = WORD_REGEX.exec(text)) !== null) {
    const word = match[0];
    const index = match.index;
    
    // 添加单词前的文本
    if (index > lastIndex) {
      html += escapeHtml(text.substring(lastIndex, index));
    }
    
    // 创建带音标的单词
    html += createWordHtml(word);
    lastIndex = index + word.length;
  }
  
  // 添加剩余文本
  if (lastIndex < text.length) {
    html += escapeHtml(text.substring(lastIndex));
  }
  
  wrapper.innerHTML = html;
  
  // 替换原文本节点
  if (textNode.parentNode) {
    textNode.parentNode.replaceChild(wrapper, textNode);
    
    // 异步加载音标
    loadPhoneticsForWrapper(wrapper);
  }
}

/**
 * 创建带音标的单词 HTML
 * @param {string} word 单词
 * @returns {string} HTML
 */
function createWordHtml(word) {
  const lowerWord = word.toLowerCase();
  // Use IPA converter for instant lookup (sync version)
  const phonetic = wordToIPASync(lowerWord) || '';
  
  return `<span class="${PLUGIN_PREFIX}word" data-word="${escapeHtml(lowerWord)}">` +
    `<span class="${PLUGIN_PREFIX}word-text">${escapeHtml(word)}</span>` +
    `<span class="${PLUGIN_PREFIX}phonetic" data-loaded="${phonetic ? 'true' : 'false'}">${escapeHtml(phonetic)}</span>` +
    `</span>`;
}

/**
 * 为包装元素加载音标（已废弃，现在IPA转换是同步的）
 * @param {HTMLElement} wrapper 包装元素
 */
async function loadPhoneticsForWrapper(wrapper) {
  if (isProcessing || processingQueue.length === 0) return;
  
  isProcessing = true;
  
  while (processingQueue.length > 0) {
    // 批量处理
    const batch = processingQueue.splice(0, 5);
    
    await Promise.all(batch.map(async ({ word, element }) => {
      try {
        // 再次检查缓存
        if (phoneticsCache.has(word)) {
          element.textContent = phoneticsCache.get(word);
          element.dataset.loaded = 'true';
          return;
        }
        
        const data = await lookupWord(word);
        const phonetic = data?.phonetic || '';
        
        phoneticsCache.set(word, phonetic);
        
        if (element.isConnected) {
          element.textContent = phonetic;
          element.dataset.loaded = 'true';
        }
      } catch (error) {
        console.error(`[Phonetics] Error loading phonetic for "${word}":`, error);
      }
    }));
    
    // 添加小延迟避免过快请求
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isProcessing = false;
}

/**
 * HTML 转义
 * @param {string} text 文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 清除所有音标标注
 */
export function clearPhonetics() {
  const wrappers = document.querySelectorAll(`.${PLUGIN_PREFIX}text-wrapper`);
  wrappers.forEach(wrapper => {
    const text = wrapper.textContent;
    const textNode = document.createTextNode(text);
    wrapper.parentNode?.replaceChild(textNode, wrapper);
  });
}

export { phoneticsCache };
