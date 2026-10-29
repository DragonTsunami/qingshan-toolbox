# 插件系统

青衫工具箱的插件是**工作台插件页中的声明式卡片**：插件提供一份 `plugin.json`，宿主负责校验、启用/停用和渲染。插件不会执行 JavaScript、Shell 或任意二进制代码。

## 为什么不是直接运行 DeepSeek Harness 插件

DeepSeek Harness 的插件运行在 Cordis / Node / Electron 中，依赖 `ctx.slots`、Cordis 生命周期和 Electron 宿主。青衫工具箱是 Rust + Tauri + WebView2，进程模型和权限边界不同，直接嵌入会引入 Node 运行时、第三方代码执行和不受控的 IPC。

这里保留 DSH 插件模型中适合桌面工具的部分：

| DSH 概念 | 青衫工具箱中的对应实现 |
|---|---|
| `package.json` + `cordis.patch.yml` | `plugin.json` manifest |
| Client 插件通过 `ctx.slots` 注入 UI | `contributes.overview[]` 声明卡片 |
| 插件 enable / disable | `state.json` 中的 overrides |
| 插件权限与生命周期 | manifest 校验、尺寸限制、URL 白名单、无代码执行 |
| `plugin_manager` 安装 bundle | 放入插件目录 + 「重新扫描」 |

## 目录

Windows 默认目录：

```text
%APPDATA%\com.qingshan.toolbox\plugins\
```

每个插件一个文件夹：

```text
plugins/
├─ README.md
├─ state.json
├─ qingshan.health-check/
│  └─ plugin.json
└─ com.example.hello/
   └─ plugin.json
```

首次启动会自动创建目录、写入 `README.md`，并放置两个内置插件：健康巡检、版本与文档。删除内置插件后，下次扫描会重新生成。

## Manifest

```json
{
  "id": "com.example.hello",
  "name": "示例插件",
  "version": "0.1.0",
  "description": "在概览上放一条说明。",
  "author": "Example Team",
  "homepage": "https://example.com",
  "icon": "note",
  "enabledByDefault": true,
  "contributes": {
    "overview": [
      {
        "id": "hello",
        "title": "Hello",
        "kind": "note",
        "body": "把 plugin.json 放进插件目录即可。"
      }
    ]
  }
}
```

清单必须是 UTF-8；兼容 Windows 编辑器常见的 UTF-8 BOM。重扫后新插件立即出现在工作台「插件」页与管理弹窗。

### 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | 3–64 个字符，字母或数字开头，只允许字母、数字、`.`、`_`、`-` |
| `name` | 是 | 显示名称，最多 80 字符 |
| `version` | 是 | 最多 32 字符，只允许字母、数字、`.`、`-`、`+` |
| `description` | 否 | 最多 280 字符 |
| `author` | 否 | 最多 80 字符 |
| `homepage` | 否 | 必须是 `https://` 或 `http://` |
| `icon` | 否 | `pulse` / `link` / `shield` / `note`，未知值回退为说明图标 |
| `enabledByDefault` | 否 | 首次扫描时是否启用，默认 `false` |
| `contributes.overview` | 否 | 最多 4 个概览卡片 |

### 卡片

通用字段：

| 字段 | 说明 |
|---|---|
| `id` | 插件内唯一，规则同插件 id |
| `title` | 卡片标题 |
| `kind` | `note` / `checklist` / `links` / `health` |
| `body` | 正文，最多 600 字符 |
| `items` | `checklist` 的清单项，最多 8 项 |
| `links` | `links` 的链接，最多 6 个；URL 只允许 http(s) |
| `health` | `health` 的阈值配置 |

`health`：

```json
{
  "memoryMaxPercent": 85,
  "systemDiskMaxPercent": 90,
  "requireElevation": false
}
```

检查项在概览渲染时读取当前快照，不会额外采样；超过阈值显示红色状态。

## 启用与停用

启停状态保存在 `plugins/state.json`：

```json
{
  "overrides": {
    "qingshan.release-links": true
  }
}
```

未出现在 `overrides` 中的插件使用 `enabledByDefault`。移除插件文件夹不会自动删除 override；重新放回后沿用上次状态。

## 校验与安全

- 清单最大 64 KB，超限跳过并告警。
- 插件 id、卡片 id 做字符与长度校验，阻止路径穿越式 id。
- `homepage` 与卡片链接只允许 `http://` / `https://`，拒绝 `javascript:`、`file:` 等协议。
- 单插件最多 4 个卡片；清单/链接数量有上限。
- 宿主只渲染声明数据，不加载插件提供的 HTML、JS 或本地模板。
- 打开链接使用系统默认浏览器；打开插件目录使用资源管理器。
- 无效清单不会导致整个插件页崩溃：跳过该插件，并在管理弹窗显示告警。

## 开发与测试

Rust 注册表在 `desktop/crates/devops-plugins`：

```powershell
cargo test -p devops-plugins   # 7 项：种子、外部清单、BOM、启停持久化、校验
```

前端在浏览器预览模式使用 `desktop/ui/src/mock.ts` 中的可变 mock catalog；Tauri 模式调用：

- `plugin_catalog`
- `plugin_rescan`
- `plugin_set_enabled`
- `plugin_open_directory`
- `open_external_url`

新增字段时同步更新 `desktop/ui/src/types.ts`、mock、`PluginPanel.tsx`，并递增 `PLUGIN_API_VERSION`（仅破坏性变更需要）。
