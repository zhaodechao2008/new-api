---
kind: frontend_style
name: 前端样式系统：Tailwind CSS + shadcn/ui + OKLCH 主题变量体系
category: frontend_style
scope:
    - '**'
source_files:
    - web/src/styles/index.css
    - web/src/styles/theme.css
    - web/src/styles/theme-presets.css
    - web/src/context/theme-provider.tsx
    - web/src/context/theme-customization-provider.tsx
    - web/rsbuild.config.ts
    - web/components.json
    - web/package.json
---

## 1. 使用的系统与工具
- **构建与打包**：Rsbuild（Rspack）作为构建器，通过 `@rsbuild/plugin-react` 和 `@rsbuild/plugin-tailwindcss` 集成 React 与 Tailwind。
- **样式框架**：Tailwind CSS v4（通过 `@import 'tailwindcss'` 引入），配合 `tw-animate-css` 提供动画原子类。
- **组件库**：基于 shadcn/ui（`components.json` 中 `style: "base-nova"`、`iconLibrary: "hugeicons"`），并通过 `shad/tailwind.css` 注入样式。
- **主题系统**：自定义 OKLCH 色彩空间 + CSS 变量，通过 `theme.css` 定义基础色板，`theme-presets.css` 管理多套预设主题。
- **字体系统**：使用 `@fontsource-variable/public-sans` 和 `@fontsource-variable/lora` 提供可变字体，支持 sans/serif 字体轴切换。
- **动画库**：`motion`（Framer Motion）、`tw-animate-css`、以及自定义 CSS keyframes。

## 2. 核心文件与包
- **样式入口**：`web/src/styles/index.css` — 统一导入 Tailwind、shadcn、字体、主题文件
- **主题变量**：`web/src/styles/theme.css` — 定义 OKLCH 色板、CSS 变量、字体族
- **主题预设**：`web/src/styles/theme-presets.css` — 多套主题（underground、rose-garden、lake-view、sunset-glow、forest-whisper、ocean-breeze、lavender-dream、anthropic、simple-large）
- **主题提供者**：`web/src/context/theme-provider.tsx` — dark/light/system 主题切换
- **主题定制**：`web/src/context/theme-customization-provider.tsx` — 预设、字体、圆角、密度、布局等运行时定制
- **构建配置**：`web/rsbuild.config.ts` — Rsbuild 配置，包含 Tailwind 插件、代码分割策略
- **组件配置**：`web/components.json` — shadcn/ui 配置，定义路径别名、图标库
- **依赖声明**：`web/package.json` — 所有 UI 相关依赖

## 3. 架构与设计决策
### 3.1 分层样式架构
```
index.css (入口) → theme.css (基础变量) → theme-presets.css (主题预设)
```
- **基础层**：`theme.css` 通过 `@theme inline` 声明 Tailwind 主题变量，定义 OKLCH 色板和字体族
- **预设层**：`theme-presets.css` 通过 `[data-theme-preset='...']` 属性选择器覆盖色板
- **运行时层**：通过 `ThemeCustomizationProvider` 动态设置 `data-*` 属性实现主题切换

### 3.2 主题系统设计
- **OKLCH 色彩空间**：所有颜色使用 OKLCH 格式，提供更好的感知均匀性
- **语义化变量**：`--primary`、`--background`、`--card` 等语义变量，而非具体颜色值
- **明暗模式**：`.dark` 类选择器覆盖所有变量，实现完整的暗色主题支持
- **预设系统**：9 套预设主题，每套包含明暗两套配色方案
- **字体轴**：支持 sans/serif 两种字体风格，Anthropic 预设默认使用 serif

### 3.3 响应式与可访问性
- **移动端优化**：`@media screen and (max-width: 767px)` 防止输入框缩放
- **减少动画偏好**：`prefers-reduced-motion` 媒体查询禁用动画
- **无障碍支持**：ARIA 属性、键盘导航、焦点样式

## 4. 约定与约束
### 4.1 样式编写约定
- **优先使用 Tailwind 原子类**：组件样式主要通过 Tailwind 类组合实现
- **CSS 变量优先**：颜色、间距、圆角等设计令牌通过 CSS 变量管理
- **组件样式隔离**：复杂样式放在 `@layer components` 或 `@layer utilities` 中
- **命名约定**：使用 BEM-like 命名（如 `.json-code-editor-textarea`）

### 4.2 主题定制规则
- **数据属性驱动**：通过 `data-theme-preset`、`data-theme-font`、`data-theme-radius`、`data-theme-scale` 控制主题
- **优先级顺序**：运行时定制 > 预设主题 > 基础主题变量
- **Cookie 持久化**：用户主题偏好通过 Cookie 存储，有效期 1 年

### 4.3 构建与开发约束
- **代码分割策略**：React、UI 原语、TanStack 库分别独立分包
- **生产优化**：自动移除 console.log、代码压缩、资源优化
- **类型安全**：TypeScript + oxlint 确保代码质量
- **忽略目录**：`src/components/ui` 生成的 shadcn 组件不参与 lint 检查

### 4.4 性能优化约定
- **懒加载字体**：使用可变字体减少初始加载体积
- **动画优化**：使用 `will-change` 和 `transform` 提升动画性能
- **内容可见性**：长列表使用 `content-visibility: auto` 优化渲染
- **骨架屏**：统一的 skeleton-shimmer 动画提供加载反馈

该样式系统采用现代化的 CSS-in-JS 替代方案，通过 Tailwind CSS + CSS 变量的组合实现了高度可定制的主题系统，同时保持了良好的性能和可维护性。