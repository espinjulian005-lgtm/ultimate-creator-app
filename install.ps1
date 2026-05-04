# Ultimate Creator App - installation script (Windows)
# Usage: open PowerShell in this folder and run: .\install.ps1

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host " Ultimate Creator App - Installation" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""

# 1. Check Node.js
Write-Host "[1/6] Verification de Node.js..." -ForegroundColor Cyan
try {
    $node = node --version 2>$null
    Write-Host "  Node.js detecte : $node" -ForegroundColor Green
} catch {
    Write-Host "  ERREUR : Node.js n'est pas installe." -ForegroundColor Red
    Write-Host "  Telecharge-le ici : https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 2. Install npm packages
Write-Host ""
Write-Host "[2/6] Installation des dependances npm..." -ForegroundColor Cyan
Write-Host "  (la 1ere installation peut prendre 2-3 min - on telecharge ~200 MB)" -ForegroundColor Gray
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERREUR npm install" -ForegroundColor Red
    exit 1
}

# 3. Download yt-dlp.exe
Write-Host ""
Write-Host "[3/6] Telechargement de yt-dlp.exe..." -ForegroundColor Cyan
$binDir = Join-Path $PSScriptRoot "bin"
if (!(Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir | Out-Null }
$ytDlp = Join-Path $binDir "yt-dlp.exe"
if (!(Test-Path $ytDlp)) {
    Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytDlp -UseBasicParsing
    Write-Host "  yt-dlp.exe telecharge." -ForegroundColor Green
} else {
    Write-Host "  yt-dlp.exe deja present." -ForegroundColor Green
}

# 4. Download ffmpeg.exe
Write-Host ""
Write-Host "[4/6] Telechargement de ffmpeg..." -ForegroundColor Cyan
$ffmpeg = Join-Path $binDir "ffmpeg.exe"
if (!(Test-Path $ffmpeg)) {
    $tmpZip = Join-Path $env:TEMP "ffmpeg-uc.zip"
    $tmpDir = Join-Path $env:TEMP "ffmpeg-uc"
    Write-Host "  Telechargement de l'archive (~80 MB)..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $tmpZip -UseBasicParsing
    Write-Host "  Extraction..." -ForegroundColor Gray
    if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
    Expand-Archive -Path $tmpZip -DestinationPath $tmpDir
    $found = Get-ChildItem -Path $tmpDir -Filter "ffmpeg.exe" -Recurse | Select-Object -First 1
    Copy-Item $found.FullName $ffmpeg
    $ffprobe = Get-ChildItem -Path $tmpDir -Filter "ffprobe.exe" -Recurse | Select-Object -First 1
    if ($ffprobe) { Copy-Item $ffprobe.FullName (Join-Path $binDir "ffprobe.exe") }
    Remove-Item $tmpZip -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
    Write-Host "  ffmpeg installe." -ForegroundColor Green
} else {
    Write-Host "  ffmpeg deja present." -ForegroundColor Green
}

# 5. Download Real-ESRGAN (image upscaler)
Write-Host ""
Write-Host "[5/6] Telechargement de Real-ESRGAN (upscaler IA)..." -ForegroundColor Cyan
$esrganExe = Join-Path $binDir "realesrgan-ncnn-vulkan.exe"
if (!(Test-Path $esrganExe)) {
    $esrganUrl = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip"
    $tmpZip = Join-Path $env:TEMP "realesrgan-uc.zip"
    $tmpDir = Join-Path $env:TEMP "realesrgan-uc"
    Write-Host "  Telechargement (~50 MB)..." -ForegroundColor Gray
    try {
        Invoke-WebRequest -Uri $esrganUrl -OutFile $tmpZip -UseBasicParsing
        Write-Host "  Extraction..." -ForegroundColor Gray
        if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
        Expand-Archive -Path $tmpZip -DestinationPath $tmpDir
        $exeFound = Get-ChildItem -Path $tmpDir -Filter "realesrgan-ncnn-vulkan.exe" -Recurse | Select-Object -First 1
        if ($exeFound) {
            $sourceDir = $exeFound.Directory
            Get-ChildItem -Path $sourceDir | ForEach-Object {
                Copy-Item $_.FullName -Destination $binDir -Recurse -Force
            }
            Write-Host "  Real-ESRGAN installe (binaire + modeles)." -ForegroundColor Green
        } else {
            Write-Host "  Avertissement : .exe non trouve dans l'archive" -ForegroundColor Yellow
        }
        Remove-Item $tmpZip -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
    } catch {
        Write-Host "  Erreur de telechargement : $_" -ForegroundColor Red
        Write-Host "  L'upscaler ne fonctionnera pas tant que Real-ESRGAN n'est pas installe." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Real-ESRGAN deja present." -ForegroundColor Green
}

# 6. Generate PNG icons for the extension
Write-Host ""
Write-Host "[6/6] Generation des icones PNG de l'extension..." -ForegroundColor Cyan
Add-Type -AssemblyName System.Drawing

$logoSource = Join-Path $PSScriptRoot "build\logo-source.png"
$useCustomLogo = Test-Path $logoSource

function New-IconFromSource {
    param([int]$size, [string]$path)
    $img = [System.Drawing.Image]::FromFile($logoSource)
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $size, $size)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}

function New-UCIcon {
    param([int]$size, [string]$path)
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 122, 26),
        [System.Drawing.Color]::FromArgb(255, 154, 74),
        45
    )
    $radius = [int]($size * 0.22)
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc(0, 0, $radius * 2, $radius * 2, 180, 90)
    $gp.AddArc($size - $radius * 2, 0, $radius * 2, $radius * 2, 270, 90)
    $gp.AddArc($size - $radius * 2, $size - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $gp.AddArc(0, $size - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $gp.CloseFigure()
    $g.FillPath($brush, $gp)
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(26, 13, 0)), ([Math]::Max(2, $size / 16))
    $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
    $cx = $size / 2; $top = $size * 0.28; $bot = $size * 0.62
    $g.DrawLine($pen, $cx, $top, $cx, $bot)
    $arrow = $size * 0.16
    $g.DrawLine($pen, $cx - $arrow, $bot - $arrow, $cx, $bot)
    $g.DrawLine($pen, $cx + $arrow, $bot - $arrow, $cx, $bot)
    $barBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(26, 13, 0))
    $barW = $size * 0.42; $barH = [Math]::Max(2, $size * 0.06)
    $g.FillRectangle($barBrush, ($size - $barW) / 2, $size * 0.74, $barW, $barH)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}

$iconsDir = Join-Path $PSScriptRoot "extension\icons"
if (!(Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null }
$srcDir = Join-Path $PSScriptRoot "src"
if (!(Test-Path $srcDir)) { New-Item -ItemType Directory -Path $srcDir -Force | Out-Null }

if ($useCustomLogo) {
    Write-Host "  Source detectee : build\logo-source.png" -ForegroundColor Green
    New-IconFromSource 16 (Join-Path $iconsDir "icon16.png")
    New-IconFromSource 48 (Join-Path $iconsDir "icon48.png")
    New-IconFromSource 128 (Join-Path $iconsDir "icon128.png")
    New-IconFromSource 256 (Join-Path (Join-Path $PSScriptRoot "build") "icon.png")
    New-IconFromSource 128 (Join-Path $srcDir "logo.png")
    Write-Host "  Icones generees depuis le logo personnalise." -ForegroundColor Green
} else {
    New-UCIcon 16 (Join-Path $iconsDir "icon16.png")
    New-UCIcon 48 (Join-Path $iconsDir "icon48.png")
    New-UCIcon 128 (Join-Path $iconsDir "icon128.png")
    New-UCIcon 256 (Join-Path (Join-Path $PSScriptRoot "build") "icon.png")
    New-UCIcon 128 (Join-Path $srcDir "logo.png")
    Write-Host "  Icones procedurales generees (place build\logo-source.png pour utiliser ton logo)." -ForegroundColor Yellow
}

# Generate .ico
try {
    $iconImg = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot "build\icon.png"))
    $iconBmp = New-Object System.Drawing.Bitmap $iconImg, 256, 256
    $iconHandle = $iconBmp.GetHicon()
    $icoFile = [System.IO.File]::OpenWrite((Join-Path $PSScriptRoot "build\icon.ico"))
    [System.Drawing.Icon]::FromHandle($iconHandle).Save($icoFile)
    $icoFile.Close()
    $iconImg.Dispose(); $iconBmp.Dispose()
    Write-Host "  icon.ico genere." -ForegroundColor Green
} catch {
    Write-Host "  (icon.ico non genere - pas critique)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host " Installation terminee !" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host " Pour lancer l'app :" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host " Pour creer un installateur .exe :" -ForegroundColor White
Write-Host "   npm run package" -ForegroundColor Yellow
Write-Host ""
