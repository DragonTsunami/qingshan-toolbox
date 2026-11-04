import React, { useMemo, useState } from "react";
import {
  AlertOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DatabaseOutlined,
  ExpandAltOutlined,
  FireOutlined,
  GlobalOutlined,
  HddOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  WarningOutlined,
  WindowsOutlined,
} from "@ant-design/icons";
import { Button, Empty, Input, Modal, Tag, Tooltip, message } from "antd";
import "../knowledge.css";

export type SeverityLevel = "danger" | "urgent" | "warning" | "common";

interface TroubleshootingItem {
  id: string;
  category: "docker" | "linux" | "network" | "database" | "windows";
  severity: SeverityLevel;
  title: string;
  errorCode?: string;
  symptom: string;
  rootCause: string;
  diagnosticSteps: string[];
  command: string;
  solution: string;
  bestPractice: string;
}

const KNOWLEDGE_BASE: TroubleshootingItem[] = [
  // --- 危险级 (Danger) ---
  {
    id: "docker-oom",
    category: "docker",
    severity: "danger",
    title: "容器突发 Exit 137 (OOMKilled 强杀)",
    errorCode: "OOMKilled: true (Exit Code 137)",
    symptom:
      "容器无预警 Crash 停止，docker inspect 返回 \"OOMKilled\": true, \"ExitCode\": 137，服务彻底中断。",
    rootCause:
      "容器内应用内存占用击穿了 Docker Cgroups 内存配额，被 Linux 内核 OOM Killer 强行发送 SIGKILL (9) 处决（128 + 9 = 137）。",
    diagnosticSteps: [
      "查验宿主机内核 OOM 拦截记录：dmesg -T | grep -E -i 'killed process|oom-killer'",
      "核对容器内存限制阈值：docker inspect <容器名> | grep -i memory",
      "实时监控容器内存消耗：docker stats --no-stream",
    ],
    command: "dmesg -T | grep -E -i 'killed process|oom-killer' | tail -n 15",
    solution:
      "1. 临时调大 compose 或 run 中的 memory limit；\n2. 若为 Java 容器，配置 -XX:+UseContainerSupport 并预留 25% 堆外与元空间冗余；\n3. 定位是否存在堆内对象泄漏或未关闭资源。",
    bestPractice:
      "生产容器禁止裸跑无 limit，同时内存上限应设置在应用峰值的 1.3 倍以上，严禁紧贴临界值。",
  },
  {
    id: "docker-iptables",
    category: "docker",
    severity: "danger",
    title: "Docker 端口映射报错 iptables failed 容器全阻断",
    errorCode: "driver failed programming external connectivity",
    symptom:
      "启动容器映射端口时抛错：\nError response from daemon: driver failed programming external connectivity ... (iptables failed: No chain/target/match by that name)",
    rootCause:
      "宿主机重启了 firewalld 或 iptables，导致 Docker 注入在内核 nat/filter 表的自定义 DOCKER 链被全量刷掉丢失。",
    diagnosticSteps: [
      "检查 iptables 中的 DOCKER 链：iptables -L -n -v | grep DOCKER",
      "检查 firewalld 服务状态：systemctl status firewalld",
      "检查 Docker 服务健康度：systemctl status docker",
    ],
    command: "systemctl restart docker",
    solution:
      "直接重启 Docker 服务即可自动重建所需的 iptables/nat 自定义链。若使用 firewalld，务必先启动 firewalld 再启动 docker。",
    bestPractice:
      "在 /etc/docker/daemon.json 中配置 \"iptables\": true，或配置 systemd 依赖关系使得 docker 在防火墙就绪后再启动。",
  },
  {
    id: "db-redis-misconf",
    category: "database",
    severity: "danger",
    title: "Redis 拒绝所有写入: MISCONF RDB 持久化阻断",
    errorCode: "MISCONF Errors writing to the AOF/RDB",
    symptom:
      "Redis 拒绝所有 set/hset 等写操作，返回：MISCONF Redis is configured to save RDB snapshots, but is currently not able to persist on disk.",
    rootCause:
      "Redis 执行 BGSAVE 生成快照需要 fork() 子进程。Linux 内核内存过量分配策略（vm.overcommit_memory=0）判定内存不足拒绝 fork。",
    diagnosticSteps: [
      "检查内核内存预留分配策略：sysctl vm.overcommit_memory",
      "检查 Redis 持久化状态：redis-cli info persistence",
    ],
    command: "sudo sysctl vm.overcommit_memory=1 && redis-cli config set stop-writes-on-bgsave-error no",
    solution:
      "1. 紧急恢复写入：redis-cli config set stop-writes-on-bgsave-error no；\n2. 永久根治：执行 sudo sysctl vm.overcommit_memory=1 并写入 /etc/sysctl.conf 重载。",
    bestPractice:
      "Redis 初始化基线参数：vm.overcommit_memory=1、禁用 Transparent Huge Pages (THP)、调大 somaxconn 至 2048。",
  },

  // --- 紧急级 (Urgent) ---
  {
    id: "db-mysql-connections",
    category: "database",
    severity: "urgent",
    title: "MySQL 报 Too many connections 拒绝新连接",
    errorCode: "Error 1040 (HY000): Too many connections",
    symptom:
      "所有业务服务与前端报错：Communications link failure: Error 1040: Too many connections，运维连控制台都无法登录。",
    rootCause:
      "活动连接数达到了 MySQL 的 max_connections 上限。通常由后端应用突发流量并发冲顶、连接池泄漏、或慢 SQL 引起连接堆积。",
    diagnosticSteps: [
      "利用预留的 1 个专属连接登录：mysql -u root -p -h 127.0.0.1",
      "查看当前最大连接配置：SHOW VARIABLES LIKE 'max_connections';",
      "查看当前各线程活动状态：SHOW FULL PROCESSLIST;",
    ],
    command: "mysql -u root -p -e \"SET GLOBAL max_connections = 2000; SHOW FULL PROCESSLIST;\"",
    solution:
      "1. 紧急动态调大连接数：SET GLOBAL max_connections = 2000;（无需重启）；\n2. 执行 SHOW PROCESSLIST 查找处于 Locked 的慢查询，KILL <ID> 斩断。",
    bestPractice:
      "在 my.cnf 中持久化 max_connections，并合理调小 wait_timeout（如从 28800 缩短为 600）及时回收死连接。",
  },
  {
    id: "db-mysql-lock-timeout",
    category: "database",
    severity: "urgent",
    title: "MySQL 行锁事务超时: Lock wait timeout",
    errorCode: "Error 1205: Lock wait timeout exceeded",
    symptom:
      "业务写入 SQL 偶发超时失败：ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction。",
    rootCause:
      "前序未提交的长事务锁定了目标行锁或间隙锁，后续事务等待超过了 innodb_lock_wait_timeout（默认 50 秒）限制。",
    diagnosticSteps: [
      "查询正在阻塞运行的长事务：SELECT * FROM information_schema.innodb_trx\\G",
      "查询锁等待关联：SELECT * FROM performance_schema.data_lock_waits\\G",
    ],
    command: "mysql -u root -p -e \"SELECT trx_id, trx_state, trx_started, trx_query, trx_mysql_thread_id FROM information_schema.innodb_trx ORDER BY trx_started ASC;\"",
    solution:
      "根据查询结果中的 trx_mysql_thread_id，执行 KILL <thread_id> 强行斩断占锁的长事务释放行锁。",
    bestPractice:
      "严格要求研发事务切小切短，禁止在事务内混杂 RPC 远程调用或大批次耗时循环更新。",
  },
  {
    id: "net-time-wait",
    category: "network",
    severity: "urgent",
    title: "TIME_WAIT 连接过多导致端口耗尽",
    errorCode: "EADDRNOTAVAIL (TIME_WAIT Exhaustion)",
    symptom:
      "高并发反向代理或网关抛出报错：connect() failed (99: Cannot assign requested address)，无法发起对外新连接。",
    rootCause:
      "主动关闭 TCP 连接方需停留 2MSL 时间的 TIME_WAIT 状态。极端高频短连接场景下，本地临时端口范围（通常 28232 个）被耗尽未释放。",
    diagnosticSteps: [
      "统计各状态 TCP 连接数量：ss -ant | awk '{print $1}' | sort | uniq -c",
      "查看本地端口分配范围：cat /proc/sys/net/ipv4/ip_local_port_range",
    ],
    command: "sudo sysctl -w net.ipv4.tcp_tw_reuse=1",
    solution:
      "1. 开启安全端口复用：在 /etc/sysctl.conf 中配置 net.ipv4.tcp_tw_reuse = 1 并执行 sysctl -p；\n2. 扩大本地端口范围：net.ipv4.ip_local_port_range = 10240 65535；\n3. 在 Nginx 等反向代理开启 upstream keepalive 连接池长连接复用。",
    bestPractice:
      "绝对不要开启过时的 net.ipv4.tcp_tw_recycle（Linux 4.12 已被移除，公网 NAT 环境会导致合法连接被丢弃）。",
  },
  {
    id: "win-service-stopping",
    category: "windows",
    severity: "urgent",
    title: "Windows 服务卡在 Stopping 状态且按钮置灰",
    errorCode: "Service Stuck in 'Stopping' State",
    symptom:
      "在 services.msc 控制台中停止某个服务，状态一直显示为“正在停止”，启动/停止按钮不可点击，无法重新拉起。",
    rootCause:
      "服务主进程在执行关闭钩子或释放句柄时死锁或异常挂死，没有及时向 Windows SCM (服务控制管理器) 汇报 STOPPED 状态更新。",
    diagnosticSteps: [
      "通过 sc 查询该服务的底层专属 PID：sc queryex <服务名>",
    ],
    command: "sc queryex <服务名> && taskkill /f /pid <查询出的PID>",
    solution:
      "运行 sc queryex 查出 PID_STATE 中的 PID 号，随后使用 taskkill /f /pid <PID> 强行终结对应挂死进程，SCM 即可恢复正常初始态。",
    bestPractice:
      "对于自研的 Windows Service，务必在 OnStop 生命周期内加入超时退出防护，防止单线程阻塞整个服务宿主。",
  },

  // --- 重点级 (Warning) ---
  {
    id: "linux-nofile",
    category: "linux",
    severity: "warning",
    title: "系统句柄超限: Too many open files",
    errorCode: "EMFILE / ENFILE (File Descriptors)",
    symptom:
      "高并发 Web 服务（Nginx/Redis/Java）突然拒绝新连接，系统日志持续输出：socket() failed (24: Too many open files)。",
    rootCause:
      "Linux 系统默认进程级文件描述符配额（nofile）通常仅为 1024。高并发场景下 Socket 连接与文件读取瞬间击穿该上限。",
    diagnosticSteps: [
      "查看当前会话限制：ulimit -n",
      "查看具体故障进程当前持有的文件句柄数：lsof -p <PID> | wc -l 或 ls /proc/<PID>/fd | wc -l",
      "查验整机内核分配情况：cat /proc/sys/fs/file-nr",
    ],
    command: "echo '* soft nofile 65535\n* hard nofile 65535' | sudo tee -a /etc/security/limits.conf",
    solution:
      "1. 修改 /etc/security/limits.conf 提高 soft/hard nofile 到 65535 或更高；\n2. 若服务由 Systemd 托管，必须在 service 单元中明确配置：LimitNOFILE=65535。",
    bestPractice:
      "排查应用是否存在流未关闭（如 InputStream、Socket 未 close）引发的句柄泄漏。",
  },
  {
    id: "linux-inode-full",
    category: "linux",
    severity: "warning",
    title: "磁盘剩余数十G却报 No space left on device",
    errorCode: "No space left on device (Inode 100%)",
    symptom:
      "写入文件或创建新目录时报 No space left on device，但运行 df -h 显示磁盘使用率仅 50% 甚至剩余数十 GB。",
    rootCause:
      "文件系统的 Inode 索引节点数量在格式化时固定，当存在海量极微小文件（如旧邮件队列、大量 session 碎片）时，Inode 先于磁盘空间被耗尽。",
    diagnosticSteps: [
      "查看 Inode 使用率：df -i",
      "快速找出含有极多小文件的目录：for i in /*; do echo $i; find $i | wc -l; done",
      "精确定位前 10 大文件密集群：find / -xdev -printf '%h\n' | sort | uniq -c | sort -k 1 -nr | head -10",
    ],
    command: "df -i && find /var/spool/postfix/maildrop -type f -delete 2>/dev/null",
    solution:
      "使用 find 定位并批量删除产生海量碎片的无用目录文件（如未配置定时轮转的邮件缓存或 PHP session 文件）。",
    bestPractice:
      "切忌用 rm -rf * 一次性删除几十万文件导致 Argument list too long，应使用 find ... -delete 或 xargs 批处理。",
  },
  {
    id: "linux-high-load",
    category: "linux",
    severity: "warning",
    title: "CPU 空闲 80%+ 但 Load Average 飙升数百 (D状态阻塞)",
    errorCode: "High Load with Low CPU (D-State Block)",
    symptom:
      "服务器响应迟钝，top 显示 load average 达到 50+甚至更高，但 %Cpu(s) 用户/系统态极低，空闲 id 高达 80%~90%。",
    rootCause:
      "Load Average 统计不仅包括 CPU 运行队列，还包含处于 D 状态（Uninterruptible sleep，不可中断休眠）的任务。通常是慢速磁盘 I/O 阻塞、网络 NFS 挂载断联或设备锁竞争导致。",
    diagnosticSteps: [
      "检索处于 D 状态的进程清单：ps -eo stat,pid,user,comm | grep -E '^D'",
      "检查磁盘 I/O 读写压力与等待率：iostat -xz 1 5",
      "实时查看具体哪个进程在疯狂读写 I/O：iotop -oP",
    ],
    command: "ps -eo state,pid,user,cmd | grep -E '^D'",
    solution:
      "根据排查出的 D 状态进程定位故障存储；若为网络挂载（如 NFS/CIFS）失联，使用 umount -l 强行延迟卸载挂死节点。",
    bestPractice:
      "监控系统应同时采集 wa (I/O wait) 指标与 D 状态进程计数，不能仅凭 CPU 利用率评判系统健康。",
  },
  {
    id: "docker-disk-overlay2",
    category: "docker",
    severity: "warning",
    title: "Docker overlay2 目录暴涨占满系统根分区",
    errorCode: "no space left on device in /var/lib/docker",
    symptom:
      "无法拉取镜像或创建新容器，报错：no space left on device，df -h 发现 /var/lib/docker/overlay2 占用了 90%+ 空间。",
    rootCause:
      "未被引用的废弃镜像、已停止容器的可写层数据、未具名的卷（anonymous volumes）以及无轮转策略的容器 json-file 日志长期累积。",
    diagnosticSteps: [
      "查验 Docker 资源空间分布：docker system df",
      "排查最大的日志文件：find /var/lib/docker/containers/ -name \"*-json.log\" -size +500M",
    ],
    command: "docker system prune -a --volumes -f",
    solution:
      "运行安全清理命令释放无主容器、网络、构建缓存与未使用的孤儿卷。对失控的日志文件执行：cat /dev/null > <日志路径> 清空。",
    bestPractice:
      "在 /etc/docker/daemon.json 中配置全局日志轮转限制：\"log-opts\": {\"max-size\": \"100m\", \"max-file\": \"3\"}。",
  },
  {
    id: "linux-zombie",
    category: "linux",
    severity: "warning",
    title: "僵尸进程堆积且 kill -9 无法杀死",
    errorCode: "Defunct Process Accumulation",
    symptom:
      "ps -ef | grep defunct 显示存在大量僵尸进程，对这些进程执行 kill -9 <PID> 毫无反应，PID 无法释放。",
    rootCause:
      "僵尸进程本身已经终止退出了，其代码和内存已被回收，仅残留内核任务结构体（PCB）等待父进程调用 wait()/waitpid() 获取退出码。它已不再接收任何信号，因此 kill -9 无效。",
    diagnosticSteps: [
      "查找僵尸进程及其父进程 PID (PPID)：ps -ef | grep defunct",
      "查看父进程详细信息：ps -o pid,ppid,stat,cmd -p <PPID>",
    ],
    command: "ps -A -ostat,ppid,pid,cmd | grep -e '^[Zz]'",
    solution:
      "1. 向其父进程发送通知信号触发回收：kill -s SIGCHLD <PPID>；\n2. 若父进程已死锁，直接终止或重启该父进程，僵尸进程会自动过继给 PID 1 (systemd) 并被自动清理回收。",
    bestPractice:
      "开发自定义常驻进程或编写 Shell 守护脚本时，必须规范处理子进程退出信号（SIGCHLD）以防产生僵尸。",
  },

  // --- 常见级 (Common) ---
  {
    id: "docker-sock-perm",
    category: "docker",
    severity: "common",
    title: "普通用户运行 Docker 报 permission denied",
    errorCode: "dial unix /var/run/docker.sock: permission denied",
    symptom:
      "非 root 用户执行 docker ps 时出现：permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock。",
    rootCause:
      "/var/run/docker.sock 套接字默认文件属主为 root:docker，当前登录普通用户未被加入系统的 docker 用户组。",
    diagnosticSteps: [
      "检查当前用户所属组：groups $USER",
      "检查 socket 权限：ls -l /var/run/docker.sock",
    ],
    command: "sudo usermod -aG docker $USER && newgrp docker",
    solution:
      "执行 sudo usermod -aG docker $USER 将当前用户加入 docker 组，随后执行 newgrp docker 即时生效（或重新登录终端）。",
    bestPractice:
      "切忌对 /var/run/docker.sock 赋予 chmod 777 危险权限，加入受信任用户组是标准运维合规操作。",
  },
  {
    id: "net-refused-timeout",
    category: "network",
    severity: "common",
    title: "Connection Refused 与 Timed Out 快速诊断",
    errorCode: "Connection Refused vs Timed Out",
    symptom:
      "客户端调用服务失败，提示 Connection refused（被目标快速重置拒绝）或 Connection timed out（握手超时无响应）。",
    rootCause:
      "Refused 表示目标主机已收到握手，但对应端口没有进程监听；Timed Out 表示报文在传输路径中被安全组或防火墙 DROP 丢弃未回包。",
    diagnosticSteps: [
      "服务端验证是否在对应端口监听：ss -tulpn | grep :<端口>",
      "核验监听地址是否仅为 127.0.0.1：netstat -tnlp",
      "客户端端口探测：nc -zv -w 3 <目标IP> <端口>",
    ],
    command: "ss -tulpn | grep -E ':(80|443|3306|6379|8080)'",
    solution:
      "Refused：检查服务端程序是否启动，监听 IP 是否配置为 0.0.0.0；Timed Out：检查云安全组及系统防火墙放行规则。",
    bestPractice:
      "排查闭环：服务端看监听(ss) ➔ 本地看防火墙(iptables) ➔ 链路看路由(traceroute) ➔ 抓包定真相(tcpdump)。",
  },
  {
    id: "net-dns-fail",
    category: "network",
    severity: "common",
    title: "Linux DNS 解析缓慢或 Temporary failure in name resolution",
    errorCode: "Temporary failure in name resolution",
    symptom:
      "ping 外部域名或 curl 网址极慢，卡顿数秒后报错：Could not resolve host 或 Temporary failure in name resolution，但直接 ping IP 正常。",
    rootCause:
      "/etc/resolv.conf 中的首选 nameserver 失效超时；或配置了未响应的内网 DNS 服务器；或 systemd-resolved 服务解析缓存异常。",
    diagnosticSteps: [
      "直接测试 DNS 响应耗时：dig @223.5.5.5 baidu.com +time=2",
      "核对系统当前 DNS 解析配置：cat /etc/resolv.conf",
    ],
    command: "echo 'nameserver 223.5.5.5\nnameserver 119.29.29.29' | sudo tee /etc/resolv.conf",
    solution:
      "配置高可用公共 DNS（如阿里 223.5.5.5、腾讯 119.29.29.29、Google 8.8.8.8）。在 resolv.conf 中加入 options timeout:1 attempts:2 降低超时等待。",
    bestPractice:
      "注意 Ubuntu 等系统中 /etc/resolv.conf 常被 systemd-resolved 软链接劫持，需通过 resolvectl 或 netplan 进行永久持久化。",
  },
  {
    id: "win-pid4-port",
    category: "windows",
    severity: "common",
    title: "Windows 80/443 端口被 System (PID 4) 占用冲突",
    errorCode: "Port 80/443 Occupied by System (PID 4)",
    symptom:
      "在 Windows 上部署 Nginx、Apache 或本地 Web 服务时提示 80/443 端口绑定失败。运行 netstat -ano 发现 PID 4 (System) 牢牢占死端口。",
    rootCause:
      "Windows 内核驱动组件 HTTP.sys 正在运行，绑定了该端口。通常是后台的 IIS、Web 部署服务 (MsDepSvc)、BranchCache 或万维网发布服务 (W3SVC) 自动接管了端口监听。",
    diagnosticSteps: [
      "查看哪个服务注册了 HTTP.sys 路由：netsh http show servicestate",
      "检查万维网发布服务状态：Get-Service -Name W3SVC",
    ],
    command: "net stop http /y && sc config http start= disabled",
    solution:
      "1. 执行 net stop http /y 停止内核 HTTP 驱动及其附随服务；\n2. 在服务管理器（services.msc）中将“World Wide Web Publishing Service”设为禁用。",
    bestPractice:
      "若需与 Windows 服务共存，可通过 netsh http add iplisten ipaddress=127.0.0.1 限制其仅监听特定 IP，释放其他 IP 地址段。",
  },
  {
    id: "win-substream-align",
    category: "windows",
    severity: "common",
    title: "SubStream 字节流切片与免 UAC 交付原理",
    errorCode: "Qingshan SubStream & UAC-Free Protocol",
    symptom:
      "普通自解压工具在解包时易被 360/火绒拦截，或因 Windows 管理员 UAC 弹窗导致静默部署失败。",
    rootCause:
      "传统安装包写注册表 HKLM 与 Program Files 需要 Administrator 令牌；自解压 ZIP 拼接在 EXE 末尾若字节偏移不对齐，容易触发 CRC 校验失效。",
    diagnosticSteps: [
      "核查安装目标路径：必须限制在 %LOCALAPPDATA%\\Programs\\ 范围，免除写保护提权",
      "校验末尾 8 字节 offset 标记，确认 SubStream 指针精准跳过 Stub 执行体",
    ],
    command: "explorer.exe %LOCALAPPDATA%\\Programs\\QingShanToolBox",
    solution:
      "青衫工具箱采用自研 SubStream 字节流切片机制，读取 EXE 末尾 8 字节精确寻址 Payload ZIP，同时锁定当前用户专属 AppData 目录，做到零弹窗、零残留交付。",
    bestPractice:
      "开发桌面运维类辅助工具时，优先遵循免提权用户目录规范，既保障安全性又杜绝企业域控 UAC 阻断。",
  },
];

// 级别映射定义：危险、紧急、重点、常见
const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; tagColor: string; pillClass: string; icon: React.ReactNode }
> = {
  danger: {
    label: "危险级",
    tagColor: "error",
    pillClass: "pill-danger",
    icon: <CloseCircleOutlined />,
  },
  urgent: {
    label: "紧急级",
    tagColor: "warning",
    pillClass: "pill-urgent",
    icon: <FireOutlined />,
  },
  warning: {
    label: "重点级",
    tagColor: "gold",
    pillClass: "pill-warning",
    icon: <WarningOutlined />,
  },
  common: {
    label: "常见级",
    tagColor: "processing",
    pillClass: "pill-common",
    icon: <InfoCircleOutlined />,
  },
};

const CATEGORIES = [
  { key: "all", label: "全部领域", icon: <ToolOutlined /> },
  { key: "docker", label: "容器与 Docker", icon: <HddOutlined /> },
  { key: "linux", label: "Linux 底层与资源", icon: <AlertOutlined /> },
  { key: "network", label: "网络与端口连通", icon: <GlobalOutlined /> },
  { key: "database", label: "数据库与缓存", icon: <DatabaseOutlined /> },
  { key: "windows", label: "Windows 运维", icon: <WindowsOutlined /> },
] as const;

export default function KnowledgePage() {
  const [keyword, setKeyword] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<TroubleshootingItem | null>(null);

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return KNOWLEDGE_BASE.filter((item) => {
      // 级别筛选 (常见、紧急、重点、危险)
      if (selectedSeverity !== "all" && item.severity !== selectedSeverity) {
        return false;
      }
      // 领域筛选
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // 关键字搜索
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.errorCode && item.errorCode.toLowerCase().includes(q)) ||
        item.symptom.toLowerCase().includes(q) ||
        item.rootCause.toLowerCase().includes(q) ||
        item.command.toLowerCase().includes(q) ||
        item.solution.toLowerCase().includes(q)
      );
    });
  }, [keyword, selectedSeverity, selectedCategory]);

  const handleCopy = (id: string, text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    message.success("诊断/排查命令已复制到剪贴板");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="kb-container">
      {/* 顶部置顶搜索与双重过滤面板 */}
      <section className="kb-header-card">
        <div className="kb-search-row">
          <Input
            className="kb-search-input"
            prefix={<SearchOutlined style={{ color: "var(--muted)", marginRight: 6 }} />}
            placeholder="搜索日常运维错误、错误代码 (如 137, 1040, 1205)、关键词 (如 iptables, ulimit, Inode, TIME_WAIT)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
            size="large"
          />
        </div>

        <div className="kb-filters-container">
          {/* 第一组：级别过滤 (常见、紧急、重点、危险) */}
          <div className="kb-filter-row">
            <div className="kb-filter-group">
              <span className="kb-filter-label">故障等级:</span>
              <span
                className={`kb-pill${selectedSeverity === "all" ? " active" : ""}`}
                onClick={() => setSelectedSeverity("all")}
              >
                全部级别 ({KNOWLEDGE_BASE.length})
              </span>
              {(["danger", "urgent", "warning", "common"] as SeverityLevel[]).map((sev) => {
                const conf = SEVERITY_CONFIG[sev];
                const count = KNOWLEDGE_BASE.filter((i) => i.severity === sev).length;
                return (
                  <span
                    key={sev}
                    className={`kb-pill ${conf.pillClass}${selectedSeverity === sev ? " active" : ""}`}
                    onClick={() => setSelectedSeverity(sev)}
                  >
                    {conf.icon} <span>{conf.label}</span> ({count})
                  </span>
                );
              })}
            </div>

            <div className="kb-stat-text">
              匹配到 <strong>{filteredItems.length}</strong> / {KNOWLEDGE_BASE.length} 条运维故障对策
            </div>
          </div>

          {/* 第二组：领域分类过滤 */}
          <div className="kb-filter-row">
            <div className="kb-filter-group">
              <span className="kb-filter-label">技术领域:</span>
              {CATEGORIES.map((cat) => (
                <span
                  key={cat.key}
                  className={`kb-pill${selectedCategory === cat.key ? " active" : ""}`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  {cat.icon} <span>{cat.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 一排三列网格布局 */}
      {filteredItems.length === 0 ? (
        <div className="kb-empty">
          <Empty
            description={
              <span>
                未找到包含 "<strong>{keyword}</strong>" 的排障资料，您可以尝试精简搜索词
              </span>
            }
          />
        </div>
      ) : (
        <div className="kb-grid">
          {filteredItems.map((item) => {
            const conf = SEVERITY_CONFIG[item.severity];
            return (
              <article key={item.id} className="kb-card" onClick={() => setDetailItem(item)}>
                <div className="kb-card-top">
                  {/* 头部：级别 Badge + 错误代码 Tag */}
                  <div className="kb-card-head">
                    <Tag color={conf.tagColor} style={{ marginRight: 0, fontWeight: 500 }}>
                      {conf.icon} {conf.label}
                    </Tag>
                    {item.errorCode && (
                      <Tag
                        bordered={false}
                        color="default"
                        style={{ fontFamily: "var(--font-code)", fontSize: 11, maxWidth: 160 }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}>
                          {item.errorCode}
                        </span>
                      </Tag>
                    )}
                  </div>

                  {/* 标题 */}
                  <h3 className="kb-card-title">{item.title}</h3>

                  {/* 报错现象微缩框 */}
                  <Tooltip title={item.symptom} placement="topLeft" mouseEnterDelay={0.4}>
                    <div className="kb-error-box">{item.symptom}</div>
                  </Tooltip>

                  {/* 底层根因 */}
                  <div className="kb-reason-box">{item.rootCause}</div>
                </div>

                {/* 卡片底部：核心诊断命令与一键复制 */}
                <div className="kb-card-bottom">
                  <div className="kb-cmd-wrapper">
                    <code className="kb-cmd-code" title={item.command}>
                      {item.command}
                    </code>
                    <Tooltip title={copiedId === item.id ? "已复制" : "复制命令"}>
                      <Button
                        type="text"
                        size="small"
                        className="kb-copy-btn"
                        icon={copiedId === item.id ? <CheckOutlined style={{ color: "#52c41a" }} /> : <CopyOutlined />}
                        onClick={(e) => handleCopy(item.id, item.command, e)}
                      />
                    </Tooltip>
                  </div>

                  <div className="kb-footer-tips">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <ToolOutlined /> 点击卡片查看完整排查链
                    </span>
                    <ExpandAltOutlined style={{ color: "var(--muted)" }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 完整排查链详情弹窗 */}
      <Modal
        title={
          detailItem ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tag color={SEVERITY_CONFIG[detailItem.severity].tagColor}>
                {SEVERITY_CONFIG[detailItem.severity].label}
              </Tag>
              <span>{detailItem.title}</span>
            </div>
          ) : null
        }
        open={!!detailItem}
        onCancel={() => setDetailItem(null)}
        footer={[
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => detailItem && handleCopy(detailItem.id, detailItem.command)}
          >
            复制诊断与修复命令
          </Button>,
          <Button key="close" onClick={() => setDetailItem(null)}>
            关闭
          </Button>,
        ]}
        width={720}
      >
        {detailItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                报错特征 / 典型现象
              </div>
              <div className="kb-error-box" style={{ maxHeight: "none", WebkitLineClamp: "unset" }}>
                {detailItem.symptom}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                底层根因机制分析
              </div>
              <div className="kb-reason-box" style={{ maxHeight: "none", WebkitLineClamp: "unset" }}>
                {detailItem.rootCause}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                闭环排查步骤
              </div>
              <ol style={{ paddingLeft: 20, margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
                {detailItem.diagnosticSteps.map((step, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    <code style={{ fontFamily: "var(--font-code)", background: "var(--bg-soft)", padding: "2px 6px", borderRadius: 4 }}>
                      {step}
                    </code>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                权威修复命令
              </div>
              <div className="kb-cmd-wrapper">
                <code className="kb-cmd-code" style={{ whiteSpace: "pre-wrap" }}>
                  {detailItem.command}
                </code>
                <Tooltip title={copiedId === detailItem.id ? "已复制" : "复制命令"}>
                  <Button
                    type="text"
                    size="small"
                    className="kb-copy-btn"
                    icon={copiedId === detailItem.id ? <CheckOutlined style={{ color: "#52c41a" }} /> : <CopyOutlined />}
                    onClick={(e) => handleCopy(detailItem.id, detailItem.command, e)}
                  />
                </Tooltip>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                处置细节与避坑指南
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-line" }}>
                {detailItem.solution}
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  fontSize: 12,
                }}
              >
                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                <strong>生产避坑指南：</strong>{detailItem.bestPractice}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
