$ErrorActionPreference = "SilentlyContinue"

Write-Host "Stopping manual node processes..."
Stop-Process -Name "node" -Force

Write-Host "Removing corrupted PM2 home..."
Remove-Item -Path "C:\Users\Admin\.pm2" -Recurse -Force

Write-Host "Killing any remaining PM2 daemons..."
taskkill /F /IM pm2.exe
taskkill /F /IM node.exe

Write-Host "Starting application via PM2..."
Set-Location "C:\Users\Admin\Documents\AntiGravity\server"
$env:PM2_HOME = "C:\Users\Admin\.pm2"
npx pm2 start ecosystem.config.js --env production
npx pm2 save

Write-Host "PM2 Repair Complete."
