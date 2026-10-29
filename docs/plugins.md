# 插件系统

青衫工具箱的插件是**声明式 bundle**：插件提供一份 `plugin.json`（以及可选的静态资源），宿主负责校验、安装、启用/停用、展示与移除。插件不会执行 JavaScript、Shell 或任意二进制代码。

## 与 DeepSeek Harness 的关系

DSH 的插件运行在 Cordis / Node / Electron 中，依赖 `ctx.slots`、Cordis 生命周期和 Electron 宿主。青衫工具箱是 Rust + Tauri + WebView2，进程模型和权限边界不同，直接嵌入会引入 Node 运行时、第三方代码执行和不受控 IPC，因此**不直接加载 DSH 插件**。

插件页的交互与信息架构参考 DSH：

| DSH 概念 | 青衫工具箱中的对应实现 |
|---|---|
| 插件页「已安装 / 发现」双标签 | 同一个插件页的两个标签 |
| 官方插件配置 / 已安装插件分组 | 「内置插件配置」/「已安装插件」 |
| 行式插件卡片、48px 图标、详情页 | 同一套视觉结构（`plugin-manager.css`） |
| enable / disable | `state.json` 中的 overrides |
| 安装 bundle | 复制本地文件夹 / 安装官方可选包 |
| 插件权限与生命周期 | manifest 校验、尺寸限制、URL 白名单、无代码执行 |

DSH 的远程 npm / Git 安装、pnpm 输出、Cordis 运行时与实验性插件协议**没有**被复制；当前实现只覆盖可安全落地的声明式 bundle 管理。

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

首次启动会自动创建目录、写入 `README.md`，并放置两个内置插件：健康巡检、版本与文档。官方可选包（磁盘清理、事件日志）只在「发现」页点击安装后才写入目录。

## 插件页

侧栏「插件」位于「概览」上方，页面包含：

- **已安装**：内置插件配置、已安装插件；行式卡片上可直接启停，点击标题/箭头进入详情。
- **发现**：官方可选插件列表，支持搜索、分类 chip、安装与查看详情。
- **添加插件**：本地文件夹路径安装；路径必须包含合法的 `plugin.json`。
- **详情**：版本、作者、来源、位置、组件、主页；已安装插件可移除，内置插件锁定。
- **插件目录**：打开资源管理器、重新扫描；底部显示当前目录。

## Manifest

```json
{
  "id": "com.example.hello",
  "name": "示例插件",
  "version": "0.1.0",
  "description": "在插件页放一条说明。",
  "author": "Example Team",
  "homepage": "https://example.com",
  "icon": "note",
  "tags": ["运维", "示例"],
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

清单必须是 UTF-8；兼容 Windows 编辑器常见的 UTF-8 BOM。安装/重扫后新插件出现在「插件」页。

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
| `tags` | 否 | 最多 6 个标签，每个最多 24 字符 |
| `enabledByDefault` | 否 | 首次扫描时是否启用，默认 `false` |
| `contributes.overview` | 否 | 最多 4 个声明式卡片 |

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

## 安装与移除

- **发现页官方可选包**：点击「安装」把内置 JSON 写入 `<plugins>/<id>/plugin.json`。
- **本地文件夹**：`plugin_install_from_path` 先 canonicalize，拒绝插件目录内部的来源，读取 `plugin.json` 校验，再复制到 `<plugins>/<id>`。
- **限制**：最多 256 个文件、总大小最多 10 MB；跳过符号链接；不允许覆盖已存在插件或内置插件。
- **移除**：`plugin_remove` 删除 `<plugins>/<id>` 并清理 override；内置插件不可移除。
- 安装失败会清理目标目录，避免半安装状态。

## 启用与停用

启停状态保存在 `plugins/state.json`：

```json
{
  "overrides": {
    "qingshan.release-links": true
  }
}
```

未出现在 `overrides` 中的插件使用 `enabledByDefault`。移除插件会清理对应 override。

## 校验与安全

- 清单最大 64 KB，超限跳过并告警。
- 插件 id、卡片 id 做字符与长度校验，阻止路径穿越式 id。
- `homepage` 与卡片链接只允许 `http://` / `https://`，拒绝 `javascript:`、`file:` 等协议。
- 单插件最多 4 个卡片；标签、链接、清单项数量有上限。
- 宿主只渲染声明数据，不加载插件提供的 HTML、JS 或本地模板。
- 打开链接使用系统默认浏览器；打开插件目录使用资源管理器。
- 无效清单不会导致整页崩溃：跳过该插件，并在页面告警。

## 开发与测试

Rust 注册表在 `desktop/crates/devops-plugins`：

```powershell
cargo test -p devops-plugins   # 9 项：种子、外部清单、BOM、启停、市场、安装/移除、路径安装
```

前端在浏览器预览模式使用 `desktop/ui/src/mock.ts` 中的可变 mock；Tauri 模式调用：

- `plugin_catalog`
- `plugin_market`
- `plugin_install`
- `plugin_install_from_path`
- `plugin_remove`
- `plugin_rescan`
- `plugin_set_enabled`
- `plugin_open_directory`
- `open_external_url`

新增字段时同步更新 `desktop/ui/src/types.ts`、`mock.ts`、`PluginManager.tsx`，并递增 `PLUGIN_API_VERSION`（仅破坏性变更需要）。
