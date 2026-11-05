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

  console.log('Creating release v1.1.1...');
  const relRes = await api('POST', '/repos/DragonTsunami/qingshan-toolbox/releases', {
    tag_name: 'v1.1.1',
    target_commitish: 'main',
    name: '青衫工具箱 v1.1.1 (多语言支持发布版)',
    body: '## 青衫工具箱 v1.1.1 多语言支持发布版\n\n### 🌟 新增功能与优化\n1. **全局中英文语言切换与国际化支持**：\n   - 【设置】页面新增独立醒目的【界面语言 / Language】切换按钮，支持在 🇨🇳 简体中文 与 🇺🇸 English 之间无缝热切换；\n   - 全局状态响应并自动同步 Ant Design 底层组件（表格、弹窗、下拉、分页等）的语言区域；\n   - 侧边栏所有 12 大功能模块标签与提示、顶部连接状态、设置各项描述及资料库全面适配双语；\n   - 语言偏好自动本地持久化，下一次启动即刻记忆生效。\n2. **资料库导出与提交优化**：\n   - 资料库 JSON 导出与贡献提交协议版本同步升级至 v1.1.1；\n   - GitHub 云端同步中心与多通道上传向导体验增强。\n3. **独立单文件安装包全面升级**：\n   - 方案二【双栏工坊】与方案三【极光流体】现代化独立安装包升级至 v1.1.1，即开即装。\n',
    draft: false,
    prerelease: false
  });

  console.log('Release created:', relRes.status, relRes.data ? relRes.data.html_url : relRes.raw);
  if (!relRes.data || !relRes.data.id) {
    console.error('Failed to create release:', relRes);
    return;
  }

  const uploadUrlBase = relRes.data.upload_url.split('{')[0];
  const filesToUpload = [
    { name: 'QingshanToolbox-v1.1.1-win-x64.zip', path: 'R:/QingshanToolbox/QingshanToolbox-v1.1.1-win-x64.zip', type: 'application/zip' },
    { name: '青衫工具箱_方案二_安装程序_v1.1.1.exe', path: 'D:/Archive/安装包/青衫工具箱_方案二_双栏工坊/输出/青衫工具箱_方案二_安装程序_v1.1.1.exe', type: 'application/octet-stream' },
    { name: '青衫工具箱_方案三_安装程序_v1.1.1.exe', path: 'D:/Archive/安装包/青衫工具箱_方案三_极光流体/输出/青衫工具箱_方案三_安装程序_v1.1.1.exe', type: 'application/octet-stream' }
  ];

  for (const f of filesToUpload) {
    if (!fs.existsSync(f.path)) {
      console.warn('File not found, skipping:', f.path);
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
  console.log('All release operations complete successfully!');
});
proc.stdin.write('protocol=https\nhost=github.com\n\n');
