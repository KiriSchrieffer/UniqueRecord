# UniqueRecord - 英雄联盟自动录制工具

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.3.1-61dafb)
![Fluent Design](https://img.shields.io/badge/Fluent%20Design-Microsoft-0078d4)
![Status](https://img.shields.io/badge/status-完成-success)

**专业 · 简约 · 高效的 Windows 桌面应用 UI**

[查看演示](#页面预览) · [设计系统](DESIGN_SYSTEM.md) · [快速开始](QUICK_START.md)

</div>

---

## 📱 项目简介

UniqueRecord 是一个专为英雄联盟（League of Legends）打造的自动录制桌面应用，采用 **Microsoft Fluent Design** 风格设计。

### 核心功能
- 🎮 **自动检测游戏开局**并开始录制
- ⏱️ **游戏结束后自动停止**录制
- 💾 **本地保存**高质量视频文件
- 🛠️ **内置 OBS Runtime**，无需额外安装

---

## ✨ 设计亮点

### Fluent Design 特性
- ✅ **中性灰阶** - 11级灰度，清晰层级
- ✅ **Windows 蓝** - #0078d4 主强调色
- ✅ **四种状态** - Idle/Detecting/Recording/Error
- ✅ **中等圆角** - 8-10px 统一圆角
- ✅ **柔和阴影** - 4级阴影系统
- ✅ **Segoe UI** - Windows 原生字体

### 完整的用户流程
1. **欢迎页** - 4步引导配置
2. **控制台** - 实时状态监控
3. **历史记录** - 管理所有录制
4. **设置页面** - 详细参数配置
5. **诊断中心** - 系统健康检查
6. **迷你面板** - 游戏中快速控制

---

## 🎯 页面预览

### 主要页面

| 页面 | 路径 | 功能 |
|------|------|------|
| 🏠 **首页** | `/` | 页面导航索引 |
| 👋 **欢迎配置** | `/welcome` | 4步引导流程 |
| 📊 **控制台** | `/dashboard` | 主控制中心 |
| 📜 **录制历史** | `/history` | 历史记录管理 |
| ⚙️ **录制设置** | `/settings/recording` | 视频编码配置 |
| 🔍 **检测设置** | `/settings/detection` | 游戏检测与OBS |
| 🏥 **诊断中心** | `/diagnostics` | 系统健康检查 |
| 📱 **迷你面板** | `/mini-panel` | 悬浮控制窗口 |

### 设计系统

| 页面 | 路径 | 内容 |
|------|------|------|
| 🎨 **Design Tokens** | `/design-tokens` | 颜色、字号、间距等 |
| 📦 **Component Library** | `/component-library` | 组件库展示 |

---

## 🧩 组件库

### 9个 Fluent 核心组件

| 组件 | 功能 | 特性 |
|------|------|------|
| **Button** | 按钮 | 5种变体, 3种尺寸 |
| **Card** | 卡片容器 | Header, Section, Hover |
| **TextField** | 文本输入 | 图标, 验证, 帮助文本 |
| **StatusBadge** | 状态徽章 | 4种状态, 2种尺寸 |
| **Switch** | 开关 | 启用/禁用状态 |
| **Dropdown** | 下拉选择 | 推荐标记, 搜索 |
| **Tabs** | 标签页 | 图标支持 |
| **Table** | 数据表格 | 自定义渲染, 排序 |
| **Modal** | 对话框 | 3种尺寸, 自定义底部 |

**所有组件支持**:
- ✅ 5种交互状态 (Default/Hover/Pressed/Focus/Disabled)
- ✅ Design Tokens (CSS Variables)
- ✅ 键盘导航
- ✅ TypeScript 类型

---

## 🎨 Design System

### 颜色系统

#### 中性灰阶
```css
--neutral-0: #ffffff    /* 纯白 */
--neutral-20: #f5f5f5   /* 主背景 */
--neutral-40: #e0e0e0   /* 边框 */
--neutral-60: #999999   /* 次要文本 */
--neutral-90: #2b2b2b   /* 主文本 */
--neutral-100: #1a1a1a  /* 黑色 */
```

#### Windows 蓝强调色
```css
--fluent-blue: #0078d4          /* 主色 */
--fluent-blue-hover: #106ebe    /* Hover */
--fluent-blue-pressed: #005a9e  /* Pressed */
```

#### 应用状态色
```css
--status-idle: #8a8886         /* 待机 - 灰 */
--status-detecting: #0078d4    /* 检测 - 蓝 */
--status-recording: #d83b01    /* 录制 - 橙红 */
--status-error: #e81123        /* 错误 - 红 */
```

### 排版系统
```css
/* 字号 */
--text-xs: 11px   --text-sm: 12px   --text-base: 14px
--text-lg: 16px   --text-xl: 20px   --text-2xl: 24px

/* 间距 */
--spacing-xs: 4px   --spacing-sm: 8px   --spacing-md: 12px
--spacing-lg: 16px  --spacing-xl: 20px  --spacing-2xl: 24px

/* 圆角 */
--radius-sm: 4px   --radius-md: 6px
--radius-lg: 8px   --radius-xl: 10px
```

---

## 🚀 快速开始

### 1. 访问首页
打开应用，自动跳转到首页 `/`，查看所有页面的导航卡片。

### 2. 浏览页面
```
/welcome      → 首次配置引导
/dashboard    → 主控制台
/history      → 录制历史
/settings/*   → 设置页面
/diagnostics  → 诊断中心
```

### 3. 查看设计系统
```
/design-tokens        → Design Tokens 展示
/component-library    → 组件库演示
```

---

## 💻 技术栈

```json
{
  "react": "18.3.1",
  "react-router": "7.13.0",
  "tailwindcss": "4.1.12",
  "lucide-react": "0.487.0"
}
```

---

## 📂 文件结构

```
src/app/
├── components/
│   ├── fluent/          # 9个 Fluent 组件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── TextField.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── Switch.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Tabs.tsx
│   │   ├── Table.tsx
│   │   └── Modal.tsx
│   └── layout/          # 布局组件
│       ├── AppLayout.tsx
│       └── Sidebar.tsx
│
├── pages/               # 10个页面
│   ├── Index.tsx        # 首页导航
│   ├── Welcome.tsx      # 欢迎配置
│   ├── Dashboard.tsx    # 主控制台
│   ├── History.tsx      # 录制历史
│   ├── SettingsRecording.tsx
│   ├── SettingsDetection.tsx
│   ├── Diagnostics.tsx
│   ├── MiniPanel.tsx
│   ├── DesignTokens.tsx
│   └── ComponentLibrary.tsx
│
├── routes.ts            # 路由配置
└── App.tsx             # 应用入口

src/styles/
├── theme.css           # Design Tokens
├── fonts.css           # 字体导入
├── index.css           # 全局样式
└── tailwind.css        # Tailwind 配置
```

---

## 📖 完整文档

| 文档 | 内容 |
|------|------|
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | 设计系统完整文档 |
| [PAGES_SPECIFICATION.md](PAGES_SPECIFICATION.md) | 页面功能规格说明 |
| [PROJECT_README.md](PROJECT_README.md) | 项目详细说明 |
| [QUICK_START.md](QUICK_START.md) | 快速开始指南 |
| [DELIVERY_SUMMARY.md](DELIVERY_SUMMARY.md) | 交付总结 |

---

## 🛠️ 组件使用示例

### Button
```tsx
import { Button } from './components/fluent/Button';

<Button variant="primary">保存</Button>
<Button variant="secondary">取消</Button>
<Button variant="destructive">删除</Button>
```

### Card
```tsx
import { Card, CardHeader } from './components/fluent/Card';

<Card padding="lg">
  <CardHeader title="标题" subtitle="副标题" />
  <div>内容</div>
</Card>
```

### StatusBadge
```tsx
import { StatusBadge } from './components/fluent/StatusBadge';

<StatusBadge status="recording" text="录制中" />
<StatusBadge status="success" text="已保存" size="sm" />
```

---

## 📊 应用状态系统

```
应用启动
    ↓
[Idle] 待机中 (灰色)
    ↓ 检测到游戏客户端
[Detecting] 检测中 (蓝色)
    ↓ 进入对局
[Recording] 录制中 (橙红色)
    ↓ 游戏结束/手动停止
保存文件 → 返回 [Detecting]
```

---

## ✅ 交付清单

### 页面 (10个)
- [x] 首页导航
- [x] 欢迎配置（4步）
- [x] 主控制台
- [x] 录制历史
- [x] 录制设置
- [x] 检测设置
- [x] 诊断中心
- [x] 迷你面板
- [x] Design Tokens 展示
- [x] Component Library 展示

### 组件 (9个)
- [x] Button (5变体, 3尺寸)
- [x] Card (Header, Section)
- [x] TextField (图标, 验证)
- [x] StatusBadge (4状态)
- [x] Switch
- [x] Dropdown
- [x] Tabs
- [x] Table
- [x] Modal

### 设计系统
- [x] Design Tokens 完整定义
- [x] 颜色系统 (26个 tokens)
- [x] 排版系统 (7个字号)
- [x] 间距系统 (7级)
- [x] 圆角系统 (4级)
- [x] 阴影系统 (4级)

### 文档
- [x] 设计系统文档
- [x] 页面功能规格
- [x] 项目说明
- [x] 快速开始指南
- [x] 交付总结

---

## 🎯 特色功能

### 1. 完整的用户流程
从首次使用配置到日常录制管理，覆盖所有使用场景。

### 2. 专业的 Fluent Design
严格遵循 Microsoft Fluent Design 规范，Windows 原生感。

### 3. 统一的状态编码
4种应用状态（Idle/Detecting/Recording/Error）有明确的视觉区分。

### 4. 可复用的组件系统
9个 Fluent 组件，完整的交互状态，统一的 API 设计。

### 5. 详尽的开发文档
5份完整文档，涵盖设计系统、功能规格、使用指南。

---

## 🔮 后续开发建议

1. **数据集成** - 连接真实 API，实现 OBS WebSocket 通信
2. **功能增强** - 实时计时器、高级筛选、批量操作
3. **性能优化** - React.memo、虚拟滚动、懒加载
4. **测试** - 单元测试、组件测试、E2E 测试
5. **打包** - Electron 集成、Windows 安装包

---

## 📄 开源协议

本项目为商业项目，版权所有。

---

## 🙏 致谢

- [Microsoft Fluent Design](https://www.microsoft.com/design/fluent/) - 设计语言参考
- [React](https://react.dev/) - UI 框架
- [Tailwind CSS](https://tailwindcss.com/) - 样式系统
- [Lucide Icons](https://lucide.dev/) - 图标库

---

<div align="center">

**UniqueRecord v1.0.0**

专业 · 简约 · 高效的 Fluent Design UI

© 2026 UniqueRecord Team

</div>
