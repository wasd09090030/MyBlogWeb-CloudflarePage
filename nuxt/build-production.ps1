# Nuxt 3 Production Build Script
# Encoding: UTF-8 with BOM

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Nuxt 3 Production Build" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
if (-not (Test-Path "nuxt.config.ts")) {
    Write-Host "Error: Please run this script in Nuxt project root directory" -ForegroundColor Red
    exit 1
}

# 1. Backup dev config
Write-Host "Step 1: Backup development config..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Copy-Item .env .env.development.backup -Force
    Write-Host "  OK: Backed up .env" -ForegroundColor Green
}

# 2. Use production config
Write-Host ""
Write-Host "Step 2: Switch to production config..." -ForegroundColor Yellow
if (Test-Path ".env.production") {
    Copy-Item .env.production .env -Force
    Write-Host "  OK: Applied production config" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Production environment:" -ForegroundColor Cyan
    Get-Content .env | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "  Warning: .env.production not found, using current .env" -ForegroundColor Yellow
}

# 3. Clean old build
Write-Host ""
Write-Host "Step 3: Clean old build..." -ForegroundColor Yellow
if (Test-Path ".output") {
    Remove-Item -Recurse -Force .output
    Write-Host "  OK: Cleaned .output directory" -ForegroundColor Green
}
if (Test-Path ".nuxt") {
    Remove-Item -Recurse -Force .nuxt
    Write-Host "  OK: Cleaned .nuxt directory" -ForegroundColor Green
}

# 4. Check dependencies
Write-Host ""
Write-Host "Step 4: Check dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  Warning: node_modules not found, installing..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "  OK: Dependencies exist" -ForegroundColor Green
}

# 5. Production build
Write-Host ""
Write-Host "Step 5: Start production build..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes..." -ForegroundColor Gray
Write-Host ""

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  OK: Build successful!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  Error: Build failed!" -ForegroundColor Red
    
    # Restore dev config
    if (Test-Path ".env.development.backup") {
        Copy-Item .env.development.backup .env -Force
    }
    
    exit 1
}

# 6. Verify build output
Write-Host ""
Write-Host "Step 6: Verify build output..." -ForegroundColor Yellow

$outputExists = Test-Path ".output"
$publicExists = Test-Path ".output/public"
$serverExists = Test-Path ".output/server/index.mjs"
$cssFiles = Get-ChildItem .output/public/_nuxt/*.css -ErrorAction SilentlyContinue
$jsFiles = Get-ChildItem .output/public/_nuxt/*.js -ErrorAction SilentlyContinue

if ($outputExists -and $publicExists -and $serverExists) {
    Write-Host "  OK: Directory structure correct" -ForegroundColor Green
    Write-Host "     - .output/public/" -ForegroundColor Gray
    Write-Host "     - .output/server/" -ForegroundColor Gray
} else {
    Write-Host "  Error: Build output incomplete" -ForegroundColor Red
    exit 1
}

if ($cssFiles.Count -gt 0) {
    Write-Host "  OK: CSS files: $($cssFiles.Count)" -ForegroundColor Green
} else {
    Write-Host "  Warning: No CSS files found" -ForegroundColor Yellow
}

if ($jsFiles.Count -gt 0) {
    Write-Host "  OK: JS files: $($jsFiles.Count)" -ForegroundColor Green
} else {
    Write-Host "  Warning: No JS files found" -ForegroundColor Yellow
}

# 7. Display build statistics
Write-Host ""
Write-Host "Build Statistics:" -ForegroundColor Cyan

$outputSize = (Get-ChildItem .output -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "  Total size: $([math]::Round($outputSize, 2)) MB" -ForegroundColor White

$publicSize = (Get-ChildItem .output/public -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "  Static assets: $([math]::Round($publicSize, 2)) MB" -ForegroundColor White

# Display main files
Write-Host ""
Write-Host "  Main CSS files:" -ForegroundColor White
Get-ChildItem .output/public/_nuxt/*.css | Select-Object -First 5 | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1KB, 2)
    Write-Host "    - $($_.Name) ($sizeKB KB)" -ForegroundColor Gray
}

# 8. Create deployment package
Write-Host ""
Write-Host "Step 7: Create deployment package..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipName = "nuxt-deploy-$timestamp.zip"

try {
    # Create temporary deploy directory
    $deployDir = "deploy-temp"
    if (Test-Path $deployDir) {
        Remove-Item -Recurse -Force $deployDir
    }
    New-Item -ItemType Directory -Path $deployDir -Force | Out-Null
    
    # Copy build output
    Copy-Item -Recurse .output/* $deployDir/
    
    # Copy config files
    if (Test-Path "ecosystem.config.js") {
        Copy-Item ecosystem.config.js $deployDir/
    }
    if (Test-Path ".env.production") {
        Copy-Item .env.production "$deployDir/.env"
    }
    
    # Compress
    Compress-Archive -Path "$deployDir/*" -DestinationPath $zipName -Force
    
    # Clean temporary directory
    Remove-Item -Recurse -Force $deployDir
    
    $zipSize = (Get-Item $zipName).Length / 1MB
    Write-Host "  OK: Deployment package created: $zipName ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
} catch {
    Write-Host "  Warning: Cannot create deployment package" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# 9. Restore dev config
Write-Host ""
Write-Host "Step 8: Restore development config..." -ForegroundColor Yellow
if (Test-Path ".env.development.backup") {
    Copy-Item .env.development.backup .env -Force
    Remove-Item .env.development.backup -Force
    Write-Host "  OK: Restored development config" -ForegroundColor Green
}

# 10. Display deployment instructions
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Upload deployment package to server" -ForegroundColor White
Write-Host "   File: $zipName" -ForegroundColor Gray
Write-Host ""
Write-Host "2. On server, run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "   cd /www/wwwroot" -ForegroundColor Cyan
Write-Host "   mv Nuxt Nuxt.backup" -ForegroundColor Cyan
Write-Host "   unzip $zipName -d Nuxt" -ForegroundColor Cyan
Write-Host "   chmod -R 755 Nuxt" -ForegroundColor Cyan
Write-Host "   chown -R www:www Nuxt/public" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Start service:" -ForegroundColor White
Write-Host "   cd Nuxt" -ForegroundColor Cyan
Write-Host "   pm2 start ecosystem.config.js" -ForegroundColor Cyan
Write-Host "   pm2 save" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Verify deployment:" -ForegroundColor White
Write-Host "   pm2 status" -ForegroundColor Cyan
Write-Host "   pm2 logs nuxt-app" -ForegroundColor Cyan
Write-Host "   curl https://wasd09090030.top" -ForegroundColor Cyan
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Ask for preview
$preview = Read-Host "Preview build locally? (y/n)"
if ($preview -eq "y" -or $preview -eq "Y") {
    Write-Host ""
    Write-Host "Starting preview server..." -ForegroundColor Yellow
    Write-Host "  Visit: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    npm run preview
}