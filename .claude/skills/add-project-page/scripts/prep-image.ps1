<#
.SYNOPSIS
  Resize and compress a screenshot for the portfolio site.

.DESCRIPTION
  Screenshots of dashboards and notebooks arrive at 3000px wide and 700KB+, but the
  site displays them in a ~460px column. This shrinks them to a retina-safe width,
  re-encodes, and prints the markup to paste into the page.

  Uses System.Drawing (built into Windows) so there is no dependency on Python or
  ImageMagick, neither of which is installed on this machine.

.EXAMPLE
  .\prep-image.ps1 -Path "C:\Users\mike_\Downloads\dashboard.png" `
                   -OutPath "C:\Users\mike_\Documents\GitHub\quick-portfolio\images\fabric_kpi_dashboard.jpg" `
                   -Alt "Fabric KPI dashboard showing ticket volume by technician"
#>
param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$OutPath,
    [string]$Alt = "",
    [int]$MaxWidth = 920,
    [int]$Quality = 82
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Path)) { throw "Source image not found: $Path" }

$src = [System.Drawing.Image]::FromFile((Resolve-Path $Path).Path)
try {
    $srcBytes = (Get-Item $Path).Length
    $srcW = $src.Width
    $srcH = $src.Height

    # Only ever scale down. Enlarging a screenshot just adds bytes and blur.
    $scale = if ($src.Width -gt $MaxWidth) { $MaxWidth / $src.Width } else { 1 }
    $w = [int][Math]::Round($src.Width * $scale)
    $h = [int][Math]::Round($src.Height * $scale)

    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Charts and dashboards are usually saved as PNG with an alpha channel that is
    # fully opaque. Flatten onto white before a JPEG encode so transparency does
    # not come out black.
    $ext = [System.IO.Path]::GetExtension($OutPath).ToLower()
    if ($ext -in @('.jpg', '.jpeg')) {
        $gfx.Clear([System.Drawing.Color]::White)
    }
    $gfx.DrawImage($src, 0, 0, $w, $h)

    $outDir = Split-Path $OutPath -Parent
    if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

    if ($ext -in @('.jpg', '.jpeg')) {
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
            Where-Object { $_.MimeType -eq 'image/jpeg' }
        $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
        $bmp.Save($OutPath, $codec, $params)
    }
    else {
        $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
}
finally {
    if ($gfx) { $gfx.Dispose() }
    if ($bmp) { $bmp.Dispose() }
    $src.Dispose()
}

$outBytes = (Get-Item $OutPath).Length
$repoRoot = Split-Path (Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent) -Parent
$webPath = '/' + ((Resolve-Path $OutPath).Path.Substring($repoRoot.Length + 1) -replace '\\', '/')

Write-Output ""
Write-Output ("  source: {0}x{1}, {2} KB" -f $srcW, $srcH, [int]($srcBytes / 1KB))
Write-Output ("  output: {0}x{1}, {2} KB  ({3}% smaller)" -f $w, $h, [int]($outBytes / 1KB),
    [int]((1 - $outBytes / $srcBytes) * 100))
if ($outBytes -gt 200KB) {
    Write-Output "  NOTE: still over the 200 KB budget - rerun with a lower -Quality (e.g. 70)."
}
Write-Output ""
Write-Output "  Paste this into the page:"
Write-Output ""
Write-Output ("<img src=""{0}"" alt=""{1}"" style=""max-width:100%; height:auto;"" />" -f $webPath, $Alt)
Write-Output ""
