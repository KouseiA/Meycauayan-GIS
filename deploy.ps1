# Meycauayan GIS Portal - Deployment Package Script
# Run this from PowerShell to create a clean deployment zip
# Usage: powershell -ExecutionPolicy Bypass -File deploy.ps1

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputDir  = Join-Path $projectDir 'deploy_package'
$timestamp  = Get-Date -Format 'yyyyMMdd-HHmm'
$zipName    = "meycauayan-gis-deploy-$timestamp.zip"
$zipPath    = Join-Path $projectDir $zipName

Write-Host ''
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host '  Meycauayan GIS - Deployment Packager' -ForegroundColor Cyan
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host ''

# Clean previous build
if (Test-Path $outputDir) {
    Remove-Item -Recurse -Force $outputDir
}
New-Item -ItemType Directory -Path $outputDir | Out-Null

# --- Files to INCLUDE ---
$includeFiles = @(
    'index.html',
    'admin.html',
    'meycauayan-barangays.geojson',
    '.htaccess'
)

$includeDirs = @(
    'api',
    'assets',
    'data',
    'database'
)

Write-Host '[1/4] Copying files...' -ForegroundColor Yellow

# Copy individual files
foreach ($file in $includeFiles) {
    $src = Join-Path $projectDir $file
    if (Test-Path $src) {
        Copy-Item $src -Destination $outputDir
        Write-Host "  + $file" -ForegroundColor Green
    } else {
        Write-Host "  ! $file not found, skipping" -ForegroundColor Red
    }
}

# Copy directories
foreach ($dir in $includeDirs) {
    $src = Join-Path $projectDir $dir
    $dst = Join-Path $outputDir $dir
    if (Test-Path $src) {
        Copy-Item -Recurse $src -Destination $dst
        Write-Host "  + $dir/" -ForegroundColor Green
    } else {
        Write-Host "  ! $dir/ not found, skipping" -ForegroundColor Red
    }
}

# Remove any temp files that slipped in
Write-Host ''
Write-Host '[2/4] Cleaning temp files...' -ForegroundColor Yellow
Get-ChildItem -Path $outputDir -Recurse -File | Where-Object {
    $_.Name -like 'temp_*' -or
    $_.Name -eq 'hash.php' -or
    $_.Name -eq 'start.bat' -or
    $_.Name -like '*.log' -or
    $_.Name -like '*.tmp'
} | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "  - Removed $($_.Name)" -ForegroundColor DarkYellow
}

Write-Host ''
Write-Host '[3/4] Creating zip package...' -ForegroundColor Yellow

# Create zip
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $outputDir '*') -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "  Archive: $zipName" -ForegroundColor Green

# Cleanup temp directory
Remove-Item -Recurse -Force $outputDir

# Summary
$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ''
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host '  DONE - Package ready for upload' -ForegroundColor Green
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host ''
Write-Host "  File: $zipName" -ForegroundColor White
Write-Host "  Size: $zipSize MB" -ForegroundColor White
Write-Host ''
Write-Host '  NEXT STEPS:' -ForegroundColor Yellow
Write-Host "  1. Upload $zipName to your hosting via cPanel File Manager" -ForegroundColor White
Write-Host '  2. Extract to public_html/' -ForegroundColor White
Write-Host '  3. Set up MySQL database (import database/schema.sql)' -ForegroundColor White
Write-Host '  4. Configure environment variables (see .env.example)' -ForegroundColor White
Write-Host '  5. Run database/seed.php once to populate data' -ForegroundColor White
Write-Host '  6. Change the default admin password' -ForegroundColor Red
Write-Host ''
