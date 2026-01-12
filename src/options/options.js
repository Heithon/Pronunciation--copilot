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
    
  } catch (error) {
    console.error('Failed to load settings:', error);
    showToast('加载设置失败', 'error');
  }
}

/**
 * 设置事件监听
 */
function setupEventListeners() {
  // API Key 显示/隐藏
  document.getElementById('toggleApiKey').addEventListener('click', () => {
    const input = document.getElementById('apiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  
  // 验证 API Key
  document.getElementById('validateApiKey').addEventListener('click', validateApiKey);
  
  // 保存 API Key
  document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
  
  // 功能开关
  const toggles = ['enablePhonetics', 'enableDictionary', 'enableTTS'];
  toggles.forEach(id => {
    document.getElementById(id).addEventListener('change', saveSettings);
  });
  
  // 主题选择
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', saveSettings);
  });
  
  // 字号选择
  document.querySelectorAll('input[name="fontSize"]').forEach(radio => {
    radio.addEventListener('change', saveSettings);
  });
  
  // 语速滑块
  const ttsSpeed = document.getElementById('ttsSpeed');
  ttsSpeed.addEventListener('input', () => {
    document.getElementById('ttsSpeedValue').textContent = `${ttsSpeed.value}x`;
  });
  ttsSpeed.addEventListener('change', saveSettings);
  
  // 语音引擎
  document.querySelectorAll('input[name="ttsEngine"]').forEach(radio => {
    radio.addEventListener('change', saveSettings);
  });
  
  // 重置设置
  document.getElementById('resetSettings').addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('确定要重置所有设置吗？')) {
      await chrome.storage.local.clear();
      showToast('设置已重置', 'success');
      setTimeout(() => location.reload(), 1000);
    }
  });
}

/**
 * 验证 API Key
 */
async function validateApiKey() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const status = document.getElementById('apiKeyStatus');
  
  if (!apiKey) {
    status.textContent = '请输入 API Key';
    status.className = 'api-status warning';
    return;
  }
  
  status.textContent = '验证中...';
  status.className = 'api-status';
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'VALIDATE_API_KEY',
      apiKey
    });
    
    if (response.valid) {
      status.textContent = '✅ API Key 有效';
      status.className = 'api-status success';
    } else {
      status.textContent = '❌ API Key 无效，请检查';
      status.className = 'api-status error';
    }
  } catch (error) {
    status.textContent = '验证失败：' + error.message;
    status.className = 'api-status error';
  }
}

/**
 * 保存 API Key
 */
async function saveApiKey() {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  try {
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      apiKey
    });
    
    showToast('API Key 已保存', 'success');
    
    // 更新状态
    const status = document.getElementById('apiKeyStatus');
    if (apiKey) {
      status.textContent = '✅ 已配置 API Key';
      status.className = 'api-status success';
    } else {
      status.textContent = '⚠️ 未配置 API Key';
      status.className = 'api-status warning';
    }
  } catch (error) {
    showToast('保存失败', 'error');
  }
}

/**
 * 保存设置
 */
async function saveSettings() {
  const settings = {
    enablePhonetics: document.getElementById('enablePhonetics').checked,
    enableDictionary: document.getElementById('enableDictionary').checked,
    enableTTS: document.getElementById('enableTTS').checked,
    theme: document.querySelector('input[name="theme"]:checked')?.value || 'auto',
    fontSize: document.querySelector('input[name="fontSize"]:checked')?.value || 'medium',
    ttsSpeed: parseFloat(document.getElementById('ttsSpeed').value) || 1,
    ttsEngine: document.querySelector('input[name="ttsEngine"]:checked')?.value || 'gemini'
  };
  
  try {
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings
    });
    showToast('设置已保存', 'success');
  } catch (error) {
    showToast('保存失败', 'error');
  }
}

/**
 * 显示提示
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}
