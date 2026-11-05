$src = 'R:\QingshanToolbox'
$dest1 = 'D:\青衫工具箱'
$dest2 = 'D:\Archive\安装包\青衫工具箱_方案二_双栏工坊\QingshanToolbox'
$dest3 = 'D:\Archive\安装包\青衫工具箱_方案三_极光流体\demo'

Copy-Item -Path "$src\QingshanToolbox.exe" -Destination "$dest1\QingshanToolbox.exe" -Force
Copy-Item -Path "$src\QingshanToolbox.exe" -Destination "$dest2\QingshanToolbox.exe" -Force
Copy-Item -Path "$src\QingshanToolbox.exe" -Destination "$dest3\QingshanToolbox.exe" -Force

function Build-Installer($dir, $sourceDir, $outputName) {
    [System.IO.Directory]::SetCurrentDirectory($dir)
    Set-Location $dir
    $csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
    $wpf = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\WPF'
    $outDir = Join-Path $dir '输出'
    if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
    
    $tempZip = Join-Path $dir 'temp_payload.zip'
    $stubExe = Join-Path $dir 'installer_stub.exe'
    if (Test-Path $tempZip) { Remove-Item $tempZip -Force }
    if (Test-Path $stubExe) { Remove-Item $stubExe -Force }
    
    Write-Host "[1/3] 编译 UI 引导程序: $dir..."
    & $csc /target:winexe /win32manifest:"$dir\app.manifest" /win32icon:"$dir\app.ico" /resource:"$dir\app_icon.png",AppIcon.png /resource:"$dir\app.ico",app.ico /out:"$stubExe" /lib:$wpf /r:PresentationFramework.dll /r:PresentationCore.dll /r:WindowsBase.dll /r:System.Xaml.dll /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /r:Microsoft.CSharp.dll "$dir\installer_core.cs" >$null
    
    if (!(Test-Path $stubExe)) { throw '编译 stub 失败' }
    
    Write-Host "[2/3] 压缩应用包: $sourceDir..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $sourcePath = (Resolve-Path (Join-Path $dir $sourceDir)).Path
    [System.IO.Compression.ZipFile]::CreateFromDirectory($sourcePath, $tempZip)
    
    Write-Host "[3/3] 生成自解压安装包: $outputName..."
    $outPath = Join-Path $outDir $outputName
    $fsOut = [System.IO.File]::Create($outPath)
    $bStub = [System.IO.File]::ReadAllBytes($stubExe)
    $fsOut.Write($bStub, 0, $bStub.Length)
    $fsZip = [System.IO.File]::OpenRead($tempZip)
    $fsZip.CopyTo($fsOut)
    $fsZip.Close()
    $offset = [System.BitConverter]::GetBytes([long]$bStub.Length)
    $fsOut.Write($offset, 0, 8)
    $fsOut.Close()
    
    Remove-Item $stubExe -Force
    Remove-Item $tempZip -Force
    Write-Host "[OK] 已成功生成: $outPath" -ForegroundColor Green
}

Build-Installer 'D:\Archive\安装包\青衫工具箱_方案二_双栏工坊' 'QingshanToolbox' '青衫工具箱_方案二_安装程序_v1.1.2.exe'
Build-Installer 'D:\Archive\安装包\青衫工具箱_方案三_极光流体' 'demo' '青衫工具箱_方案三_安装程序_v1.1.2.exe'
