# Ultimate Creator App — regenerate all icons from build/logo-source.png
# Usage: .\regen-icons.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = $PSScriptRoot
$source = Join-Path $root "build\logo-source.png"

if (!(Test-Path $source)) {
    Write-Host ""
    Write-Host "ERREUR : logo-source.png introuvable" -ForegroundColor Red
    Write-Host ""
    Write-Host "Sauvegarde d'abord l'image PNG du logo (boîte à outils seule, sans le texte) à :" -ForegroundColor Yellow
    Write-Host "  $source" -ForegroundColor White
    Write-Host ""
    Write-Host "Puis relance ce script." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host " Regeneration des icones depuis logo-source.png" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""

function Resize-Png {
    param([string]$src, [string]$dst, [int]$size)
    $img = [System.Drawing.Image]::FromFile($src)
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $size, $size)
    $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
    Write-Host "  ${size}px -> $dst" -ForegroundColor Green
}

# Ensure all destination folders exist
$folders = @(
    (Join-Path $root "src"),
    (Join-Path $root "build"),
    (Join-Path $root "extension\icons")
)
foreach ($f in $folders) { if (!(Test-Path $f)) { New-Item -ItemType Directory -Path $f -Force | Out-Null } }

# In-app sidebar logo (displayed at 44x44, source 128 for retina sharpness)
Resize-Png $source (Join-Path $root "src\logo.png") 128

# Window icon / installer assets
Resize-Png $source (Join-Path $root "build\icon.png") 256
Resize-Png $source (Join-Path $root "build\icon-512.png") 512

# Browser extension
Resize-Png $source (Join-Path $root "extension\icons\icon16.png") 16
Resize-Png $source (Join-Path $root "extension\icons\icon48.png") 48
Resize-Png $source (Join-Path $root "extension\icons\icon128.png") 128

# Generate .ico (multi-size embedded)
Write-Host ""
Write-Host "Generation de icon.ico..." -ForegroundColor Cyan
try {
    $sizes = @(16, 32, 48, 64, 128, 256)
    $tmpFolder = Join-Path $env:TEMP "uc-icons-$(Get-Random)"
    New-Item -ItemType Directory -Path $tmpFolder | Out-Null

    $pngFiles = @()
    foreach ($s in $sizes) {
        $p = Join-Path $tmpFolder "icon-$s.png"
        Resize-Png $source $p $s
        $pngFiles += $p
    }

    # Build a multi-image ICO file manually (ICONDIR + ICONDIRENTRY + image data)
    $icoPath = Join-Path $root "build\icon.ico"
    $fs = [System.IO.File]::Open($icoPath, 'Create')
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR header
    $bw.Write([uint16]0)              # Reserved
    $bw.Write([uint16]1)              # Type: 1 = icon
    $bw.Write([uint16]$sizes.Count)   # Number of images

    # Compute offsets
    $headerSize = 6 + (16 * $sizes.Count)
    $offset = $headerSize
    $pngBytes = @()
    foreach ($p in $pngFiles) { $pngBytes += ,([System.IO.File]::ReadAllBytes($p)) }

    # ICONDIRENTRY for each image
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $s = $sizes[$i]
        $bytes = $pngBytes[$i]
        $w = if ($s -ge 256) { 0 } else { $s }
        $h = if ($s -ge 256) { 0 } else { $s }
        $bw.Write([byte]$w)             # Width
        $bw.Write([byte]$h)             # Height
        $bw.Write([byte]0)              # Colors in palette
        $bw.Write([byte]0)              # Reserved
        $bw.Write([uint16]1)            # Color planes
        $bw.Write([uint16]32)           # Bits per pixel
        $bw.Write([uint32]$bytes.Length) # Image size
        $bw.Write([uint32]$offset)       # Image offset
        $offset += $bytes.Length
    }

    # Image data
    foreach ($bytes in $pngBytes) { $bw.Write($bytes) }

    $bw.Close()
    $fs.Close()
    Remove-Item -Recurse -Force $tmpFolder
    Write-Host "  icon.ico genere ($($sizes -join 'x, '))" -ForegroundColor Green
} catch {
    Write-Host "  Erreur ICO : $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host " Icones regenerees !" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host " Relance l'app pour voir le nouveau logo :" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor Yellow
Write-Host ""
