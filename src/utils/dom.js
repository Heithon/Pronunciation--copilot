/**
 * DOM 操作工具函数
 * 提供安全的 DOM 操作和文本节点遍历
 */

// 需要跳过的标签
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'CANVAS', 'SVG',
  'VIDEO', 'AUDIO', 'IMG', 'INPUT', 'TEXTAREA', 'SELECT',
  'CODE', 'PRE', 'KBD', 'SAMP', 'VAR'
]);

// 插件生成的元素类名前缀
const PLUGIN_PREFIX = 'elh-';

/**
 * 创建带有插件前缀的元素
 * @param {string} tag 标签名
 * @param {string} className 类名（不含前缀）
 * @param {object} attributes 其他属性
 * @returns {HTMLElement}
 */
export function createElement(tag, className = '', attributes = {}) {
  const element = document.createElement(tag);
  
  if (className) {
    element.className = `${PLUGIN_PREFIX}${className}`;
  }
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'textContent') {
      element.textContent = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  return element;
}

/**
 * 检查元素是否应该被跳过
 * @param {Node} node 节点
 * @returns {boolean}
 */
export function shouldSkipNode(node) {
  if (!node) return true;
  
  // 跳过插件生成的元素
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.className && typeof node.className === 'string' && 
        node.className.includes(PLUGIN_PREFIX)) {
      return true;
    }
    if (SKIP_TAGS.has(node.tagName)) {
      return true;
    }
  }
  
  // 检查父元素
  let parent = node.parentElement;
  while (parent) {
    if (parent.className && typeof parent.className === 'string' && 
        parent.className.includes(PLUGIN_PREFIX)) {
      return true;
    }
    if (SKIP_TAGS.has(parent.tagName)) {
      return true;
    }
    // 检查 contenteditable
    if (parent.isContentEditable) {
      return true;
    }
    parent = parent.parentElement;
  }
  
  return false;
}

/**
 * 遍历文档中的文本节点
 * @param {Node} root 根节点
 * @param {function} callback 回调函数
 */
export function walkTextNodes(root, callback) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (shouldSkipNode(node)) {
          return NodeFilter.FILTER_REJECT;
        }
        // 跳过纯空白文本节点
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const nodes = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    nodes.push(currentNode);
  }
  
  // 使用收集的节点数组来避免 DOM 修改影响遍历
  nodes.forEach(node => callback(node));
}

/**
 * 安全地插入元素到节点之后
 * @param {Node} referenceNode 参考节点
 * @param {Node} newNode 新节点
 */
export function insertAfter(referenceNode, newNode) {
  if (referenceNode.parentNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }
}

/**
 * 获取元素的绝对位置
 * @param {HTMLElement} element 元素
 * @returns {{top: number, left: number, width: number, height: number}}
 */
export function getAbsolutePosition(element) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height
  };
}

/**
 * 移除所有插件生成的元素
 */
export function removeAllPluginElements() {
  const elements = document.querySelectorAll(`[class*="${PLUGIN_PREFIX}"]`);
  elements.forEach(el => el.remove());
}

/**
 * 检测主题模式
 * @returns {'light' | 'dark'}
 */
export function detectTheme() {
  // 优先检查 prefers-color-scheme
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  // 检查页面背景色
  const bgColor = window.getComputedStyle(document.body).backgroundColor;
  const rgb = bgColor.match(/\d+/g);
  if (rgb) {
    const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
    return brightness < 128 ? 'dark' : 'light';
  }
  
  return 'light';
}

export { PLUGIN_PREFIX, SKIP_TAGS };
