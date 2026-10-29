# Generates the 青衫工具箱 icon set with System.Drawing (no external tooling).
# Output: desktop/src-tauri/icons/{32x32,128x128,128x128@2x,icon}.png + icon.ico
Add-Type -AssemblyName System.Drawing

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Join-Path (Get-Location) 'scripts' }
$outDir = Join-Path $scriptRoot '..\desktop\src-tauri\icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-OpsDeckBitmap([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    $pad = [int]($size * 0.045)
    $rect = New-Object System.Drawing.Rectangle($pad, $pad, ($size - 2 * $pad), ($size - 2 * $pad))
    $radius = [float]($size * 0.22)
    $diameter = $radius * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc(($rect.Right - $diameter), $rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc(($rect.Right - $diameter), ($rect.Bottom - $diameter), $diameter, $diameter, 0, 90)
    $path.AddArc($rect.X, ($rect.Bottom - $diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    $start = [System.Drawing.Color]::FromArgb(255, 13, 148, 136)
    $end = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $start, $end, 45)
    $g.FillPath($brush, $path)

    $glow = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glow.AddEllipse(($size * 0.12), ($size * 0.12), ($size * 0.55), ($size * 0.55))
    $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($glow)
    $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(46, 255, 255, 255)
    $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 255, 255))
    $g.FillPath($glowBrush, $glow)

    $font = New-Object System.Drawing.Font('Consolas', [float]($size * 0.33), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF(0, [float]($size * 0.025), $size, $size)
    $g.DrawString('>_', $font, [System.Drawing.Brushes]::White, $textRect, $format)

    $border = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(38, 255, 255, 255), [float]([Math]::Max(2, $size * 0.006)))
    $g.DrawPath($border, $path)

    $g.Dispose()
    return $bmp
}

function Save-ScaledPng([System.Drawing.Bitmap]$source, [int]$size, [string]$path) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.DrawImage($source, 0, 0, $size, $size)
    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$master = New-OpsDeckBitmap 1024
$master.Save((Join-Path $outDir 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)

Save-ScaledPng $master 32 (Join-Path $outDir '32x32.png')
Save-ScaledPng $master 128 (Join-Path $outDir '128x128.png')
Save-ScaledPng $master 256 (Join-Path $outDir '128x128@2x.png')

$iconBitmap = New-OpsDeckBitmap 256
$handle = $iconBitmap.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($handle)
$stream = [System.IO.File]::Create((Join-Path $outDir 'icon.ico'))
$icon.Save($stream)
$stream.Close()
$icon.Dispose()

$master.Dispose()
$iconBitmap.Dispose()

Get-ChildItem $outDir | Select-Object Name, Length | Format-Table -AutoSize
