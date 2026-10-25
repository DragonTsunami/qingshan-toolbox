<#
.SYNOPSIS
    QingShan Toolbox (青衫工具箱) Installer for Windows
    青衫工具箱 Windows 一键安装脚本

.DESCRIPTION
    Downloads and installs the latest release of QingShan Toolbox.
    Automatically detects system architecture, downloads the correct binary,
    adds it to PATH, and verifies the installation.

    自动检测系统架构，下载正确的二进制文件，添加到 PATH，并验证安装。

.EXAMPLE
    irm https://raw.githubusercontent.com/qingshan/toolbox/main/scripts/install.ps1 | iex

.NOTES
    Author: QingShan Contributors
    License: MIT
    Repository: https://github.com/qingshan/toolbox
#>

# Strict mode / 严格模式
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # Faster downloads / 加速下载

# Configuration / 配置
$RepoOwner = "qingshan"
$RepoName = "toolbox"
$BinaryName = "qstoolbox"
$InstallDir = "$env:LOCALAPPDATA\QingShanToolbox\bin"
$GitHubAPI = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"

# ============================================================
# Helper Functions / 辅助函数
# ============================================================

function Write-Step {
    param([string]$Message)
    Write-Host "  → " -ForegroundColor Cyan -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✅ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Failure {
    param([string]$Message)
    Write-Host "  ❌ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Get-SystemArchitecture {
    <#
    .SYNOPSIS
        Detect system architecture / 检测系统架构
    #>
    $arch = $env:PROCESSOR_ARCHITECTURE
    switch ($arch) {
        "AMD64" { return "amd64" }
        "ARM64" { return "arm64" }
        "x86"   { return "amd64" }  # Fallback for 32-bit process on 64-bit OS
        default {
            Write-Failure "Unsupported architecture: $arch / 不支持的架构: $arch"
            exit 1
        }
    }
}

function Get-LatestVersion {
    <#
    .SYNOPSIS
        Fetch the latest release version from GitHub / 从 GitHub 获取最新版本
    #>
    Write-Step "Fetching latest version... / 正在获取最新版本..."

    try {
        $response = Invoke-RestMethod -Uri $GitHubAPI -Headers @{
            "Accept" = "application/vnd.github.v3+json"
            "User-Agent" = "QingShanToolbox-Installer"
        }
        $version = $response.tag_name
        Write-Success "Latest version: $version / 最新版本: $version"
        return $response
    }
    catch {
        Write-Failure "Failed to fetch latest version / 获取最新版本失败"
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "    You can manually download from / 您可以手动下载:" -ForegroundColor Yellow
        Write-Host "    https://github.com/$RepoOwner/$RepoName/releases/latest" -ForegroundColor Yellow
        exit 1
    }
}

function Install-Binary {
    param(
        [object]$Release,
        [string]$Architecture
    )

    <#
    .SYNOPSIS
        Download and install the binary / 下载并安装二进制文件
    #>

    $version = $Release.tag_name
    $assetName = "$BinaryName-windows-$Architecture.exe"

    # Find the matching asset / 查找匹配的资源文件
    $asset = $Release.assets | Where-Object { $_.name -eq $assetName }

    if (-not $asset) {
        Write-Failure "Asset not found: $assetName / 未找到资源文件: $assetName"
        Write-Host "    Available assets / 可用资源:" -ForegroundColor Yellow
        $Release.assets | ForEach-Object {
            Write-Host "      - $($_.name)" -ForegroundColor Yellow
        }
        exit 1
    }

    $downloadUrl = $asset.browser_download_url

    # Create install directory / 创建安装目录
    if (-not (Test-Path $InstallDir)) {
        Write-Step "Creating install directory / 正在创建安装目录: $InstallDir"
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    $targetPath = Join-Path $InstallDir "$BinaryName.exe"

    # Download the binary / 下载二进制文件
    Write-Step "Downloading $assetName ($version)... / 正在下载..."
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $targetPath -UseBasicParsing
        Write-Success "Download complete / 下载完成"
    }
    catch {
        Write-Failure "Download failed / 下载失败: $($_.Exception.Message)"
        exit 1
    }

    return $targetPath
}

function Add-ToPath {
    <#
    .SYNOPSIS
        Add install directory to user PATH / 将安装目录添加到用户 PATH
    #>

    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

    if ($currentPath -split ";" | Where-Object { $_ -eq $InstallDir }) {
        Write-Step "Install directory already in PATH / 安装目录已在 PATH 中"
        return
    }

    Write-Step "Adding to PATH... / 正在添加到 PATH..."

    $newPath = "$currentPath;$InstallDir"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")

    # Update current session PATH / 更新当前会话的 PATH
    $env:Path = "$env:Path;$InstallDir"

    Write-Success "Added to PATH / 已添加到 PATH"
}

function Test-Installation {
    <#
    .SYNOPSIS
        Verify the installation / 验证安装
    #>

    Write-Step "Verifying installation... / 正在验证安装..."

    $binaryPath = Join-Path $InstallDir "$BinaryName.exe"

    if (-not (Test-Path $binaryPath)) {
        Write-Failure "Binary not found at $binaryPath / 未在 $binaryPath 找到二进制文件"
        exit 1
    }

    try {
        $versionOutput = & $binaryPath version 2>&1
        Write-Success "Installation verified / 安装验证通过"
        Write-Host "    $versionOutput" -ForegroundColor Gray
    }
    catch {
        # version command might not exist yet, just check the binary exists
        # version 命令可能尚未实现，仅检查二进制文件是否存在
        Write-Success "Binary installed successfully / 二进制文件安装成功"
    }
}

# ============================================================
# Main Installation Flow / 安装主流程
# ============================================================

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   🔧 QingShan Toolbox Installer             ║" -ForegroundColor Cyan
Write-Host "  ║      青衫工具箱安装程序                       ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Detect architecture / 步骤 1: 检测架构
$arch = Get-SystemArchitecture
Write-Step "Detected architecture / 检测到架构: $arch"

# Step 2: Get latest release / 步骤 2: 获取最新版本
$release = Get-LatestVersion

# Step 3: Download and install / 步骤 3: 下载并安装
$binaryPath = Install-Binary -Release $release -Architecture $arch

# Step 4: Add to PATH / 步骤 4: 添加到 PATH
Add-ToPath

# Step 5: Verify installation / 步骤 5: 验证安装
Test-Installation

# Done / 完成
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   ✅ Installation complete!                  ║" -ForegroundColor Green
Write-Host "  ║      安装完成！                              ║" -ForegroundColor Green
Write-Host "  ╠══════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║                                              ║" -ForegroundColor Green
Write-Host "  ║   Binary: $BinaryName.exe                    ║" -ForegroundColor Green
Write-Host "  ║   Location: $InstallDir                      ║" -ForegroundColor Green
Write-Host "  ║                                              ║" -ForegroundColor Green
Write-Host "  ║   Get started / 开始使用:                    ║" -ForegroundColor Green
Write-Host "  ║     qstoolbox --help                         ║" -ForegroundColor Green
Write-Host "  ║     qstoolbox health                         ║" -ForegroundColor Green
Write-Host "  ║                                              ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Note: You may need to restart your terminal for PATH changes to take effect." -ForegroundColor Yellow
Write-Host "  注意：您可能需要重启终端以使 PATH 变更生效。" -ForegroundColor Yellow
Write-Host ""
