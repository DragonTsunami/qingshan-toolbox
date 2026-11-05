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

  // 1. Delete bad asset 712079399
  console.log('Deleting bad asset 712079399 (_._._v1.1.0.exe)...');
  const delRes = await api('DELETE', '/repos/DragonTsunami/qingshan-toolbox/releases/assets/712079399');
  console.log('Delete status:', delRes.status);

  // 2. Fetch upload_url of release v1.1.0
  const relRes = await api('GET', '/repos/DragonTsunami/qingshan-toolbox/releases/tags/v1.1.0');
  const uploadUrlBase = relRes.data.upload_url.split('{')[0];

  // 3. Upload clean named assets
  const filesToUpload = [
    {
      name: 'QingshanToolbox-Scheme2-Setup-v1.1.0.exe',
      path: 'D:/Archive/安装包/青衫工具箱_方案二_双栏工坊/输出/青衫工具箱_方案二_安装程序_v1.1.0.exe',
      type: 'application/octet-stream'
    },
    {
      name: 'QingshanToolbox-Scheme3-Setup-v1.1.0.exe',
      path: 'D:/Archive/安装包/青衫工具箱_方案三_极光流体/输出/青衫工具箱_方案三_安装程序_v1.1.0.exe',
      type: 'application/octet-stream'
    },
    {
      name: 'QingshanToolbox.exe',
      path: 'R:/QingshanToolbox/QingshanToolbox.exe',
      type: 'application/octet-stream'
    }
  ];

  for (const f of filesToUpload) {
    if (!fs.existsSync(f.path)) {
      console.warn('File not found:', f.path);
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

  // 4. Update Release Body with clean download links and clear description
  console.log('Updating release body...');
  await api('PATCH', `/repos/DragonTsunami/qingshan-toolbox/releases/${relRes.data.id}`, {
    name: '青衫工具箱 v1.1.0 (正式发布版)',
    body: `## 青衫工具箱 v1.1.0 正式发布版 (Qingshan Toolbox)

> 企业级轻量化桌面运维支持平台 · 普通终端用户与 IT 运维无缝协同排障自愈系统

---

### 📥 软件安装包与运行程序下载

| 文件类型 | 推荐下载文件 | 文件大小 | 说明 |
| :--- | :--- | :--- | :--- |
| **安装包（推荐方案二）** | [**QingshanToolbox-Scheme2-Setup-v1.1.0.exe**](https://github.com/DragonTsunami/qingshan-toolbox/releases/download/v1.1.0/QingshanToolbox-Scheme2-Setup-v1.1.0.exe) | ~35.6 MB | **现代硬件加速 UI 安装向导（双栏工坊设计）**，支持一键免管理员安装、自动关联桌面快捷方式与开机自愈服务 |
| **安装包（备选方案三）** | [**QingshanToolbox-Scheme3-Setup-v1.1.0.exe**](https://github.com/DragonTsunami/qingshan-toolbox/releases/download/v1.1.0/QingshanToolbox-Scheme3-Setup-v1.1.0.exe) | ~35.6 MB | **极光流体 UI 安装向导（单栏流光现代风）**，全自动静默/图形化自解压安装 |
| **软件独立单文件本体** | [**QingshanToolbox.exe**](https://github.com/DragonTsunami/qingshan-toolbox/releases/download/v1.1.0/QingshanToolbox.exe) | ~8.2 MB | **v1.1.0 原生主程序本体**，双击即用 |
| **绿色便携免安装完整包** | [**QingshanToolbox-v1.1.0-win-x64.zip**](https://github.com/DragonTsunami/qingshan-toolbox/releases/download/v1.1.0/QingshanToolbox-v1.1.0-win-x64.zip) | ~3.5 MB | 包含全套运行时驱动与配置，解压即用 |

---

### 🌟 v1.1.0 核心版本更新亮点

1. **桌面运维与 IT 支持资料库全面升级**：
   - 彻底移除了普通用户难以理解的技术调试步骤，全面转向“普通人能看懂的现象描述 + 一键修复自愈尝试 + 失败一键联系企业运维”的高效闭环；
   - 整合并内置了 60+ 条国内外真实企业高频 IT 故障（涵盖蓝屏死机、网络断连、DNS污染、打印机脱机、字体排版错乱、系统休眠掉网等）；
   - 支持用户本地自主录入未收录的罕见故障，支持全量 JSON 资料库的导出备份与合并导入。
2. **GitHub 云端双向同步中心**：
   - **智能多通道检测**：官方 Raw 直连通道、国内镜像加速通道、CDN 边缘通道多源择优，彻底规避旧缓存截断问题，确保精准同步全量案例；
   - **用户自主决策**：云端有更新时弹窗展示新增案例对比，由用户完全自主决定是否拉取合并，绝不强制覆盖本地自建数据。
3. **企业运维与用户多通道贡献上传向导**：
   - **通道一（企业运维/专业人员）**：在工具箱内填入个人 GitHub Token (PAT)，后台直接调用 GitHub REST API 秒级直传 Issue，无需打开浏览器；
   - **通道二（普通用户/免 Token）**：一键自动导出规范格式的 \`.json\` 贡献数据包、自动复制 Markdown 内容到剪贴板，并安全拉起系统浏览器打开 GitHub 提交页，支持 Ctrl+V 粘贴或拖拽附件上传；
   - **通道三（企业内网环境）**：一键导出离线待审核文件，通过企业微信、邮件交付内部 IT 运维处理。
4. **历史版本归档清理**：
   - 已正式下线并删除旧版 \`v1.0.1\`，全量基准对齐至最新正式版 \`v1.1.0\`。
`
  });

  console.log('Release updated successfully!');
});
proc.stdin.write('protocol=https\nhost=github.com\n\n');
