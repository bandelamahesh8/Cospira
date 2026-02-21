@echo off
REM Run firewall check script as Administrator
REM This batch file will request elevation if not already running as admin

echo Checking for Administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with Administrator privileges...
    powershell -ExecutionPolicy Bypass -File "%~dp0firewall-check.ps1"
) else (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0firewall-check.ps1\"' -Verb RunAs"
)

pause
