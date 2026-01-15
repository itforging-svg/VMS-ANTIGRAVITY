@echo off
title VMS-ANTIGRAVITY Server
cd /d "%~dp0"
echo Starting VMS-ANTIGRAVITY Server...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "Start_Server_Robust.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo PowerShell script exited with error code %ERRORLEVEL%.
)
echo.
echo Press any key to close this window...
pause >nul
