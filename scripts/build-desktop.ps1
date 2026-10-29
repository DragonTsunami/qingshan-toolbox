# Build 青衫工具箱 with the portable toolchain stored under .toolchain/.
# This is a convenience wrapper for the current restricted machine; normal
# development machines should just use `cargo build` (MSVC toolchain).
#
# Usage:
#   .\scripts\build-desktop.ps1            # debug build
#   .\scripts\build-desktop.ps1 -Release   # release build
#   .\scripts\build-desktop.ps1 -Run       # build then launch
#   .\scripts\build-desktop.ps1 -Check     # cargo check only
param(
    [switch]$Release,
    [switch]$Run,
    [switch]$Check
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$toolchain = Join-Path $root '.toolchain\rustup\toolchains\stable-x86_64-pc-windows-gnu'

if (!(Test-Path $toolchain)) {
    throw "未找到便携 Rust 工具链：$toolchain。请先按 README 4.2 节准备，或直接使用系统 cargo。"
}

$cargoHome = Join-Path $root '.toolchain\cargo'
$lld = Join-Path $toolchain 'lib\rustlib\x86_64-pc-windows-gnu\bin\gcc-ld\ld.lld.exe'
if (!(Test-Path $lld)) {
    throw "未找到 ld.lld：$lld"
}

$env:CARGO_HOME = $cargoHome
$env:RUSTUP_HOME = Join-Path $root '.toolchain\rustup'
$env:PATH = "$cargoHome\bin;$(Join-Path $root '.toolchain\mingw-bin');$env:PATH"
$env:CARGO_HTTP_PROXY = ''
$env:NO_PROXY = '127.0.0.1,localhost'

# GNU dlltool cannot handle non-ASCII paths. When an ASCII subst drive (R:) is
# available, keep all build artifacts and temp files on it.
if (Test-Path 'R:\') {
    $env:CARGO_TARGET_DIR = 'R:\target'
    $env:TEMP = 'R:\.toolchain\tmp'
} else {
    $env:CARGO_TARGET_DIR = Join-Path $root 'desktop\target'
    $env:TEMP = Join-Path $root '.toolchain\tmp'
    Write-Warning "构建路径包含中文时，dlltool 可能失败。建议先执行：subst R: `"$root`""
}
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null

# The bundled GNU gcc driver is unusable in this sandbox; link with lld directly.
# The explicit -L entries are required because a custom linker gets no default
# sysroot search paths from rustc.
$rustLib = Join-Path $toolchain 'lib\rustlib\x86_64-pc-windows-gnu\lib'
$env:RUSTFLAGS = "-C linker=$lld -C linker-flavor=ld -C link-self-contained=yes -L native=$rustLib -L native=$rustLib\self-contained"
$env:CARGO_TERM_PROGRESS_WHEN = 'never'

$distIndex = Join-Path $root 'desktop\ui\dist\index.html'
if (!(Test-Path $distIndex)) {
    Write-Warning "未找到 desktop/ui/dist。请先执行：cd desktop/ui; npm run build"
}

$manifest = Join-Path $root 'desktop\src-tauri\Cargo.toml'
$mode = if ($Release) { @('--release') } else { @() }
# `custom-protocol` embeds ui/dist. Without it Tauri loads build.devUrl
# (http://localhost:1420), which only exists while a Vite server is running.
$features = if ($Release) { @('--features', 'custom-protocol') } else { @() }
if (-not $Release) {
    Write-Warning "debug 构建使用 devUrl（http://localhost:1420），需要 Vite 开发服务器。独立运行请使用 -Release。"
}

Push-Location (Join-Path $root 'desktop')
try {
    if ($Check) {
        cargo check --manifest-path $manifest
        exit $LASTEXITCODE
    }

    cargo build --manifest-path $manifest @mode @features
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $targetRoot = if ($env:CARGO_TARGET_DIR) { $env:CARGO_TARGET_DIR } else { Join-Path $root 'desktop\target' }
    $profile = if ($Release) { 'release' } else { 'debug' }
    $builtExe = Join-Path $targetRoot "$profile\opsdeck.exe"

    if ($Release) {
        # Stage a portable folder for distribution.
        $dist = Join-Path $root 'desktop\dist'
        New-Item -ItemType Directory -Force -Path $dist | Out-Null
        Copy-Item $builtExe (Join-Path $dist 'QingshanToolbox.exe') -Force
        $loader = Join-Path $targetRoot "$profile\WebView2Loader.dll"
        if (Test-Path $loader) {
            Copy-Item $loader (Join-Path $dist 'WebView2Loader.dll') -Force
        }
        Write-Host "release staged: $dist\QingshanToolbox.exe"
    }

    if ($Run) {
        if (!(Test-Path $builtExe)) { throw "构建成功但未找到可执行文件：$builtExe" }
        Write-Host "启动 $builtExe"
        Start-Process -FilePath $builtExe -WorkingDirectory (Split-Path $builtExe)
    }
}
finally {
    Pop-Location
}
