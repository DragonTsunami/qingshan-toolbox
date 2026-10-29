# Web Edition（规划中）

网页端是 青衫工具箱 的第二形态，面向团队协作与审计，预计复用 `desktop/crates/devops-core` 的领域模型与错误语义，但拥有独立的 API、执行器与前端。

计划处理：

- **Git 数据记录**：仓库、提交、分支、Tag、PR/MR、审计轨迹
- **Terraform**：工作区、变量集、plan/apply、审批与漂移检测
- **Ansible**：inventory、playbook、dry-run、执行日志
- **GitHub Actions**：workflow 解析、运行历史、重跑
- **Jenkins**：Job 目录、参数化构建、队列与节点
- **Dockerfile**：最佳实践检查、分层分析、镜像构建
- **Shell**：shellcheck、危险命令识别、沙箱执行

推荐技术栈：Rust（Axum）+ PostgreSQL + 对象存储 + React（复用设计系统）。

当前阶段只交付桌面端，网页端不在本仓库实现；架构与路线见：

- [`../docs/architecture.md`](../docs/architecture.md)
- [`../docs/roadmap.md`](../docs/roadmap.md)
