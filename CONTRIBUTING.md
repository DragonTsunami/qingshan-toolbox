# Contributing to QingShan Toolbox / 参与贡献青衫工具箱

Thank you for considering contributing to QingShan Toolbox! Every contribution helps make this tool better for IT operations professionals.

感谢您考虑为青衫工具箱做出贡献！每一份贡献都能让这个工具变得更好。

---

## 📋 Table of Contents / 目录

- [Code of Conduct / 行为准则](#code-of-conduct--行为准则)
- [How to Report Bugs / 如何报告 Bug](#how-to-report-bugs--如何报告-bug)
- [How to Suggest Features / 如何建议新功能](#how-to-suggest-features--如何建议新功能)
- [Development Setup / 开发环境搭建](#development-setup--开发环境搭建)
- [Code Style / 代码风格](#code-style--代码风格)
- [Pull Request Process / PR 流程](#pull-request-process--pr-流程)

---

## Code of Conduct / 行为准则

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

本项目遵循 [Contributor Covenant 行为准则](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)。参与本项目即表示您同意遵守该准则。如发现不当行为，请联系项目维护者。

---

## How to Report Bugs / 如何报告 Bug

Found a bug? We appreciate your help in making QingShan Toolbox better!

发现了 Bug？感谢您帮助我们改进青衫工具箱！

### Before Reporting / 报告前请确认

1. **Search existing issues** — Check if the bug has already been reported.
   **搜索已有 Issue** — 检查该 Bug 是否已被报告。

2. **Use the latest version** — Make sure you're using the latest release.
   **使用最新版本** — 确保您使用的是最新版本。

3. **Reproduce the issue** — Confirm you can consistently reproduce it.
   **复现问题** — 确认您可以稳定复现该问题。

### Bug Report Template / Bug 报告模板

Use our [bug report template](https://github.com/qingshan/toolbox/issues/new?template=bug_report.md) or include the following:

请使用我们的 [Bug 报告模板](https://github.com/qingshan/toolbox/issues/new?template=bug_report.md)，或包含以下信息：

```
**Description / 描述:**
A clear and concise description of the bug.

**Steps to Reproduce / 复现步骤:**
1. Run `qstoolbox ...`
2. ...

**Expected Behavior / 预期行为:**
What you expected to happen.

**Actual Behavior / 实际行为:**
What actually happened.

**Environment / 环境信息:**
- OS: Windows 11 / Windows Server 2022
- QingShan Toolbox version: v0.1.0
- Go version (if building from source): go1.22.0
```

---

## How to Suggest Features / 如何建议新功能

We'd love to hear your ideas! Please use our [feature request template](https://github.com/qingshan/toolbox/issues/new?template=feature_request.md).

我们很乐意听取您的想法！请使用我们的 [功能请求模板](https://github.com/qingshan/toolbox/issues/new?template=feature_request.md)。

When suggesting a feature, please include:
提交功能建议时，请包含以下内容：

- **Use case** — What problem does this solve? / 解决什么问题？
- **Proposed solution** — How do you envision it working? / 您设想的方案是什么？
- **Alternatives** — Have you considered other approaches? / 是否考虑过其他方案？

---

## Development Setup / 开发环境搭建

### Prerequisites / 前置要求

| Requirement | Version |
|------------|---------|
| **Go** | 1.22 or higher |
| **Git** | Latest |
| **golangci-lint** | Latest (recommended) |

### Getting Started / 开始开发

```bash
# 1. Fork and clone the repository / Fork 并克隆仓库
git clone https://github.com/<your-username>/toolbox.git
cd toolbox

# 2. Install dependencies / 安装依赖
go mod download

# 3. Build the project / 构建项目
go build -o qstoolbox.exe ./cmd/qstoolbox

# 4. Run tests / 运行测试
go test ./...

# 5. Run linter / 运行代码检查
golangci-lint run

# 6. Verify it works / 验证是否正常工作
./qstoolbox.exe version
```

### Project Structure / 项目结构

```
├── cmd/qstoolbox/       # CLI entry point / CLI 入口
├── internal/            # Internal packages / 内部包
│   ├── health/          # System health / 系统健康检查
│   ├── service/         # Service mgmt / 服务管理
│   ├── logview/         # Log viewer / 日志查看
│   ├── ssh/             # SSH execution / SSH 远程执行
│   ├── inventory/       # Asset inventory / 资产清单
│   ├── network/         # Network tools / 网络诊断
│   ├── cleanup/         # Disk cleanup / 磁盘清理
│   ├── backup/          # Backup mgmt / 备份管理
│   └── config/          # Configuration / 配置管理
├── pkg/util/            # Shared utilities / 通用工具
├── docs/                # Documentation / 文档
└── scripts/             # Scripts / 脚本
```

---

## Code Style / 代码风格

### General Rules / 通用规则

1. **Follow Go conventions** — Use `gofmt` and `goimports`.
   **遵循 Go 惯例** — 使用 `gofmt` 和 `goimports` 格式化代码。

2. **Write meaningful comments** — All exported types and functions must have godoc comments.
   **编写有意义的注释** — 所有导出的类型和函数必须有 godoc 注释。

3. **Error handling** — Always handle errors explicitly. Never use `_` to discard errors silently.
   **错误处理** — 始终显式处理错误，不要使用 `_` 静默忽略错误。

4. **Testing** — Write unit tests for new features. Aim for meaningful coverage, not just percentage.
   **测试** — 为新功能编写单元测试。追求有意义的覆盖率，而不仅仅是数字。

5. **Naming** — Use clear, descriptive names. Follow Go naming conventions (camelCase for unexported, PascalCase for exported).
   **命名** — 使用清晰、有描述性的名称。遵循 Go 命名规范。

### Commit Messages / 提交信息

We follow [Conventional Commits](https://www.conventionalcommits.org/):

我们遵循 [约定式提交](https://www.conventionalcommits.org/)：

```
feat: add port scan functionality to network module
fix: resolve service restart timeout on Windows Server
docs: update SSH module documentation
test: add unit tests for backup retention logic
chore: update golangci-lint configuration
refactor: simplify health check data collection
```

### Branch Naming / 分支命名

```
feature/add-port-scan
fix/service-restart-timeout
docs/update-ssh-docs
```

---

## Pull Request Process / PR 流程

### Step-by-step / 步骤

1. **Fork the repository** and create your branch from `main`.
   **Fork 仓库** 并从 `main` 创建分支。

2. **Make your changes** with proper tests and documentation.
   **进行修改**，附带测试和文档。

3. **Run the full test suite** before submitting:
   **提交前运行完整测试**：
   ```bash
   go test ./...
   golangci-lint run
   ```

4. **Submit a Pull Request** using our [PR template](.github/PULL_REQUEST_TEMPLATE.md).
   **提交 Pull Request**，使用我们的 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)。

5. **Respond to review feedback** promptly.
   **及时回复审查意见**。

### PR Requirements / PR 要求

- [ ] All tests pass / 所有测试通过
- [ ] Linter passes / 代码检查通过
- [ ] New code has tests / 新代码有测试
- [ ] Documentation is updated / 文档已更新
- [ ] Commit messages follow conventions / 提交信息遵循规范
- [ ] PR description explains the changes / PR 描述说明了修改内容

### Review Process / 审查流程

1. A maintainer will review your PR within a few days.
   维护者会在几天内审查您的 PR。

2. You may be asked to make changes — this is normal and part of the collaborative process.
   您可能会被要求修改 — 这是正常的协作过程。

3. Once approved, a maintainer will merge your PR.
   一旦通过审查，维护者将合并您的 PR。

---

## 🙏 Thank You / 感谢

Every contribution matters — whether it's fixing a typo, reporting a bug, or implementing a new feature. Thank you for helping make QingShan Toolbox better!

每一份贡献都很重要 — 无论是修复一个错字、报告一个 Bug，还是实现一个新功能。感谢您帮助青衫工具箱变得更好！
