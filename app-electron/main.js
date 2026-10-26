const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');

const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    resizable: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the web UI
  let indexPath = path.join(__dirname, 'web', 'index.html');
  if (!fs.existsSync(indexPath)) {
    indexPath = path.join(__dirname, '..', 'web', 'index.html');
  }
  mainWindow.loadFile(indexPath);

  // External link handling
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
ipcMain.handle('win:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('win:close', () => {
  if (mainWindow) mainWindow.close();
});

// Run PowerShell or System Ops
ipcMain.handle('sys:exec', async (event, command) => {
  return new Promise((resolve) => {
    // Map custom toolbox commands to real PowerShell commands if applicable
    let psCmd = command;
    if (command.startsWith('disk clean --temp')) {
      psCmd = 'Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue; "Temp 临时目录缓存清理完毕"';
    } else if (command.startsWith('disk clean --recycle-bin')) {
      psCmd = 'Clear-RecycleBin -Force -ErrorAction SilentlyContinue; "所有磁盘回收站已彻底清空"';
    } else if (command.startsWith('desktop fix --dns')) {
      psCmd = 'Clear-DnsClientCache; "DNS 解析缓存已成功刷新"';
    } else if (command.startsWith('desktop fix --spooler')) {
      psCmd = 'Restart-Service spooler -Force; "打印机后台假脱机服务已重启"';
    } else if (command.startsWith('desktop fix --icon-cache')) {
      psCmd = 'ie4uinit.exe -show; "Windows 图标快照与缓存重建指令已下发"';
    }

    exec(`powershell.exe -NoProfile -Command "${psCmd}"`, { windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        output: stdout ? stdout.trim() : (stderr ? stderr.trim() : '执行成功')
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
  if (process.platform !== 'darwin') app.quit();
});
