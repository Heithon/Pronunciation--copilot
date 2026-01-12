/**
 * Popup 脚本
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 获取设置
  const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  const settings = response.settings || {};
  const hasApiKey = response.hasApiKey;
  
  // 更新 API 状态
  const apiStatus = document.getElementById('apiStatus');
  if (hasApiKey) {
    apiStatus.textContent = '已配置';
    apiStatus.classList.add('active');
  } else {
    apiStatus.textContent = '未配置';
    apiStatus.classList.remove('active');
  }
  
  // 设置开关状态
  document.getElementById('enablePhonetics').checked = settings.enablePhonetics !== false;
  document.getElementById('enableDictionary').checked = settings.enableDictionary !== false;
  document.getElementById('enableTTS').checked = settings.enableTTS !== false;
  
  // 监听开关变化
  const toggles = ['enablePhonetics', 'enableDictionary', 'enableTTS'];
  toggles.forEach(id => {
    document.getElementById(id).addEventListener('change', async (e) => {
      const updates = { [id]: e.target.checked };
      await chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: { ...settings, ...updates }
      });
    });
  });
  
  // 打开设置页面
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // 刷新当前页面
  document.getElementById('refreshPage').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.reload(tab.id);
      window.close();
    }
  });
  
  // 帮助链接
  document.getElementById('helpLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com' }); // 替换为实际帮助页面
  });
});
