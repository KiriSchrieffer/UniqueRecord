# UniqueRecord - 英雄联盟自动录制工具 UI

## 项目概述

UniqueRecord 是一个专为英雄联盟（League of Legends）打造的自动录制桌面应用，采用 Microsoft Fluent Design 风格设计。

### 核心功能
- ✅ 自动检测游戏开局并开始录制
- ✅ 游戏结束后自动停止录制
- ✅ 本地保存高质量视频文件
- ✅ 内置 OBS Runtime，无需额外安装

### 技术栈
- **框架**: React 18.3.1
- **路由**: React Router 7.13.0
- **样式**: Tailwind CSS 4.x + Custom CSS Variables
- **图标**: Lucide React
- **设计语言**: Microsoft Fluent Design

---

## 页面导航

### 完整用户流程（7个主要页面）

1. **欢迎与首次配置** (`/`)
   - 四步引导流程
   - 目录选择、画质配置、音频设置、开机启动

2. **主控制台 Dashboard** (`/dashboard`)
   - 实时状态监控（Idle/Detecting/Recording）
   - 录制控制按钮
   - 最近一局快速访问
   - 统计数据卡片

3. **录制历史** (`/history`)
   - 历史记录表格
   - 筛选、搜索功能
   - 状态标签（成功/录制中/异常）
   - 打开文件、播放操作

4. **设置-录制** (`/settings/recording`)
   - 分辨率/FPS/码率配置
   - 容器格式、编码器选择
   - 音频编码设置
   - 自动分割选项

5. **设置-检测与OBS** (`/settings/detection`)
   - 英雄联盟适配检测
   - WebSocket 连接参数
   - OBS Runtime 保活机制

6. **诊断中心** (`/diagnostics`)
   - 系统健康状态检查
   - 实时日志查看
   - 错误码和解决方案
   - 导出诊断报告

7. **悬浮迷你控制面板** (`/mini-panel`)
   - 轻量级悬浮窗
   - 实时状态显示
   - 快速开始/停止录制
   - 本局时长计时

### 额外页面

8. **Design Tokens** (`/design-tokens`)
   - 完整 Design System 展示
   - 颜色、字体、间距、阴影 Tokens
   - 可视化色板和示例

9. **Component Library** (`/component-library`)
   - 所有 Fluent 组件展示
   - 交互示例和代码片段
   - 各种状态演示

---

## Fluent Design 系统

### 颜色系统

#### 中性色阶
```
Neutral 0-100: #ffffff → #1a1a1a
用途：背景层级、文本、边框
```

#### Windows 蓝色强调色
```
Fluent Blue: #0078d4 (主强调色)
Hover: #106ebe
Pressed: #005a9e
Light: #deecf9
Lighter: #eff6fc
```

#### 四种应用状态
```
Idle (待机): #8a8886 - 灰色
Detecting (检测中): #0078d4 - 蓝色
Recording (录制中): #d83b01 - 橙红色
Error (错误): #e81123 - 红色
```

### 设计原则

1. **简约专业** - Windows 原生感，避免过度装饰
2. **清晰层级** - 柔和阴影、分层面板
3. **适度半透明** - Acrylic/Mica 风格（不夸张）
4. **中等圆角** - 8-10px，统一圆角系统
5. **状态明确** - 四种状态有清晰的视觉编码

### 组件库

#### 核心组件
- `Button` - 5种变体（primary/secondary/subtle/accent/destructive）
- `Card` - 卡片容器，支持阴影和 hover
- `TextField` - 文本输入，支持图标和验证
- `Dropdown` - 下拉选择，支持推荐标记
- `Switch` - 开关组件
- `StatusBadge` - 状态徽章（4种状态）
- `Tabs` - 标签页导航
- `Table` - 数据表格
- `Modal` - 模态对话框

所有组件均遵循 Fluent Design 交互规范：
- Default / Hover / Pressed / Focus / Disabled 状态完整
- 使用 CSS Variables 实现主题一致性
- 键盘导航和无障碍支持

---

## 文件结构

```
src/app/
├── components/
│   ├── fluent/              # Fluent 组件库
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── TextField.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── Switch.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Tabs.tsx
│   │   ├── Table.tsx
│   │   └── Modal.tsx
│   └── layout/              # 布局组件
│       ├── AppLayout.tsx
│       └── Sidebar.tsx
│
├── pages/                   # 页面组件
│   ├── Welcome.tsx
│   ├── Dashboard.tsx
│   ├── History.tsx
│   ├── SettingsRecording.tsx
│   ├── SettingsDetection.tsx
│   ├── Diagnostics.tsx
│   ├── MiniPanel.tsx
│   ├── DesignTokens.tsx
│   └── ComponentLibrary.tsx
│
├── routes.ts                # React Router 配置
└── App.tsx                  # 应用入口

src/styles/
├── theme.css                # Design Tokens 定义
├── fonts.css                # Segoe UI / Inter 字体
├── index.css                # 全局样式
└── tailwind.css             # Tailwind 配置
```

---

## Design Tokens 参考

### 字体大小
```css
--text-xs: 11px     /* 标签、辅助信息 */
--text-sm: 12px     /* 次要信息 */
--text-base: 14px   /* 正文、按钮 */
--text-lg: 16px     /* 卡片标题 */
--text-xl: 20px     /* 二级标题 */
--text-2xl: 24px    /* 主标题 */
--text-3xl: 28px    /* 页面标题 */
```

### 间距
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 20px
--spacing-2xl: 24px
--spacing-3xl: 32px
```

### 圆角
```css
--radius-sm: 4px
--radius-md: 6px
--radius-lg: 8px
--radius-xl: 10px
```

### 阴影
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04)
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.08)
--shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.12)
--shadow-xl: 0 8px 16px rgba(0, 0, 0, 0.14)
```

---

## 开发指南

### 快速开始

1. 访问主页面：`/` 查看欢迎流程
2. 访问 `/dashboard` 查看主控制台
3. 访问 `/design-tokens` 查看完整设计系统
4. 访问 `/component-library` 查看所有组件

### 创建新页面

```tsx
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/fluent/Card';

export default function NewPage() {
  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[var(--text-3xl)] font-semibold mb-2">
            页面标题
          </h1>
          <p className="text-[14px] text-[var(--muted-foreground)]">
            页面描述
          </p>
        </div>
        
        <Card padding="lg">
          {/* 内容 */}
        </Card>
      </div>
    </AppLayout>
  );
}
```

### 使用组件

```tsx
import { Button } from '../components/fluent/Button';
import { StatusBadge } from '../components/fluent/StatusBadge';
import { TextField } from '../components/fluent/TextField';

// 按钮
<Button variant="primary" onClick={handleSave}>保存</Button>

// 状态徽章
<StatusBadge status="recording" text="录制中" />

// 输入框
<TextField 
  label="保存路径"
  value={path}
  onChange={(e) => setPath(e.target.value)}
  icon={<Folder size={16} />}
/>
```

---

## 命名规范

### 文件命名
- **页面组件**: `PascalCase.tsx` (如 `Dashboard.tsx`)
- **组件**: `PascalCase.tsx` (如 `Button.tsx`)
- **工具函数**: `camelCase.ts`

### CSS 变量使用
```tsx
// ✅ 推荐 - 使用 Design Tokens
className="text-[var(--foreground)] bg-[var(--card)]"

// ❌ 避免 - 硬编码颜色
className="text-gray-900 bg-white"
```

### 组件 Props 命名
```tsx
interface ComponentProps {
  variant?: 'primary' | 'secondary';  // 使用 variant 而非 type
  size?: 'sm' | 'md' | 'lg';          // 标准尺寸命名
  disabled?: boolean;                  // 布尔值用 is/has/should
  className?: string;                  // 始终允许自定义类名
}
```

---

## 状态管理建议

### 应用状态
```tsx
type AppStatus = 'idle' | 'detecting' | 'recording';
```

### 录制会话
```tsx
interface RecordSession {
  id: string;
  startTime: string;
  endTime: string;
  duration: string;
  status: 'success' | 'recording' | 'error';
  filePath: string;
  fileSize: string;
}
```

---

## 响应式设计

### 目标尺寸
- **主要适配**: 1440 × 900 (Desktop)
- **最小宽度**: 1280px
- **侧边栏**: 240px (固定)
- **内容区**: `max-w-7xl` (1280px)

---

## 交付清单

### ✅ 完成项
- [x] 7个完整业务页面
- [x] 完整 Fluent Design 组件库
- [x] Design Tokens 系统
- [x] 颜色、字号、间距、阴影规范
- [x] 侧边栏导航
- [x] 四种应用状态视觉编码
- [x] 正常态、空态、加载态、错误态
- [x] 完整设计文档 (DESIGN_SYSTEM.md)
- [x] 组件库展示页面
- [x] Design Tokens 展示页面

### 📝 页面状态覆盖
- **Dashboard**: 正常态、录制态、检测态
- **History**: 正常态、空态
- **Settings**: 正常态、验证态
- **Diagnostics**: 正常态、错误态、成功态
- **Welcome**: 多步骤流程

---

## 设计规范总结

### Fluent Visual Language
- ✅ 中性灰阶 + Windows 蓝强调色
- ✅ 中等圆角 (8-10px)
- ✅ 柔和阴影（4级）
- ✅ 适度半透明效果
- ✅ 清晰的视觉层级

### Typography
- ✅ Segoe UI Variable / Inter
- ✅ 7级字号系统 (11px - 28px)
- ✅ 3级字重 (400/500/600)

### Components
- ✅ 9个核心 Fluent 组件
- ✅ 完整交互状态（5态）
- ✅ 统一的视觉语言

### Accessibility
- ✅ Focus 可见性
- ✅ 键盘导航支持
- ✅ 高对比度文本

---

## 后续开发建议

1. **连接真实数据**: 替换 mock 数据为真实 API
2. **状态管理**: 使用 Context 或状态管理库
3. **数据持久化**: localStorage / Electron Store
4. **实时更新**: WebSocket 连接 OBS Runtime
5. **性能优化**: React.memo / useMemo 优化渲染
6. **错误处理**: Error Boundary 和错误日志
7. **单元测试**: 组件和业务逻辑测试

---

## 文档索引

- **设计系统文档**: `/DESIGN_SYSTEM.md`
- **项目说明**: `/PROJECT_README.md` (本文件)
- **Design Tokens 页面**: `/design-tokens`
- **组件库页面**: `/component-library`

---

**UniqueRecord v1.0.0**  
© 2026 UniqueRecord Team

专业、简约、高效的英雄联盟录制工具 UI
