# UniqueRecord - 快速开始指南

## 📱 应用预览

这是一个完整的 Fluent Design 风格 UI 原型，包含 7 个主要业务页面和完整的设计系统。

---

## 🚀 快速导航

### 主要页面路径

| 页面 | 路径 | 描述 |
|------|------|------|
| 欢迎页 | `/` | 首次配置引导流程 |
| 控制台 | `/dashboard` | 主控制中心 |
| 录制历史 | `/history` | 历史记录管理 |
| 录制设置 | `/settings/recording` | 视频编码配置 |
| 检测设置 | `/settings/detection` | 游戏检测和 OBS |
| 诊断中心 | `/diagnostics` | 系统健康检查 |
| 迷你面板 | `/mini-panel` | 悬浮控制窗口 |

### 设计系统

| 页面 | 路径 | 描述 |
|------|------|------|
| Design Tokens | `/design-tokens` | 颜色、字体、间距等 |
| 组件库 | `/component-library` | 所有组件展示 |

---

## 🎨 设计亮点

### Fluent Design 特性
- ✅ **中性灰阶** - 11级灰度，清晰层级
- ✅ **Windows 蓝** - #0078d4 主强调色
- ✅ **四种状态** - Idle/Detecting/Recording/Error
- ✅ **中等圆角** - 8-10px 统一圆角
- ✅ **柔和阴影** - 4级阴影系统
- ✅ **Segoe UI** - Windows 原生字体

### 组件完整性
- 9个 Fluent 核心组件
- 5种交互状态（Default/Hover/Pressed/Focus/Disabled）
- 完整的颜色、字号、间距 Tokens
- 统一的视觉语言

---

## 📂 文件结构速览

```
src/app/
├── components/fluent/      # 9个 Fluent 组件
│   ├── Button.tsx         # 5种变体
│   ├── Card.tsx           # 卡片 + Header + Section
│   ├── TextField.tsx      # 带图标、验证
│   ├── StatusBadge.tsx    # 4种状态
│   ├── Switch.tsx         # 开关
│   ├── Dropdown.tsx       # 下拉选择
│   ├── Tabs.tsx          # 标签页
│   ├── Table.tsx         # 数据表格
│   └── Modal.tsx         # 对话框
│
├── pages/                 # 9个页面
│   ├── Welcome.tsx       # 4步引导
│   ├── Dashboard.tsx     # 主控制台
│   ├── History.tsx       # 历史管理
│   ├── SettingsRecording.tsx
│   ├── SettingsDetection.tsx
│   ├── Diagnostics.tsx
│   ├── MiniPanel.tsx
│   ├── DesignTokens.tsx  # Design System
│   └── ComponentLibrary.tsx
│
└── routes.ts             # 路由配置
```

---

## 🎯 页面功能速查

### 1. Welcome (欢迎页)
- [x] 4步引导流程
- [x] 进度指示器
- [x] 配置验证
- [x] 可返回/跳过

### 2. Dashboard (控制台)
- [x] 实时状态监控（3种状态）
- [x] 录制计时器
- [x] 统计卡片（4个）
- [x] 最近一局快速访问

### 3. History (录制历史)
- [x] 数据表格
- [x] 搜索筛选
- [x] 状态徽章
- [x] 空态展示
- [x] 批量操作

### 4. SettingsRecording (录制设置)
- [x] 5个配置区域
- [x] 推荐标记
- [x] 实时验证
- [x] 配置预估

### 5. SettingsDetection (检测设置)
- [x] 游戏检测状态
- [x] OBS 连接状态
- [x] WebSocket 配置
- [x] 测试连接

### 6. Diagnostics (诊断中心)
- [x] 5项健康检查
- [x] 错误日志
- [x] 实时日志
- [x] 导出诊断

### 7. MiniPanel (迷你面板)
- [x] 可拖拽
- [x] 实时计时
- [x] 状态切换
- [x] 快速操作

---

## 🛠️ 组件使用示例

### Button
```tsx
<Button variant="primary">保存</Button>
<Button variant="secondary">取消</Button>
<Button variant="destructive">删除</Button>
```

### Card
```tsx
<Card padding="lg">
  <CardHeader title="标题" subtitle="副标题" />
  <div>内容</div>
</Card>
```

### StatusBadge
```tsx
<StatusBadge status="recording" text="录制中" />
<StatusBadge status="success" text="已保存" size="sm" />
```

### TextField
```tsx
<TextField 
  label="保存路径"
  value={path}
  onChange={(e) => setPath(e.target.value)}
  icon={<Folder size={16} />}
/>
```

---

## 🎨 Design Tokens 快速参考

### 颜色
```css
/* 中性色 */
--neutral-0 to --neutral-100    /* 白色到黑色 */

/* Windows 蓝 */
--fluent-blue: #0078d4          /* 主色 */
--fluent-blue-hover: #106ebe    /* Hover */
--fluent-blue-pressed: #005a9e  /* Pressed */

/* 状态色 */
--status-idle: #8a8886          /* 待机 - 灰 */
--status-detecting: #0078d4     /* 检测 - 蓝 */
--status-recording: #d83b01     /* 录制 - 橙红 */
--status-error: #e81123         /* 错误 - 红 */
```

### 字号
```css
--text-xs: 11px    --text-sm: 12px    --text-base: 14px
--text-lg: 16px    --text-xl: 20px    --text-2xl: 24px
--text-3xl: 28px
```

### 间距
```css
--spacing-xs: 4px   --spacing-sm: 8px   --spacing-md: 12px
--spacing-lg: 16px  --spacing-xl: 20px  --spacing-2xl: 24px
```

### 圆角
```css
--radius-sm: 4px   --radius-md: 6px
--radius-lg: 8px   --radius-xl: 10px
```

---

## 📊 状态系统

### 应用状态
```
Idle (待机) → Detecting (检测中) → Recording (录制中)
     ↑                                     ↓
     ←←←←←←←←←← [游戏结束/手动停止] ←←←←←←←←
```

### 视觉编码
- **Idle**: 灰色图标 + "待机中" 徽章
- **Detecting**: 蓝色图标 + "检测中" 徽章
- **Recording**: 橙红图标 + "录制中" 徽章 + 计时器
- **Error**: 红色提示 + 错误信息

---

## 📝 数据结构示例

### 录制会话
```typescript
interface RecordSession {
  id: string;
  startTime: string;        // "2026-03-02 14:32:15"
  endTime: string;
  duration: string;         // "35:42"
  status: 'success' | 'recording' | 'error';
  gameMode: string;         // "排位赛"
  filePath: string;
  fileSize: string;         // "4.2 GB"
}
```

### 应用配置
```typescript
interface AppConfig {
  savePath: string;
  resolution: string;       // "1920x1080"
  fps: string;              // "60"
  bitrate: string;          // "8000"
  encoder: string;          // "x264"
  autoStart: boolean;
}
```

---

## 🔍 测试建议

### 页面测试
1. 访问每个主要路径，确认页面渲染
2. 测试侧边栏导航跳转
3. 验证组件交互（按钮、输入框、下拉框）
4. 检查状态切换（Dashboard 的 Idle/Detecting/Recording）
5. 测试空态显示（History 空态）

### 组件测试
1. 访问 `/component-library` 查看所有组件
2. 测试按钮的 5 种交互状态
3. 验证输入框的验证和错误显示
4. 检查模态对话框的打开/关闭
5. 测试下拉框的选项选择

### Design Tokens
1. 访问 `/design-tokens` 查看完整设计系统
2. 验证颜色一致性
3. 检查字号层级
4. 确认间距和圆角

---

## 📖 完整文档

- **设计系统**: `/DESIGN_SYSTEM.md`
- **页面规格**: `/PAGES_SPECIFICATION.md`
- **项目说明**: `/PROJECT_README.md`
- **快速开始**: `/QUICK_START.md` (本文件)

---

## 🎯 交付内容总结

### ✅ 7 个业务页面
1. Welcome - 首次配置引导
2. Dashboard - 主控制台
3. History - 录制历史
4. SettingsRecording - 录制设置
5. SettingsDetection - 检测设置
6. Diagnostics - 诊断中心
7. MiniPanel - 悬浮面板

### ✅ 设计系统
- 9 个 Fluent 组件
- 完整 Design Tokens
- 颜色、字号、间距、阴影规范
- 组件库展示页面
- Design Tokens 展示页面

### ✅ 文档
- 设计系统文档
- 页面功能规格
- 项目说明
- 快速开始指南

### ✅ 视觉规范
- Fluent Design 语言
- Windows 原生感
- 四种状态编码
- 统一交互规范

---

## 🚀 下一步建议

1. **连接真实数据**: 替换 mock 数据为 API 调用
2. **状态管理**: 使用 Context 或 Zustand
3. **Electron 集成**: 打包为桌面应用
4. **OBS 连接**: 实现 WebSocket 通信
5. **性能优化**: React.memo 和虚拟滚动
6. **单元测试**: Vitest + React Testing Library

---

**UniqueRecord v1.0.0**  
**设计完成日期**: 2026-03-02

一个专业、简约、高效的 Fluent Design 风格 UI 系统 ✨
