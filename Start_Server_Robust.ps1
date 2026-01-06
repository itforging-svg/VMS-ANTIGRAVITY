# VMS-ANTIGRAVITY Server Runner
# This script ensures the server runs reliably, even if PM2 is broken.

$ServerDir = "C:\Users\Admin\Documents\AntiGravity\server"
$MaxRetries = 5
$RetryCount = 0

Write-Host "Initializing VMS Server..." -ForegroundColor Cyan

# 1. Try to kill any rogue node processes we have access to
Write-Host "Cleaning up old processes..."
Stop-Process -Name "node" -ErrorAction SilentlyContinue

# 2. Enter Keep-Alive Loop
Set-Location $ServerDir

while ($true) {
    Write-Host "Starting Server..." -ForegroundColor Green
    
    # Run the server
    try {
        # Check if build exists, if not, build it
        if (-not (Test-Path "dist\index.js")) {
            Write-Host "Build not found. Building..."
            npm run build
        }

        # Start Node directly
        node dist/index.js
    }
    catch {
        Write-Host "Error starting server: $_" -ForegroundColor Red
    }

    Write-Host "Server crashed or stopped. Restarting in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}
