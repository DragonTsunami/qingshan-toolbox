param(
    [switch]$Release,
    [switch]$Run,
    [switch]$Check
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Resolve-ToolchainRoot {
    if ($env:QINGSHAN_TOOLCHAIN_ROOT) { return (Resolve-Path $env:QINGSHAN_TOOLCHAIN_ROOT).Path }
    if (Test-Path 'C:\Toolchain\cargo\bin\cargo.exe') { return 'C:\Toolchain' }
    $local = Join-Path $root '.toolchain'
    if (Test-Path (Join-Path $local 'cargo\bin\cargo.exe')) { return $local }
    throw "未找到便携 Rust 工具链。请设置 QINGSHAN_TOOLCHAIN_ROOT。"
}

$toolchainRoot = Resolve-ToolchainRoot
$toolchain = Join-Path $toolchainRoot 'rustup\toolchains\stable-x86_64-pc-windows-gnu'

if (!(Test-Path $toolchain)) {
    throw "未找到 Rust 工具链目录：$toolchain"
}

$cargoHome = Join-Path $toolchainRoot 'cargo'
$lld = Join-Path $toolchain 'lib\rustlib\x86_64-pc-windows-gnu\bin\gcc-ld\ld.lld.exe'
if (!(Test-Path $lld)) {
    throw "未找到 ld.lld：$lld"
}

$env:CARGO_HOME = $cargoHome
$env:RUSTUP_HOME = Join-Path $toolchainRoot 'rustup'
$env:PATH = "$cargoHome\bin;$(Join-Path $toolchainRoot 'mingw-bin');$env:PATH"
$env:CARGO_HTTP_PROXY = ''
$env:NO_PROXY = '127.0.0.1,localhost'

$asciiDrive = $null
foreach ($letter in @('R', 'S')) {
    if (Test-Path "${letter}:\") { $asciiDrive = "${letter}:"; break }
}
if ($asciiDrive) {
    $env:CARGO_TARGET_DIR = "$asciiDrive\target"
    $env:TEMP = "$asciiDrive\.toolchain\tmp"
} else {
    $env:CARGO_TARGET_DIR = Join-Path $root 'desktop\target'
    $env:TEMP = Join-Path $root '.toolchain\tmp'
}
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null

$rustLib = Join-Path $toolchain 'lib\rustlib\x86_64-pc-windows-gnu\lib'
$env:RUSTFLAGS = "-C linker=$lld -C linker-flavor=ld -C link-self-contained=yes -L native=$rustLib -L native=$rustLib\self-contained"
$env:CARGO_TERM_PROGRESS_WHEN = 'never'

$distIndex = Join-Path $root 'desktop\ui\dist\index.html'
if (!(Test-Path $distIndex)) {
    Write-Warning "未找到 desktop/ui/dist。请先执行：cd desktop/ui; npm run build"
}

$manifest = Join-Path $root 'desktop\src-tauri\Cargo.toml'
$buildArgs = @('build', '--manifest-path', $manifest)
if ($Release) {
    $buildArgs += @('--release', '--features', 'custom-protocol')
}

Push-Location (Join-Path $root 'desktop')
try {
    if ($Check) {
        cargo check --manifest-path $manifest
        exit $LASTEXITCODE
    }

    cargo @buildArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $targetRoot = if ($env:CARGO_TARGET_DIR) { $env:CARGO_TARGET_DIR } else { Join-Path $root 'desktop\target' }
    $profile = if ($Release) { 'release' } else { 'debug' }
    $builtExe = Join-Path $targetRoot "$profile\opsdeck.exe"

    if ($Release) {
        $dist = Join-Path $root 'QingshanToolbox'
        New-Item -ItemType Directory -Force -Path $dist | Out-Null
        $stagedExe = Join-Path $dist 'QingshanToolbox.exe'
        Copy-Item $builtExe $stagedExe -Force
        $loader = Join-Path $targetRoot "$profile\WebView2Loader.dll"
        $stagedLoader = Join-Path $dist 'WebView2Loader.dll'
        if (Test-Path $loader) {
            Copy-Item $loader $stagedLoader -Force
        }

        $configPath = Join-Path $root 'desktop\src-tauri\tauri.conf.json'
        $version = (Select-String -Path $configPath -Pattern '"version"\s*:\s*"([^"]+)"').Matches[0].Groups[1].Value
        $zip = Join-Path $dist "QingshanToolbox-v$version-win-x64.zip"
        if (Test-Path $zip) { Remove-Item $zip -Force }
        Compress-Archive -Path $stagedExe,$stagedLoader -DestinationPath $zip -Force

        $checksums = @($stagedExe, $stagedLoader, $zip) | ForEach-Object {
            $hash = (Get-FileHash $_ -Algorithm SHA256).Hash
            "$hash  $([System.IO.Path]::GetFileName($_))"
        }
        [System.IO.File]::WriteAllLines((Join-Path $dist 'SHA256SUMS.txt'), $checksums, (New-Object System.Text.UTF8Encoding($false)))

        Write-Host "release staged: $dist"
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