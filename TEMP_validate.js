/**
 * Options 脚本
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
});

/**
 * 加载设置
 */
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const settings = response.settings || {};
    
    // API Key 状态
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const apiKeyInput = document.getElementById('apiKey');
    
    if (response.hasApiKey) {
      apiKeyStatus.textContent = '✅ 已配置 API Key';
      apiKeyStatus.className = 'api-status success';
      apiKeyInput.placeholder = '••••••••••••••••••••••••'; // Show mask to indicate key exists
    } else {
      apiKeyStatus.textContent = '⚠️ 未配置 API Key，AI 功能将不可用';
      apiKeyStatus.className = 'api-status warning';
    }
    
    // 功能开关
    document.getElementById('enablePhonetics').checked = settings.enablePhonetics !== false;
    document.getElementById('enableDictionary').checked = settings.enableDictionary !== false;
    document.getElementById('enableTTS').checked = settings.enableTTS !== false;
    
    // 主题
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
      radio.checked = radio.value === (settings.theme || 'auto');
    });
    
    // 字号
    const fontSizeRadios = document.querySelectorAll('input[name="fontSize"]');
    fontSizeRadios.forEach(radio => {
      radio.checked = radio.value === (settings.fontSize || 'medium');
    });
    
    // 语速
    const ttsSpeed = document.getElementById('ttsSpeed');
    ttsSpeed.value = settings.ttsSpeed || 1;
    document.getElementById('ttsSpeedValue').textContent = `${ttsSpeed.value}x`;
    
    // 语音引擎
    const engineRadios = document.querySelectorAll('input[name="ttsEngine"]');
    engineRadios.forEach(radio => {
      radio.checked = radio.value === (settings.ttsEngine || 'gemini');
    });
    
    // 词典API选择
    const dictionaryAPI = document.getElementById('dictionaryAPI');
    dictionaryAPI.value = settings.dictionaryAPI || 'freedict';
    toggleBaiduSettings(dictionaryAPI.value === 'baidu');
    
    // 加载百度API密钥
    const baiduData = await chrome.storage.local.get(['baiduAppId', 'baiduSecret']);
    if (baiduData.baiduAppId) {
      document.getElementById('baiduAppId').value = baiduData.baiduAppId;
    }
    if (baiduData.baiduSecret) {
      document.getElementById('baiduSecret').placeholder = '••••••••••••••••';
    }
    
  } catch (error) {
    console.error('Failed to load settings:', error);
    showToast('加载设置失败', 'error');
  }
}

// ... rest of the file continues as normal ...
