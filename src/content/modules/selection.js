/**
 * 文本选择模块
 * 处理段落选择，显示朗读工具栏
 */

import { createElement, PLUGIN_PREFIX } from '../../utils/dom.js';
import { requestTTS } from './tts.js';

// 工具栏元素
let toolbarElement = null;
let currentSelection = null;

/**
 * 初始化选择模块
 */
export function initSelection() {
  // 创建工具栏
  createToolbar();
  
  // 监听选择变化
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('selectionchange', handleSelectionChange);
  
  // 点击其他区域隐藏工具栏
  document.addEventListener('mousedown', (e) => {
    if (toolbarElement && !toolbarElement.contains(e.target)) {
      hideToolbar();
    }
  });
}

/**
 * 创建工具栏
 */
function createToolbar() {
  toolbarElement = createElement('div', 'selection-toolbar');
  toolbarElement.innerHTML = `
    <button class="${PLUGIN_PREFIX}toolbar-btn ${PLUGIN_PREFIX}tts-btn" title="朗读选中文本">
      <span class="${PLUGIN_PREFIX}btn-icon">🔊</span>
      <span class="${PLUGIN_PREFIX}btn-text">朗读</span>
    </button>
    <button class="${PLUGIN_PREFIX}toolbar-btn ${PLUGIN_PREFIX}copy-btn" title="复制文本">
      <span class="${PLUGIN_PREFIX}btn-icon">📋</span>
      <span class="${PLUGIN_PREFIX}btn-text">复制</span>
    </button>
  `;
  
  document.body.appendChild(toolbarElement);
  
  // 绑定事件
  toolbarElement.querySelector(`.${PLUGIN_PREFIX}tts-btn`).addEventListener('click', handleTTSClick);
  toolbarElement.querySelector(`.${PLUGIN_PREFIX}copy-btn`).addEventListener('click', handleCopyClick);
}

/**
 * 处理鼠标抬起事件
 * @param {MouseEvent} e 事件
 */
function handleMouseUp(e) {
  // 延迟检查选择，确保选择已完成
  setTimeout(() => {
    checkSelection(e);
  }, 10);
}

/**
 * 处理选择变化
 */
function handleSelectionChange() {
  // 如果没有选择内容，隐藏工具栏
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    // 延迟隐藏，避免点击工具栏时误隐藏
    setTimeout(() => {
      if (!window.getSelection()?.toString().trim()) {
        hideToolbar();
      }
    }, 100);
  }
}

/**
 * 检查选择并显示工具栏
 * @param {MouseEvent} e 事件
 */
function checkSelection(e) {
  const selection = window.getSelection();
  
  if (!selection || selection.isCollapsed) {
    return;
  }
  
  const text = selection.toString().trim();
  
  // 至少选择 2 个字符
  if (text.length < 2) {
    return;
  }
  
  // 检查是否包含英文
  if (!/[a-zA-Z]/.test(text)) {
    return;
  }
  
  currentSelection = text;
  
  // 获取选择区域位置
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  showToolbar(rect);
}

/**
 * 显示工具栏
 * @param {DOMRect} rect 选择区域位置
 */
function showToolbar(rect) {
  if (!toolbarElement) return;
  
  toolbarElement.classList.add(`${PLUGIN_PREFIX}toolbar-visible`);
  
  // 计算位置（显示在选择区域上方）
  const toolbarRect = toolbarElement.getBoundingClientRect();
  let top = rect.top + window.scrollY - toolbarRect.height - 8;
  let left = rect.left + window.scrollX + (rect.width - toolbarRect.width) / 2;
  
  // 如果上方空间不足，显示在下方
  if (top < window.scrollY + 8) {
    top = rect.bottom + window.scrollY + 8;
  }
  
  // 确保不超出视口
  if (left < 8) left = 8;
  if (left + toolbarRect.width > window.innerWidth - 8) {
    left = window.innerWidth - toolbarRect.width - 8;
  }
  
  toolbarElement.style.top = `${top}px`;
  toolbarElement.style.left = `${left}px`;
}

/**
 * 隐藏工具栏
 */
function hideToolbar() {
  if (toolbarElement) {
    toolbarElement.classList.remove(`${PLUGIN_PREFIX}toolbar-visible`);
    currentSelection = null;
  }
}

/**
 * 处理朗读按钮点击
 */
async function handleTTSClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!currentSelection) return;
  
  const btn = e.currentTarget;
  const originalHtml = btn.innerHTML;
  
  // 显示加载状态
  btn.innerHTML = `<span class="${PLUGIN_PREFIX}btn-icon">⏳</span><span class="${PLUGIN_PREFIX}btn-text">加载中...</span>`;
  btn.disabled = true;
  
  try {
    await requestTTS(currentSelection);
  } catch (error) {
    console.error('[Selection] TTS failed:', error);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
  
  hideToolbar();
}

/**
 * 处理复制按钮点击
 */
async function handleCopyClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!currentSelection) return;
  
  try {
    await navigator.clipboard.writeText(currentSelection);
    
    // 显示成功状态
    const btn = e.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="${PLUGIN_PREFIX}btn-icon">✓</span><span class="${PLUGIN_PREFIX}btn-text">已复制</span>`;
    
    setTimeout(() => {
      btn.innerHTML = originalHtml;
    }, 1000);
  } catch (error) {
    console.error('[Selection] Copy failed:', error);
  }
  
  hideToolbar();
}

export { hideToolbar };
