# 视觉系统

青衫工具箱 的界面参考 **DeepSeek Harness Web GUI** 的主题包（`@deepseek-ai/dsh-client-ui-theme` 的 `--dsw-*` token）。目标不是逐像素复刻，而是沿用同一套设计语言：中性偏蓝的灰阶、克制的品牌蓝、黑色主按钮、细边框与大圆角。

## 原则

1. **中性色承担层级**：背景、侧栏、卡片、悬浮层用 bluish-neutral 灰阶区分，不依赖渐变、发光或大面积彩色。
2. **品牌蓝只做强调**：`#4176e6` 仅用于链接、焦点环、活动导航图标、数据进度与选中态；不做大面积背景。
3. **CTA 用 ink**：主按钮在浅色主题为近黑 `#0f1115`，深色主题为近白 `#f9fafb`，而不是蓝色。
4. **状态用点，不用色块**：进程/服务状态采用「5px 圆点 + 中性文字」，避免整块绿色/红色标签。
5. **细边框 + 大圆角**：卡片使用 `1px` 低透明度描边，圆角 16–24px；表格容器 12px。
6. **字体分工**：界面使用系统字体栈，品牌字（青衫工具箱）使用 Montserrat。

## 颜色 Token

| 语义 | 浅色 | 深色 |
| --- | --- | --- |
| 页面背景 `bg` | `#ffffff` | `#151517` |
| 侧栏 `sidebar` | `#f9fafb` | `#1b1b1c` |
| 面板 `panel` | `#ffffff` | `#232324` |
| 弱面板/指标卡 `panel-muted` | `#f5f6f7` | `#232324` |
| 导航选中 `nav-active` | `#ebeef2` | `#43454a` |
| 导航悬停 `nav-hover` | `#f1f3f5` | `#2c2c2e` |
| 主文字 | `#0f1115` | `#f9fafb` |
| 次文字 | `#61666b` | `#cfd3d6` |
| 辅助文字 | `#81858c` | `#adb2b8` |
| 极弱文字 | `#adb2b8` | `#81858c` |
| 描边 | `rgba(0,0,0,.08)` | `rgba(255,255,255,.09)` |
| 品牌蓝 `accent` | `#4176e6` | `#7aaaff` |
| 主按钮 `ink` | `#0f1115` | `#f9fafb` |
| 主按钮文字 | `#ffffff` | `#353638` |
| 成功 / 警告 / 错误 | `#22c55e` / `#f59e0b` / `#ec1313` | 同左（错误为 `#f25a5a`） |

这些值对应 DSH 的 `--dsw-static-neutral-bluish-*`、`--dsw-static-deepseek-500` 与语义别名（`--dsw-alias-bg-*`、`--dsw-alias-label-*`、`--dsw-alias-border-l*`、`--dsw-specific-sidebar-*`）。

## 圆角与尺寸

| Token | 值 | 用途 |
| --- | --- | --- |
| `radius-xs` | 4px | 微标签 |
| `radius-sm` | 8px | 状态点容器、小按钮 |
| `radius-md` | 12px | 表格容器、设置卡片、磁盘项 |
| `radius-lg` | 16px | 指标卡、网络接口卡 |
| `radius-xl` | 20px | 主面板、Hero |
| `radius-panel` | 28px | 大容器（预留） |

侧栏宽 244px；顶栏高 72px；内容区左右 32px、上 26px；页面最大宽度 1440px。

## 字体与字号

- 界面：`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", ...`
- 品牌：`Montserrat`（400/500），仅用于 青衫工具箱 字标
- 代码/数值：`"SF Mono", "JetBrains Mono", "Fira Code", Consolas, ...`
- 正文 14px；表格 12–12.5px；说明 10–11px；页面标题 18px；Hero 主机名 32px；指标数值 29px。

## 组件规则

- **按钮**：主按钮 ink 填充；次按钮浅灰填充、无描边；危险操作仅文字/图标红色。所有按钮无阴影。
- **输入框**：浅灰填充、无边框，聚焦时蓝色描边 + 3px 淡蓝光晕。
- **表格**：表头浅灰、10px 大写辅助文字；行高约 44px；1px 细分割线；无斑马纹。
- **标签**：默认中性灰；状态标签透明背景，圆点承载语义色。
- **进度**：轨道 `rgba(127,133,140,.16)`；填充为品牌蓝，≥65% 琥珀，≥85% 红。
- **浮层**：12px 圆角、轻阴影；深色主题弹层使用 `#2c2c2e`。
- **动效**：仅页面入场 4px 位移 / 0.22s，避免发光、脉冲和高亮闪烁。

## 主题切换

- 首次启动跟随系统 `prefers-color-scheme`，用户切换后写入 `localStorage["opsdeck.theme"]`。
- 开发/演示可用 `?theme=dark` 或 `?theme=light` 强制主题。
- 主题 token 同时驱动 Ant Design 的 `algorithm` 与组件级 token（Button、Table、Input、Segmented、Modal、Tooltip）。
- 桌面端通过 Tauri `set_window_theme` 同步 Windows 标题栏的明暗，避免浅色内容配深色标题栏。

## 来源

- `@deepseek-ai/dsh-client-ui-theme/lib/client.js`：浅色/深色语义 token 与静态色板。
- `design-platform.css`：`--dsw-static-*`、`--dsw-alias-*` 定义。
- `brand-font.css` + `montserrat-*.woff2`：品牌字体（SIL OFL，许可证随字体放在 `desktop/ui/src/assets/fonts/OFL.txt`）。

> 青衫工具箱 只借鉴公开设计语言与颜色尺度，不复用 DSH 的组件代码或品牌标识。
