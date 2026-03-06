# UniqueRecord Fluent Design System

## 概述
UniqueRecord 采用 Microsoft Fluent Design 风格，为英雄联盟游戏录制工具提供专业、现代的 Windows 原生体验。

---

## Design Tokens

### 颜色系统 (Color Tokens)

#### 中性色阶 (Neutral Colors)
```css
--neutral-0: #ffffff    /* 纯白 - 卡片背景 */
--neutral-10: #fafafa   /* 浅灰 - 侧边栏、次级背景 */
--neutral-20: #f5f5f5   /* 浅灰 - 主背景 */
--neutral-30: #ededed   /* 浅中灰 - 禁用背景 */
--neutral-40: #e0e0e0   /* 中灰 - 边框 */
--neutral-50: #cccccc   /* 中灰 - 开关背景 */
--neutral-60: #999999   /* 深中灰 - 次要文本 */
--neutral-70: #707070   /* 深灰 - 辅助文本 */
--neutral-80: #484848   /* 深灰 */
--neutral-90: #2b2b2b   /* 极深灰 - 主文本 */
--neutral-100: #1a1a1a  /* 黑色 - 日志背景 */
```

#### Windows 蓝色系 (Fluent Blue)
```css
--fluent-blue: #0078d4          /* 主强调色 - 按钮、链接 */
--fluent-blue-hover: #106ebe    /* Hover 状态 */
--fluent-blue-pressed: #005a9e  /* Pressed 状态 */
--fluent-blue-light: #deecf9    /* 浅蓝 - 背景高亮 */
--fluent-blue-lighter: #eff6fc  /* 极浅蓝 - 激活状态背景 */
```

#### 状态色 (Status Colors)
```css
--status-idle: #8a8886         /* 待机/空闲 */
--status-detecting: #0078d4    /* 检测中 */
--status-recording: #d83b01    /* 录制中（橙红色） */
--status-error: #e81123        /* 错误/异常 */
--status-success: #107c10      /* 成功/完成 */
```

### 排版系统 (Typography)

#### 字体
```css
font-family: 'Segoe UI Variable', 'Segoe UI', Inter, -apple-system, BlinkMacSystemFont, sans-serif;
```

#### 字号 (Font Size)
```css
--text-xs: 11px    /* 微小文本 - 标签、辅助信息 */
--text-sm: 12px    /* 小文本 - 次要信息、表格 */
--text-base: 14px  /* 基础文本 - 正文、输入框 */
--text-lg: 16px    /* 大文本 - 卡片标题 */
--text-xl: 20px    /* 超大文本 - 二级标题 */
--text-2xl: 24px   /* 主标题 */
--text-3xl: 28px   /* 页面标题 */
```

#### 字重 (Font Weight)
```css
--font-weight-normal: 400    /* 普通文本 */
--font-weight-semibold: 500  /* 半粗 */
--font-weight-medium: 600    /* 中粗 - 按钮、标签 */
```

### 间距系统 (Spacing)
```css
--spacing-xs: 4px     /* 极小间距 */
--spacing-sm: 8px     /* 小间距 */
--spacing-md: 12px    /* 中间距 */
--spacing-lg: 16px    /* 大间距 */
--spacing-xl: 20px    /* 超大间距 */
--spacing-2xl: 24px   /* 2倍大间距 */
--spacing-3xl: 32px   /* 3倍大间距 */
```

### 圆角 (Border Radius)
```css
--radius-sm: 4px   /* 小圆角 - 标签、小按钮 */
--radius-md: 6px   /* 中圆角 - 输入框、下拉框 */
--radius-lg: 8px   /* 大圆角 - 卡片、对话框 */
--radius-xl: 10px  /* 超大圆角 - 特殊卡片 */
```

### 阴影 (Shadow)
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04)   /* 微阴影 */
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.08)   /* 中阴影 - 卡片 */
--shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.12)   /* 大阴影 - 下拉菜单 */
--shadow-xl: 0 8px 16px rgba(0, 0, 0, 0.14)  /* 超大阴影 - 对话框 */
```

---

## 组件库 (Components)

### Button (按钮)
路径：`/src/app/components/fluent/Button.tsx`

#### 变体 (Variants)
- `primary` - 主按钮（蓝色背景）
- `secondary` - 次级按钮（白色背景，灰色边框）
- `subtle` - 轻量按钮（透明背景）
- `accent` - 强调按钮（浅蓝背景）
- `destructive` - 危险按钮（红色背景）

#### 尺寸 (Sizes)
- `sm` - 小按钮 (px-3 py-1.5)
- `md` - 中按钮 (px-4 py-2) - 默认
- `lg` - 大按钮 (px-5 py-2.5)

#### 使用示例
```tsx
<Button variant="primary" size="md">保存</Button>
<Button variant="secondary">取消</Button>
<Button variant="destructive">删除</Button>
```

---

### Card (卡片)
路径：`/src/app/components/fluent/Card.tsx`

#### 属性
- `padding` - 内边距：'none' | 'sm' | 'md' | 'lg'
- `shadow` - 是否显示阴影（默认 true）
- `hover` - 是否启用 hover 效果

#### 子组件
- `CardHeader` - 卡片头部（标题 + 副标题 + 操作）
- `CardSection` - 卡片分段

#### 使用示例
```tsx
<Card padding="lg">
  <CardHeader title="标题" subtitle="副标题" />
  <div>内容</div>
  <CardSection>分段内容</CardSection>
</Card>
```

---

### TextField (文本输入框)
路径：`/src/app/components/fluent/TextField.tsx`

#### 属性
- `label` - 标签文本
- `error` - 错误信息
- `helperText` - 帮助文本
- `icon` - 左侧图标

#### 使用示例
```tsx
<TextField 
  label="保存目录"
  value={path}
  onChange={(e) => setPath(e.target.value)}
  icon={<Folder size={16} />}
  helperText="选择视频保存位置"
/>
```

---

### StatusBadge (状态徽章)
路径：`/src/app/components/fluent/StatusBadge.tsx`

#### 状态类型
- `idle` - 待机中（灰色）
- `detecting` - 检测中（蓝色）
- `recording` - 录制中（橙红色）
- `error` - 错误（红色）
- `success` - 成功（绿色）

#### 使用示例
```tsx
<StatusBadge status="recording" text="录制中" />
<StatusBadge status="success" text="已保存" size="sm" showDot={false} />
```

---

### Switch (开关)
路径：`/src/app/components/fluent/Switch.tsx`

#### 使用示例
```tsx
<Switch 
  checked={enabled}
  onChange={(checked) => setEnabled(checked)}
  label="自动启动"
/>
```

---

### Dropdown (下拉选择)
路径：`/src/app/components/fluent/Dropdown.tsx`

#### 选项格式
```tsx
const options = [
  { value: '1080p60', label: '1080p 60FPS', recommended: true },
  { value: '720p30', label: '720p 30FPS' },
];
```

#### 使用示例
```tsx
<Dropdown
  label="画质设置"
  options={options}
  value={quality}
  onChange={setQuality}
/>
```

---

### Table (表格)
路径：`/src/app/components/fluent/Table.tsx`

#### 列定义
```tsx
const columns = [
  { key: 'name', header: '名称', width: '200px' },
  { 
    key: 'status', 
    header: '状态',
    render: (value) => <StatusBadge status={value} text={value} />
  },
];
```

#### 使用示例
```tsx
<Table 
  columns={columns} 
  data={records}
  emptyMessage="暂无数据"
/>
```

---

### Tabs (标签页)
路径：`/src/app/components/fluent/Tabs.tsx`

#### 使用示例
```tsx
<Tabs
  tabs={[
    { id: 'tab1', label: '录制', icon: <Video size={16} /> },
    { id: 'tab2', label: '检测', icon: <Eye size={16} /> },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

---

### Modal (对话框)
路径：`/src/app/components/fluent/Modal.tsx`

#### 使用示例
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="确认删除"
  size="md"
  footer={
    <>
      <Button variant="subtle" onClick={onClose}>取消</Button>
      <Button variant="destructive" onClick={onConfirm}>删除</Button>
    </>
  }
>
  <p>确定要删除此项吗？</p>
</Modal>
```

---

## 页面结构 (Page Structure)

### 文件命名规范
- 页面文件：`PascalCase.tsx` (例如：`Dashboard.tsx`, `SettingsRecording.tsx`)
- 组件文件：`PascalCase.tsx` (例如：`Button.tsx`, `Card.tsx`)
- 工具文件：`camelCase.ts` (例如：`utils.ts`, `formatters.ts`)

### 页面布局
所有主页面使用 `AppLayout` 包裹，提供统一的侧边栏导航。

```tsx
import { AppLayout } from '../components/layout/AppLayout';

export default function PageName() {
  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* 页面内容 */}
      </div>
    </AppLayout>
  );
}
```

### 页面标题结构
```tsx
<div className="mb-8">
  <h1 className="text-[var(--text-3xl)] font-semibold mb-2">页面标题</h1>
  <p className="text-[14px] text-[var(--muted-foreground)]">
    页面描述文本
  </p>
</div>
```

---

## 交互状态 (Interaction States)

### 按钮状态
- **Default** - 默认状态
- **Hover** - 鼠标悬停（背景色加深）
- **Pressed** - 按下状态（背景色更深）
- **Focus** - 键盘焦点（显示蓝色外圈）
- **Disabled** - 禁用状态（灰色、不可点击）

### 输入框状态
- **Default** - 白色背景，灰色边框
- **Hover** - 边框颜色加深
- **Focus** - 蓝色边框 + 浅蓝色外圈
- **Error** - 红色边框 + 红色外圈
- **Disabled** - 浅灰背景，灰色文本

---

## 应用状态编码 (Application States)

### 四种核心状态
1. **Idle (待机)** - 灰色 (#8a8886)
   - 未检测到游戏运行
   - 系统空闲状态

2. **Detecting (检测中)** - 蓝色 (#0078d4)
   - 已检测到游戏客户端
   - 等待进入对局

3. **Recording (录制中)** - 橙红色 (#d83b01)
   - 正在录制游戏
   - 关键操作状态

4. **Error (错误)** - 红色 (#e81123)
   - 录制失败
   - 系统错误

---

## 响应式设计

### 目标尺寸
- 主要适配：1440 × 900 (Desktop)
- 最小宽度：1280px
- 侧边栏宽度：240px (固定)

---

## 图标系统

使用 `lucide-react` 图标库：
```tsx
import { Video, Settings, Eye } from 'lucide-react';

<Video size={18} />
<Settings size={16} className="text-[var(--fluent-blue)]" />
```

### 常用图标尺寸
- 14px - 小按钮内图标
- 16px - 输入框前置图标、标准按钮
- 18px - 侧边栏导航图标、操作按钮
- 20px - 状态指示器
- 24px+ - 大型图标、插图

---

## 开发注意事项

### CSS 变量使用
所有颜色、字号、间距都应使用 CSS 变量：
```tsx
// ✅ 正确
<div className="text-[var(--foreground)] bg-[var(--card)]">

// ❌ 错误
<div className="text-gray-900 bg-white">
```

### Tailwind 类名
- 优先使用 Fluent Design Tokens
- 避免使用 Tailwind 默认颜色类（如 `bg-blue-500`）
- 使用 `rounded-[var(--radius-lg)]` 而非 `rounded-lg`

### 组件复用
- 优先使用 `/src/app/components/fluent/` 下的组件
- 保持统一的视觉和交互体验
- 避免创建重复的组件

---

## 文件结构

```
src/app/
├── components/
│   ├── fluent/          # Fluent 组件库
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
├── pages/               # 页面组件
│   ├── Welcome.tsx      # 1. 欢迎与首次配置
│   ├── Dashboard.tsx    # 2. 主控制台
│   ├── History.tsx      # 3. 录制历史
│   ├── SettingsRecording.tsx    # 4. 录制设置
│   ├── SettingsDetection.tsx    # 5. 检测与OBS设置
│   ├── Diagnostics.tsx          # 6. 诊断中心
│   ├── MiniPanel.tsx            # 7. 悬浮迷你控制面板
│   └── DesignTokens.tsx         # Design Tokens 展示页
├── routes.ts            # 路由配置
└── App.tsx             # 应用入口

src/styles/
├── theme.css           # Design Tokens 定义
├── fonts.css           # 字体导入
├── index.css           # 全局样式
└── tailwind.css        # Tailwind 配置
```

---

## 快速开始

### 查看所有页面
1. 欢迎页：`/` 
2. 控制台：`/dashboard`
3. 录制历史：`/history`
4. 录制设置：`/settings/recording`
5. 检测设置：`/settings/detection`
6. 诊断中心：`/diagnostics`
7. 迷你面板：`/mini-panel`
8. Design Tokens：`/design-tokens`

### 开发新页面
1. 在 `/src/app/pages/` 创建新页面文件
2. 使用 `AppLayout` 包裹内容
3. 复用 Fluent 组件库
4. 添加路由到 `routes.ts`
5. 在侧边栏添加导航项（如需要）

---

## 设计原则

1. **简约优先** - 避免过度装饰，专注内容
2. **一致性** - 所有组件遵循统一的视觉语言
3. **可读性** - 清晰的层级和足够的对比度
4. **效率** - 减少用户决策成本，提供默认推荐
5. **专业** - Windows 原生感，符合 Fluent Design 规范

---

© 2026 UniqueRecord Design System
