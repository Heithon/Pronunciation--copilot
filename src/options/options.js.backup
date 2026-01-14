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
  
  // 词典API选择
  document.getElementById('dictionaryAPI').addEventListener('change', (e) => {
    toggleBaiduSettings(e.target.value === 'baidu');
    saveDictionarySettings();
  });
  
  // 百度密钥显示/隐藏
  document.getElementById('toggleBaiduSecret')?.addEventListener('click', () => {
    const input = document.getElementById('baiduSecret');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  
  // 百度API设置改变
  document.getElementById('baiduAppId')?.addEventListener('change', saveDictionarySettings);
  document.getElementById('baiduSecret')?.addEventListener('change', saveDictionarySettings);
  
  // 验证百度API
  document.getElementById('validateBaiduApi')?.addEventListener('click', validateBaiduApi);
  
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
    ttsEngine: document.querySelector('input[name="ttsEngine"]:checked')?.value || 'gemini',
    dictionaryAPI: document.getElementById('dictionaryAPI')?.value || 'freedict'
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

/**
 * 切换百度设置显示
 */
function toggleBaiduSettings(show) {
  const baiduSettings = document.getElementById('baiduSettings');
  if (baiduSettings) {
    baiduSettings.style.display = show ? 'block' : 'none';
  }
}

/**
 * 保存词典设置
 */
async function saveDictionarySettings() {
  const dictionaryAPI = document.getElementById('dictionaryAPI').value;
  const baiduAppId = document.getElementById('baiduAppId')?.value.trim() || '';
  const baiduSecret = document.getElementById('baiduSecret')?.value.trim() || '';
  
  try {
    // 保存词典API选择到settings
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const settings = response.settings || {};
    settings.dictionaryAPI = dictionaryAPI;
    
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings
    });
    
    // 保存百度API密钥
    if (dictionaryAPI === 'baidu') {
      await chrome.storage.local.set({
        baiduAppId,
        baiduSecret
      });
    }
    
    showToast('词典设置已保存', 'success');
  } catch (error) {
    console.error('Save error:', error);
    showToast('保存失败', 'error');
  }
}

/**
 * ��֤�ٶ�API
 */
async function validateBaiduApi() {
  const appId = document.getElementById('baiduAppId')?.value.trim();
  const secret = document.getElementById('baiduSecret')?.value.trim();
  const status = document.getElementById('baiduApiStatus');
  
  if (!appId || !secret) {
    status.textContent = '��������APP ID����Կ';
    status.className = 'api-status warning';
    return;
  }
  
  status.textContent = '��֤��...';
  status.className = 'api-status';
  
  try {
    // �ȱ�����Կ
    await chrome.storage.local.set({
      baiduAppId: appId,
      baiduSecret: secret
    });
    
    // ���Է���һ���򵥵Ĵ�
    const response = await chrome.runtime.sendMessage({
      type: 'LOOKUP_WORD',
      word: 'hello',
      api: 'baidu'
    });
    
    console.log('[Validate Baidu] Response:', response);
    
    if (response.success) {
      status.textContent = ' API��֤�ɹ���';
      status.className = 'api-status success';
    } else {
      status.textContent = ` ��֤ʧ��: ${response.error || 'δ֪����'}`;
      status.className = 'api-status error';
    }
  } catch (error) {
    console.error('[Validate Baidu] Error:', error);
    status.textContent = `��֤ʧ�ܣ�${error.message}`;
    status.className = 'api-status error';
  }
}
