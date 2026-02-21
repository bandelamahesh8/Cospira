@echo off
REM Add Windows Firewall rules for Cospira Server (localhost and network)
REM This allows Android emulator (10.0.2.2) to connect to the server

echo ========================================
echo Cospira Server - Firewall Configuration
echo ========================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges.
    echo Please right-click and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo Running with Administrator privileges...
echo.

REM Remove existing rules (if any)
echo Removing existing firewall rules...
netsh advfirewall firewall delete rule name="Cospira Server (TCP-In)" >nul 2>&1
netsh advfirewall firewall delete rule name="Cospira Server (TCP-Out)" >nul 2>&1
netsh advfirewall firewall delete rule name="Cospira Server Localhost (TCP-In)" >nul 2>&1
echo.

REM Add inbound rule for all interfaces
echo Adding inbound rule for port 3001 (all interfaces)...
netsh advfirewall firewall add rule name="Cospira Server (TCP-In)" dir=in action=allow protocol=TCP localport=3001 profile=any
if %errorLevel% neq 0 (
    echo ERROR: Failed to add inbound rule
    pause
    exit /b 1
)
echo OK: Inbound rule added
echo.

REM Add outbound rule for all interfaces
echo Adding outbound rule for port 3001 (all interfaces)...
netsh advfirewall firewall add rule name="Cospira Server (TCP-Out)" dir=out action=allow protocol=TCP localport=3001 profile=any
if %errorLevel% neq 0 (
    echo ERROR: Failed to add outbound rule
    pause
    exit /b 1
)
echo OK: Outbound rule added
echo.

REM Add specific localhost rule for Android emulator
echo Adding localhost loopback rule for Android emulator...
netsh advfirewall firewall add rule name="Cospira Server Localhost (TCP-In)" dir=in action=allow protocol=TCP localport=3001 remoteip=127.0.0.1,10.0.2.2 profile=any
if %errorLevel% neq 0 (
    echo WARNING: Failed to add localhost rule (may not be critical)
)
echo OK: Localhost rule added
echo.

REM Test connectivity
echo Testing server connectivity...
curl -s http://localhost:3001/health >nul 2>&1
if %errorLevel% equ 0 (
    echo OK: Server is accessible on localhost
) else (
    echo WARNING: Server not responding on localhost
    echo Make sure the server is running: npm run dev:server
)
echo.

echo ========================================
echo Firewall configuration complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart your Android emulator
echo 2. Clear the mobile app cache
echo 3. Test the socket connection
echo.
echo The mobile app should now connect successfully.
echo.

pause
