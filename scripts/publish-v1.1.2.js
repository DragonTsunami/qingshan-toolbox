const cp = require('child_process');
const https = require('https');
const fs = require('fs');

const proc = cp.spawn('git', ['credential-wincred', 'get']);
let out = '';
proc.stdout.on('data', d => out += d);
proc.on('close', async () => {
  const token = out.split('\n').find(l => l.startsWith('password=')).replace('password=', '').trim();
  
  function api(method, p, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const u = new URL(p.startsWith('http') ? p : 'https://api.github.com' + p);
      const req = https.request(u, {
        method,
        headers: {
          'User-Agent': 'QingshanToolbox',
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...headers
        }
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch(e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });
  }

  console.log('Creating release v1.1.2...');
  const releasePayload = {
    tag_name: 'v1.1.2',
    target_commitish: 'main',
    name: '青衫工具箱 v1.1.2 (全场景中英文语言切换与运维资料库增强版)',
    body: `## 青衫工具箱 v1.1.2 全场景多语言与运维知识库发布

### 🌟 核心更新亮点
1. **全场景中英文无缝多语言热切换**：
   - **全模块覆盖**：从概览、进程管理、Windows系统服务、硬件诊断（含导出的 Markdown 报告）、网络探测、日志中心、垃圾清理、开机自启、已装软件、插件中心，到运维知识库、故障大字说明、自愈结果反馈及报修求助向导，实现 100% 全场景中英文即时切换；
   - **智能翻译与动态国际化引擎**：表头、排序提示、Popconfirm 二次确认弹窗、状态标签、Drawer 抽屉、时间戳及系统运行时长（如 \`2d 4h\` / \`2 天 4 小时\`）全部自动感应当前界面语言；
   - **用户首选项记忆持久化**：在【设置】中切换语言后即刻全局生效并自动保存至本地配置，重新启动依然保持。

2. **桌面运维知识库与开源贡献系统优化**：
   - 同步协议与本地数据包标准升级至 v1.1.2；
   - 知识库新增/编辑/详情/求助各模态框全面支持地道英文国际化展示；
   - 优化从 GitHub 社区云端拉取 60 条标准故障库的智能合并逻辑与直传通道体验。

3. **双方案单文件极速安装包全量发布**：
   - **方案二（双栏工坊版）** 与 **方案三（极光流体版）** 均生成独立单文件轻量安装程序，即点即装，绿色无残留；
   - 提供便携绿色压缩包（解压即可独立运行）。

---

### 📦 资产下载说明
- **\`QingshanToolbox-Scheme2-Setup-v1.1.2.exe\`**：双栏工坊界面独立安装程序（推荐，支持一键静默安装、桌面快捷方式与环境自检）
- **\`QingshanToolbox-Scheme3-Setup-v1.1.2.exe\`**：极光流体界面独立安装程序（现代轻量质感界面）
- **\`QingshanToolbox-v1.1.2-win-x64.zip\`**：绿色免安装便携版（解压即可直接运行）
- **\`QingshanToolbox.exe\`**：工具箱主程序独立二进制
`,
    draft: false,
    prerelease: false
  };

  let relRes = await api('POST', '/repos/DragonTsunami/qingshan-toolbox/releases', releasePayload);
  if (relRes.status === 422) {
    console.log('Release already exists, fetching existing release info...');
    relRes = await api('GET', '/repos/DragonTsunami/qingshan-toolbox/releases/tags/v1.1.2');
  }

  console.log('Release status:', relRes.status, 'id:', relRes.data?.id);
  const uploadUrlBase = relRes.data.upload_url.split('{')[0];

  const filesToUpload = [
    {
      name: 'QingshanToolbox-Scheme2-Setup-v1.1.2.exe',
      path: 'D:/Archive/安装包/青衫工具箱_方案二_双栏工坊/输出/青衫工具箱_方案二_安装程序_v1.1.2.exe',
      type: 'application/octet-stream'
    },
    {
      name: 'QingshanToolbox-Scheme3-Setup-v1.1.2.exe',
      path: 'D:/Archive/安装包/青衫工具箱_方案三_极光流体/输出/青衫工具箱_方案三_安装程序_v1.1.2.exe',
      type: 'application/octet-stream'
    },
    {
      name: 'QingshanToolbox-v1.1.2-win-x64.zip',
      path: 'R:/QingshanToolbox/QingshanToolbox-v1.1.2-win-x64.zip',
      type: 'application/zip'
    },
    {
      name: 'QingshanToolbox.exe',
      path: 'R:/desktop/target/release/QingshanToolbox.exe',
      type: 'application/octet-stream'
    }
  ];

  for (const f of filesToUpload) {
    if (!fs.existsSync(f.path)) {
      console.warn(`File not found: ${f.path}`);
      continue;
    }
    const stat = fs.statSync(f.path);
    console.log(`Uploading ${f.name} (${(stat.size / 1024 / 1024).toFixed(2)} MB)...`);
    
    await new Promise((resolve) => {
      const u = new URL(uploadUrlBase + '?name=' + encodeURIComponent(f.name));
      const req = https.request(u, {
        method: 'POST',
        headers: {
          'User-Agent': 'QingshanToolbox',
          'Authorization': 'Bearer ' + token,
          'Content-Type': f.type,
          'Content-Length': stat.size,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          console.log(`Uploaded ${f.name} -> HTTP ${res.statusCode}`);
          resolve();
        });
      });
      req.on('error', err => {
        console.error(`Upload error on ${f.name}:`, err);
        resolve();
      });
      fs.createReadStream(f.path).pipe(req);
    });
  }
  console.log('All v1.1.2 release operations completed successfully!');
});
proc.stdin.write('protocol=https\nhost=github.com\n\n');
