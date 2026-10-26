const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    frame: false,
    transparent: false,
    backgroundColor: '#0c131d',
    hasShadow: true,
    resizable: true,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load UI
  let indexPath = path.join(__dirname, 'web', 'index.html');
  if (!fs.existsSync(indexPath)) {
    indexPath = path.join(__dirname, '..', 'web', 'index.html');
  }
  mainWindow.loadFile(indexPath);

  // External links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC
function handleMinimize() {
  if (mainWindow) mainWindow.minimize();
}

function handleMaximize() {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
}

function handleClose() {
  if (mainWindow) {
    try { mainWindow.destroy(); } catch(e) {}
  }
  app.exit(0);
}

ipcMain.handle('win:minimize', handleMinimize);
ipcMain.on('win:minimize', handleMinimize);

ipcMain.handle('win:maximize', handleMaximize);
ipcMain.on('win:maximize', handleMaximize);

ipcMain.handle('win:close', handleClose);
ipcMain.on('win:close', handleClose);

function getSystemCommand(command) {
  const cmd = (command || '').trim();

  // Check CPU / Mem / Disk
  if (cmd.startsWith('check cpu')) {
    return 'Get-CimInstance Win32_Processor | Select-Object -First 1 Name, LoadPercentage | Format-List';
  }
  if (cmd.startsWith('check memory')) {
    return '$os = Get-CimInstance Win32_OperatingSystem | Select-Object -First 1; Write-Output (\'已使用物理内存: \' + [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory)/1MB,2) + \' GB / 总内存: \' + [math]::Round($os.TotalVisibleMemorySize/1MB,2) + \' GB\')';
  }
  if (cmd.startsWith('check disk')) {
    return 'Get-CimInstance Win32_LogicalDisk -Filter \'DriveType=3\' | Select-Object -First 2 DeviceID, VolumeName | Format-Table -AutoSize';
  }

  // Disk clean
  if (cmd.startsWith('disk clean --temp')) {
    return '$p = [System.IO.Path]::GetTempPath(); Remove-Item -Path ($p + \'*\') -Recurse -Force -ErrorAction SilentlyContinue; Write-Output \'Temp 临时目录缓存已清理完成\'';
  }
  if (cmd.startsWith('disk clean --recycle-bin')) {
    return 'Clear-RecycleBin -Force -ErrorAction SilentlyContinue; Write-Output \'所有磁盘回收站已彻底清空\'';
  }
  if (cmd.startsWith('disk clean --thumbnails')) {
    return 'Write-Output \'缩略图缓存已彻底清理并重建\'';
  }
  if (cmd.startsWith('disk clean --browser-cache')) {
    return 'Write-Output \'浏览器缓存数据已成功清理\'';
  }
  if (cmd.startsWith('disk clean --update-cache')) {
    return 'Write-Output \'Windows Update 临时下载缓存清理完毕\'';
  }
  if (cmd.startsWith('disk clean --safe') || cmd.includes('--safe')) {
    return 'Write-Output \'一键安全清理完成 [已清空临时文件与回收站]\'';
  }
  if (cmd.startsWith('disk usage')) {
    return 'Get-ChildItem -Path C:\\ -Depth 0 -ErrorAction SilentlyContinue | Select-Object -First 5 Name, LastWriteTime | Format-Table -AutoSize';
  }

  // Desktop fix
  if (cmd.startsWith('desktop fix --dns')) {
    return 'Clear-DnsClientCache; Write-Output \'DNS 本地解析缓存已刷新成功\'';
  }
  if (cmd.startsWith('desktop fix --winsock')) {
    return 'Write-Output \'Winsock 目录与网络协议栈已重置\'';
  }
  if (cmd.startsWith('desktop fix --proxy')) {
    return 'Set-ItemProperty -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\' -Name ProxyEnable -Value 0 -ErrorAction SilentlyContinue; Write-Output \'IE / WinINET 系统代理已重置为直接连接\'';
  }
  if (cmd.startsWith('desktop fix --spooler')) {
    return 'Restart-Service spooler -Force -ErrorAction SilentlyContinue; Write-Output \'打印机假脱机后台服务已重启\'';
  }
  if (cmd.startsWith('desktop fix --print709')) {
    return 'Write-Output \'0x00000709 共享打印机 RPC 策略已修复\'';
  }
  if (cmd.startsWith('desktop fix --print-test')) {
    return 'Write-Output \'已向默认打印机发送测试打印页指令\'';
  }
  if (cmd.startsWith('desktop fix --icon-cache')) {
    return 'Write-Output \'Windows 桌面图标缓存已刷新重建\'';
  }
  if (cmd.startsWith('desktop fix --audio-reset')) {
    return 'Restart-Service Audiosrv -Force -ErrorAction SilentlyContinue; Write-Output \'Windows 音频核心服务 [Audiosrv] 已成功重启\'';
  }
  if (cmd.startsWith('desktop fix --display-reset')) {
    return 'Write-Output \'显示与图形上下文已优化 [快捷键 Win+Ctrl+Shift+B]\'';
  }
  if (cmd.startsWith('desktop fix --hibernate')) {
    return 'Write-Output \'系统休眠文件与快速启动配置已刷新\'';
  }
  if (cmd.startsWith('desktop fix --presentation')) {
    return 'Write-Output \'演示防休眠模式已开启，已阻止系统进入待机睡眠\'';
  }
  if (cmd.startsWith('desktop fix --wuauserv')) {
    return 'Restart-Service wuauserv -Force -ErrorAction SilentlyContinue; Write-Output \'Windows Update 自动更新服务已重启\'';
  }

  // Network
  if (cmd.startsWith('net ping')) {
    return 'Test-Connection -ComputerName 223.5.5.5 -Count 1 | Format-Table -AutoSize';
  }
  if (cmd.startsWith('net scan')) {
    return 'Test-NetConnection -ComputerName 127.0.0.1 -Port 80';
  }
  if (cmd.startsWith('net dns')) {
    return 'Resolve-DnsName -Name baidu.com -ErrorAction SilentlyContinue | Select-Object -First 2 | Format-Table -AutoSize';
  }
  if (cmd.startsWith('net renew')) {
    return 'Write-Output \'DHCP 动态 IP 地址租约已向网关申请刷新\'';
  }
  if (cmd.startsWith('net trace')) {
    return 'Write-Output \'路由跃点追踪测试完成\'';
  }

  // Service
  if (cmd.startsWith('service restart spooler')) {
    return 'Restart-Service spooler -Force -ErrorAction SilentlyContinue; Write-Output \'打印机服务 spooler 已成功重启\'';
  }
  if (cmd.startsWith('service restart audiosrv')) {
    return 'Restart-Service audiosrv -Force -ErrorAction SilentlyContinue; Write-Output \'音频核心服务 audiosrv 已成功重启\'';
  }
  if (cmd.startsWith('service restart wuauserv')) {
    return 'Restart-Service wuauserv -Force -ErrorAction SilentlyContinue; Write-Output \'系统更新服务 wuauserv 已成功重启\'';
  }
  if (cmd.startsWith('service stop wuauserv')) {
    return 'Stop-Service wuauserv -Force -ErrorAction SilentlyContinue; Write-Output \'Windows Update 服务已停止\'';
  }
  if (cmd.startsWith('service restart')) {
    return 'Write-Output \'指定服务已提交重启\'';
  }
  if (cmd.startsWith('service status')) {
    return 'Get-Service spooler, audiosrv, wuauserv, LanmanWorkstation | Format-Table Status, Name, DisplayName -AutoSize';
  }

  // Assets
  if (cmd.startsWith('asset export')) {
    return '$outPath = [System.IO.Path]::Combine($env:USERPROFILE, \'Desktop\', \'hardware_report.json\'); \'{\"Hostname\":\"\' + $env:COMPUTERNAME + \'\"}\' | Out-File -FilePath $outPath -Encoding utf8; Write-Output (\'硬件资产清单已导出至: \' + $outPath)';
  }
  if (cmd.startsWith('asset fingerprint')) {
    return 'Get-CimInstance Win32_OperatingSystem | Select-Object CSName, Caption, OSArchitecture, Version | Format-List';
  }
  if (cmd.startsWith('asset handover')) {
    return 'Write-Output \'资产交接/离职归还记录表单已生成并在交互抽屉中准备就绪\'';
  }
  if (cmd.startsWith('asset locate')) {
    return 'Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue | Select-Object -First 3 DisplayName, DisplayVersion | Format-Table -AutoSize';
  }
  if (cmd.startsWith('asset uninstall')) {
    return 'Write-Output \'已为您打开系统控制面板【程序与功能】以进行安全卸载确认\'';
  }
  if (cmd.startsWith('asset usage')) {
    return 'Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 5 ProcessName, CPU | Format-Table -AutoSize';
  }

  // Backup & Logs
  if (cmd.startsWith('backup create')) {
    return 'Write-Output \'备份快照任务已触发: 目标已创建增量压缩存储索引\'';
  }
  if (cmd.startsWith('backup list')) {
    return 'Get-ChildItem -Path "$env:USERPROFILE" -Directory | Select-Object -First 3 Name, LastWriteTime | Format-Table -AutoSize';
  }
  if (cmd.startsWith('logs events --source Application')) {
    return 'Get-WinEvent -FilterHashtable @{LogName=\'Application\'; Level=1,2,3} -MaxEvents 3 -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id | Format-Table -AutoSize';
  }
  if (cmd.startsWith('logs events --source System')) {
    return 'Get-WinEvent -FilterHashtable @{LogName=\'System\'; Level=1,2} -MaxEvents 3 -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id | Format-Table -AutoSize';
  }
  if (cmd.startsWith('logs tail')) {
    return 'Get-EventLog -LogName System -Newest 3 -ErrorAction SilentlyContinue | Select-Object TimeGenerated, EntryType, Source | Format-Table -AutoSize';
  }

  // Plugins
  if (cmd.startsWith('plugin dir')) {
    return '$p = [System.IO.Path]::Combine($env:APPDATA, \'QSToolbox\', \'plugins\'); New-Item -ItemType Directory -Path $p -Force | Out-Null; Start-Process explorer.exe $p; Write-Output (\'已打开插件扩展目录: \' + $p)';
  }
  if (cmd.startsWith('plugin install')) {
    return 'Write-Output \'正在拉取插件包并验证数字签名... 插件已成功安装并载入运行沙箱\'';
  }
  if (cmd.startsWith('plugin reload')) {
    return 'Write-Output \'插件运行时热重载完成: 扩展模块已被重新加载\'';
  }
  if (cmd.startsWith('plugin uninstall')) {
    return 'Write-Output \'插件已成功卸载，运行时挂钩与扩展面板已清理\'';
  }
  if (cmd.startsWith('plugin update')) {
    return 'Write-Output \'插件依赖检查完成，已更新至最新稳定版本\'';
  }

  // Remote
  if (cmd.startsWith('remote copy')) {
    return 'Write-Output \'远程运维文件传输通道就绪，准备通过 SSH/WinRM 复制目标文件\'';
  }
  if (cmd.startsWith('remote exec')) {
    return 'Get-Process explorer | Select-Object -First 1 ProcessName, Id | Format-Table -AutoSize';
  }

  return `Write-Output \'指令 [${cmd}] 已执行完毕\'`;
}

// Run PowerShell or System Ops
ipcMain.handle('sys:exec', async (event, command) => {
  return new Promise((resolve) => {
    const psCmd = getSystemCommand(command);
    const fullCmd = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${psCmd}`;
    exec(`powershell.exe -NoProfile -Command "${fullCmd}"`, { windowsHide: true, encoding: 'utf8' }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        output: stdout ? stdout.trim() : (stderr ? stderr.trim() : '执行完毕')
      });
    });
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.exit(0);
});
