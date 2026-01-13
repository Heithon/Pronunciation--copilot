/**
 * Content Script 主入口
 * 初始化所有模块
 */

console.log('[English Learning Helper] Content script loaded!');

// 模块状态
let isInitialized = false;
let settings = null;
let phoneticsModule = null;
let dictionaryModule = null;
let selectionModule = null;

/**
 * 初始化插件
 */
async function init() {
  console.log('[English Learning Helper] init() called, isInitialized:', isInitialized);
  
  if (isInitialized) {
    console.log('[English Learning Helper] Already initialized, skipping');
    return;
  }
  
  try {
    console.log('[English Learning Helper] Getting settings...');
    // 获取设置
    settings = await getSettings();
    console.log('[English Learning Helper] Settings loaded:', settings);
    
    console.log('[English Learning Helper] Loading modules dynamically...');
    
    // 动态导入模块（解决 Chrome 扩展中 ES 模块加载问题）
    phoneticsModule = await import(chrome.runtime.getURL('src/content/modules/phonetics.js'));
    dictionaryModule = await import(chrome.runtime.getURL('src/content/modules/dictionary.js'));
    selectionModule = await import(chrome.runtime.getURL('src/content/modules/selection.js'));
    
    console.log('[English Learning Helper] Modules imported successfully!');
    
    console.log('[English Learning Helper] Initializing modules...');
    
    // 初始化音标模块（始终初始化，但根据设置决定是否显示）
    console.log('[English Learning Helper] Initializing phonetics module...');
    phoneticsModule.initPhonetics();
    
    // 根据设置决定是否隐藏音标
    if (!settings.enablePhonetics) {
      console.log('[English Learning Helper] Phonetics disabled, hiding with CSS');
      document.body.classList.add('elh-hide-phonetics');
    }
    console.log('[English Learning Helper] Phonetics module initialized');
    
    // 初始化词典模块
    if (settings.enableDictionary) {
      console.log('[English Learning Helper] Initializing dictionary module...');
      dictionaryModule.initDictionary();
      console.log('[English Learning Helper] Dictionary module initialized');
    } else {
      console.log('[English Learning Helper] Dictionary module disabled in settings');
    }
    
    // 初始化选择模块（TTS）
    if (settings.enableTTS) {
      console.log('[English Learning Helper] Initializing selection/TTS module...');
      selectionModule.initSelection();
      console.log('[English Learning Helper] Selection/TTS module initialized');
    } else {
      console.log('[English Learning Helper] TTS module disabled in settings');
    }
    
    isInitialized = true;
    console.log('[English Learning Helper] ✅ All modules initialized successfully!');
    
  } catch (error) {
    console.error('[English Learning Helper] ❌ Initialization failed:', error);
    console.error('[English Learning Helper] Error stack:', error.stack);
  }
}

/**
 * 获取设置
 */
async function getSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    return response.settings || getDefaultSettings();
  } catch (error) {
    console.error('[English Learning Helper] Failed to get settings:', error);
    return getDefaultSettings();
  }
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
 * 处理音标显示切换
 */
async function handlePhoneticsToggle(enabled) {
  if (!phoneticsModule) {
    console.warn('[English Learning Helper] Phonetics module not loaded');
    return;
  }
  
  if (enabled) {
    console.log('[English Learning Helper] Enabling phonetics...');
    phoneticsModule.initPhonetics();
  } else {
    console.log('[English Learning Helper] Disabling phonetics...');
    phoneticsModule.clearPhonetics();
  }
}

// 监听设置变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings) {
    console.log('[English Learning Helper] Settings changed:', changes.settings);
    
    const oldSettings = changes.settings.oldValue || {};
    const newSettings = changes.settings.newValue || {};
    
    // 动态切换音标显示
    if (oldSettings.enablePhonetics !== newSettings.enablePhonetics) {
      handlePhoneticsToggle(newSettings.enablePhonetics);
    }
    
    // 更新当前设置引用
    settings = newSettings;
  }
});

// 等待 DOM 准备就绪后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
