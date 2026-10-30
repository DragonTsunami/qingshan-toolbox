# 路线图

## 阶段 1 · 桌面框架与视觉系统（已完成，v0.2.0）

- [x] Cargo workspace：`devops-core` / `devops-platform` / `src-tauri`
- [x] Tauri 2 + React + Ant Design 控制台
- [x] 系统概览、CPU/内存/磁盘、运行时间
- [x] 进程列表、搜索、排序、结束进程
- [x] Windows 服务枚举、启动、停止、重启
- [x] 网络接口、TCP 端口检测、DNS 解析
- [x] UAC 提权检测与重启
- [x] 深色/浅色主题、Mock 数据浏览器预览
- [x] 对齐 DeepSeek Harness 的设计 token（中性 bluish 灰阶、ink 主按钮、品牌蓝、Montserrat 品牌字）
- [x] 能力声明（capability）与命令白名单
- [ ] 自动化测试（平台层 mock、命令层集成）
- [ ] 代码签名与安装包流水线

## 阶段 2 · 桌面运维增强（P0 已完成，v0.5.0）

优先级 P0：

- [x] 日志中心：Windows Event Log Application/System/Security、关键字/级别过滤、事件详情、CSV 导出
- [ ] 日志中心扩展：应用日志文件、更多通道与实时跟随
- [x] 磁盘清理：临时文件、回收站、浏览器缓存、Windows Update 缓存，带预估与白名单
- [x] 启动项与计划任务：查看、禁用/启用（计划任务「下次运行时间」待补）
- [x] 软件清单：六列卡片展示已安装程序，优先显示真实 Windows 图标，含版本、安装日期、安装位置（卸载统一交给 Windows「应用和功能」）

优先级 P1：

- 远程协助：RDP/Quick Assist 拉起、会话信息、剪贴板传递
- 网络进阶：路由表、DNS 服务器、代理配置、连通性批量检测
- 性能采样：进程树、句柄/线程数、GPU/电池（笔记本）
- 资产上报：主机指纹、硬件、补丁级别、合规标签

## 阶段 3 · 企业能力

- 统一策略：桌面端从服务端拉取“允许/禁止操作”策略
- 资产与合规：补丁基线、磁盘加密、Defender 状态、外设管控
- 离线缓存与断点续传
- 审计与工单：危险操作留痕、审批后执行、与企业 IM/工单系统集成
- 自动更新：增量包、灰度通道、回滚

## 阶段 4 · 网页端 DevOps 控制面

### 4.1 数据与目录

- Git 仓库接入（GitHub/GitLab/Gitea/自建），提交记录、分支、Tag、PR/MR
- 环境目录：dev/staging/prod，服务与负责人
- 运行记录：谁在什么时间对哪个环境执行了什么

### 4.2 Terraform

- 工作区管理、变量集、远程 state（S3/Consul/Postgres）
- `fmt` / `validate` / `plan` / `apply` 流程，plan 差异可视化
- 审批门禁、漂移检测、成本预估（Infracost 可选）

### 4.3 Ansible

- Inventory / GroupVars / Playbook 管理
- 语法检查（ansible-lint）、dry-run、限速与并发控制
- 凭据托管（Vault）、执行日志脱敏

### 4.4 CI/CD

- GitHub Actions：workflow 解析、运行历史、重跑、日志检索
- Jenkins：Job 目录、参数化构建、队列与节点状态
- 统一“构建 → 制品 → 部署”视图

### 4.5 容器与脚本

- Dockerfile：语法/最佳实践检查、分层缓存分析、镜像构建
- Shell：`shellcheck` 集成、危险命令识别、沙箱执行
- 密钥扫描（gitleaks/trufflehog）

### 4.6 平台能力

- RBAC（团队/环境/操作）、SSO（OIDC/LDAP）
- 审计日志、操作回放、通知（邮件/Webhook/IM）
- 多租户与配额
- API 与 CLI，便于接入现有流水线

## 里程碑建议

| 版本 | 目标 | 预计 |
| --- | --- | --- |
| v0.1 | 桌面框架与单机诊断（当前） | 已完成 |
| v0.2 | 日志中心 + 磁盘清理 + 启动项 | 2–3 周 |
| v0.3 | 资产上报 + 策略下发 + 自动更新 | 4–6 周 |
| v0.4 | 网页端 Catalog + Git 记录 | 4 周 |
| v0.5 | Terraform / Ansible 执行与审批 | 6 周 |
| v0.6 | GitHub Actions / Jenkins 连接器 | 6 周 |
| v1.0 | RBAC + 审计 + 多租户 + 企业交付 | 8 周 |
