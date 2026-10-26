@echo off
title 启动青衫工具箱 (Electron 桌面版)
cd /d "%~dp0\app-electron"
start "" npx electron .
exit
