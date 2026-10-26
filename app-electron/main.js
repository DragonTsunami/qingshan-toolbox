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

// Run PowerShell or System Ops
ipcMain.handle('sys:exec', async (event, command) => {
  return new Promise((resolve) => {
    let psCmd = command;
    if (command.startsWith('disk clean --temp')) {
      psCmd = 'Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue; "Temp 临时目录缓存已清理完成"';
    } else if (command.startsWith('disk clean --recycle-bin')) {
      psCmd = 'Clear-RecycleBin -Force -ErrorAction SilentlyContinue; "所有磁盘回收站已彻底清空"';
    } else if (command.startsWith('desktop fix --dns')) {
      psCmd = 'Clear-DnsClientCache; "DNS 解析缓存已成功刷新"';
    } else if (command.startsWith('desktop fix --spooler')) {
      psCmd = 'Restart-Service spooler -Force; "打印机假脱机后台服务已重启"';
    } else if (command.startsWith('desktop fix --icon-cache')) {
      psCmd = 'ie4uinit.exe -show; "Windows 图标缓存已重建"';
    }

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
