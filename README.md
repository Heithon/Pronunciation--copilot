# English Learning Helper (IPA & AI Copilot) 🤖📚

> 你的智能英语阅读伴侣 - 实时音标、AI 深度解析、移动端完美适配

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

English Learning Helper 是一个功能强大的 Chrome 扩展，旨在为英语学习者提供从基础发音到深度语境理解的一站式辅助体验。它不仅是词典，更是你的私人 AI 英语导师。

![Preview](./docs/preview.png)
_(建议在仓库添加预览图)_

## ✨ 核心特性

### 1. 🤖 AI 语境深度分析 (Premium AI Analysis)

超越传统词典的生硬解释，利用 Google Gemini 模型提供**基于真实语境**的结构化分析：

- **📖 详细释义**: 精准的中英文定义与词性。
- **📝 语境解释**: 分析该词在当前段落中的具体用法、语义精妙之处。
- **🗣️ 发音技巧**: 提供 IPA 音标、重音位置及连读提示。
- **💡 助记技巧**: 独家提供形象记忆法、词根词缀及记忆口诀。
- **💬 场景例句**: 生成贴合当前语境的例句。

### 2. 📱 移动端与触屏完美适配 (Mobile Optimized)

无论是在 PC 还是支持扩展的安卓浏览器（如 Kiwi Browser）上，都能获得原生级体验：

- **PC 端**: `Alt + 单击` 单词触发查词。
- **移动/触屏**: **长按/选中** 单词，点击悬浮的 **🔍** 按钮即可查词。
- **Bottom Sheet UI**: 在小屏幕设备上，弹窗自动变身为底部抽屉样式，操作更顺手。

### 3. 🔡 实时音标标注

- 自动识别网页中的英语单词，并在其后方标注 IPA 音标。
- 帮助你即时掌握正确发音，扫除阅读障碍。

### 4. 🎨 极致的 UI/UX 设计

- **现代化设计**: 采用高级灰/专业蓝配色，去除了廉价感，提供专注、严肃的阅读体验。
- **丝滑交互**: 支持弹窗拖拽（PC）、点击空白关闭、平滑过渡动画。
- **暗色模式**: 自动适配浏览器的深色主题。

### 5. 🔊 多引擎语音朗读 (TTS)

- 支持 Google TTS 和浏览器原生 Web Speech API。
- 可自由调节语速（0.5x - 2.0x），满足不同听力需求。

### 6. 📖 多源词典支持

- **FreeDictionaryAPI**: 默认免费使用，提供权威英英释义。
- **百度翻译 API**: 支持配置个人 Key，获取准确的中英互译。

## 🚀 安装与设置

### 开发环境安装

1. 克隆本项目：
   ```bash
   git clone https://github.com/Heithon/Pronunciation--copilot.git
   cd Pronunciation--copilot
   ```
2. 安装依赖并构建：
   ```bash
   npm install
   npm run build
   ```
3. 在 Chrome 中加载：
   - 打开 `chrome://extensions/`
   - 开启 "开发者模式"
   - 点击 "加载已解压的扩展程序"
   - 选择项目中的 `dist` 目录

### 🔑 必需配置

为了使用 AI 分析功能，你需要配置 Google Gemini API Key：

1. 右键点击扩展图标 -> "选项" (Options)。
2. 在设置页面输入你的 Gemini API Key。
3. (可选) 如果需要高质量中英互译，可在下方配置百度翻译 API Key。

## 🛠️ 技术栈

- **核心**: Vanilla JS (原生 JavaScript) - 追求极致性能与零依赖运行时。
- **构建**: Vite + @crxjs/vite-plugin - 现代化的构建流。
- **AI**: Google Gemini API - 生成式 AI 驱动的核心分析能力。
- **样式**: CSS Variables + Flexbox/Grid - 响应式与主题系统。

## 📝 待办事项

- [ ] 支持更多 AI 模型 (Claude, GPT-4)
- [ ] 单词本/生词本功能 (导出至 Anki)
- [ ] 网页全文翻译对照

## 📄 许可证

MIT License
