/**
 * 音标模块
 * 检测英文单词并添加 IPA 音标标注
 * 使用 CMU 词典进行本地 IPA 转换
 */

import { wordToIPASync, wordToIPA } from '../../utils/ipa-converter.js';
import { createElement, walkTextNodes, shouldSkipNode, PLUGIN_PREFIX } from '../../utils/dom.js';

// 内存缓存
const phoneticsCache = new Map();

// 英文单词正则表达式（只匹配2个字母以上的单词）
const WORD_REGEX = /\b[a-zA-Z]{2,}\b/g;

// 已处理的节点 WeakSet
let processedNodes = new WeakSet();

// 处理队列
let processingQueue = [];
let isProcessing = false;

// MutationObserver 引用
let phoneticsObserver = null;

// Debounce timer for mutation handling
let mutationTimer = null;
const MUTATION_DEBOUNCE_MS = 150; // Wait 150ms before processing

// IntersectionObserver for viewport-based lazy loading
let viewportObserver = null;
const VIEWPORT_MARGIN = '500px'; // Load 500px before content becomes visible
const observedWrappers = new WeakSet(); // Track which wrappers are being observed

/**
 * 初始化音标模块
 */
export function initPhonetics() {
  console.log('[Phonetics] Initializing phonetics module...');
  
  // 移除隐藏类，显示音标
  document.body.classList.remove('elh-hide-phonetics');
  
  // 如果已经有observer在运行，不需要重复初始化
  if (phoneticsObserver) {
    console.log('[Phonetics] Observer already running, just showing phonetics');
    return phoneticsObserver;
  }
  
  // Initialize IntersectionObserver for lazy loading
  setupViewportObserver();
  
  // 处理页面现有内容（使用懒加载）
  processPage();
  
  // 监听 DOM 变化
  phoneticsObserver = new MutationObserver(handleMutations);
  phoneticsObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('[Phonetics] Initialized with lazy loading and observing DOM changes');
  return phoneticsObserver;
}

/**
 * 设置 IntersectionObserver 用于可视区域懒加载
 */
function setupViewportObserver() {
  if (viewportObserver) return;
  
  viewportObserver = new IntersectionObserver(
    handleIntersection,
    {
      root: null, // Use viewport as root
      rootMargin: `${VIEWPORT_MARGIN} 0px ${VIEWPORT_MARGIN} 0px`, // Load ahead
      threshold: 0 // Trigger as soon as any part is visible
    }
  );
  
  console.log(`[Phonetics] Viewport observer initialized with ${VIEWPORT_MARGIN} margin`);
}

/**
 * 处理可视区域交叉事件
 */
function handleIntersection(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const wrapper = entry.target;
      
      // Process phonetics for this wrapper
      loadPhoneticsForWrapper(wrapper);
      
      // Stop observing once processed
      viewportObserver.unobserve(wrapper);
      observedWrappers.delete(wrapper);
    }
  });
}

/**
 * 处理整个页面
 */
function processPage() {
  walkTextNodes(document.body, processTextNode);
}

/**
 * 处理 DOM 变化（带防抖）
 */
function handleMutations(mutations) {
  // Clear existing timer
  if (mutationTimer) {
    clearTimeout(mutationTimer);
  }
  
  // Debounce: wait for mutations to settle before processing
  mutationTimer = setTimeout(() => {
    // Collect unique nodes to process
    const nodesToProcess = new Set();
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          // Only process if not already in set
          if (!nodesToProcess.has(node)) {
            nodesToProcess.add(node);
          }
        }
      }
    }
    
    // Process collected nodes
    for (const node of nodesToProcess) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        walkTextNodes(node, processTextNode);
      } else if (node.nodeType === Node.TEXT_NODE) {
        processTextNode(node);
      }
    }
  }, MUTATION_DEBOUNCE_MS);
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
    
    // Use IntersectionObserver for lazy loading
    // Only load phonetics when wrapper enters viewport
    if (viewportObserver && !observedWrappers.has(wrapper)) {
      viewportObserver.observe(wrapper);
      observedWrappers.add(wrapper);
    }
  }
}

/**
 * 创建带音标的单词 HTML
 * @param {string} word 单词
 * @returns {string} HTML
 */
function createWordHtml(word) {
  const lowerWord = word.toLowerCase();
  // Try sync lookup first (fast path for common words)
  const phonetic = wordToIPASync(lowerWord) || '';
  
  // If not found, mark for async loading
  const needsAsync = !phonetic;
  
  return `<span class="${PLUGIN_PREFIX}word" data-word="${escapeHtml(lowerWord)}">` +
    `<span class="${PLUGIN_PREFIX}word-text">${escapeHtml(word)}</span>` +
    `<span class="${PLUGIN_PREFIX}phonetic" data-loaded="${phonetic ? 'true' : 'false'}" data-needs-async="${needsAsync}">${escapeHtml(phonetic)}</span>` +
    `</span>`;
}

/**
 * 为包装元素加载音标（异步加载变形词音标）
 * @param {HTMLElement} wrapper 包装元素
 */
async function loadPhoneticsForWrapper(wrapper) {
  // Find all phonetic spans that need async loading
  const phoneticSpans = wrapper.querySelectorAll(`[data-needs-async="true"]`);
  
  if (phoneticSpans.length === 0) return;
  
  // Process in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < phoneticSpans.length; i += batchSize) {
    const batch = Array.from(phoneticSpans).slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (element) => {
      const wordSpan = element.closest(`.${PLUGIN_PREFIX}word`);
      if (!wordSpan) return;
      
      const word = wordSpan.dataset.word;
      if (!word) return;
      
      try {
        // Check cache first
        if (phoneticsCache.has(word)) {
          const cached = phoneticsCache.get(word);
          if (element.isConnected && cached) {
            element.textContent = cached;
            element.dataset.loaded = 'true';
            element.removeAttribute('data-needs-async');
          }
          return;
        }
        
        // Use async wordToIPA for inflection handling
        const phonetic = await wordToIPA(word);
        
        if (phonetic) {
          phoneticsCache.set(word, phonetic);
          
          if (element.isConnected) {
            element.textContent = phonetic;
            element.dataset.loaded = 'true';
            element.removeAttribute('data-needs-async');
          }
        }
      } catch (error) {
        console.error(`[Phonetics] Error loading phonetic for "${word}":`, error);
      }
    }));
    
    // Small delay between batches
    if (i + batchSize < phoneticSpans.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
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
 * 隐藏音标显示（不删除DOM）
 */
export function clearPhonetics() {
  console.log('[Phonetics] Hiding phonetics with CSS...');
  
  // 添加CSS类来隐藏所有音标
  document.body.classList.add('elh-hide-phonetics');
  
  // 保持observer运行，以便新内容也会被处理（只是不可见）
  console.log('[Phonetics] Phonetics hidden but observer still running');
}

export { phoneticsCache };
