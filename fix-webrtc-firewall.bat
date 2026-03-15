@echo off
REM Add Windows Firewall rules for Cospira Server and Mediasoup
REM This allows WebRTC traffic and Virtual Browser streaming

echo ========================================
echo Cospira Server - Full Firewall Config
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

REM Remove existing rules
echo Removing existing firewall rules...
netsh advfirewall firewall delete rule name="Cospira Server (3001)" >nul 2>&1
netsh advfirewall firewall delete rule name="Cospira Mediasoup (UDP)" >nul 2>&1
echo.

REM Add inbound rule for port 3001 (Signaling)
echo Adding inbound rule for port 3001 (TCP)...
netsh advfirewall firewall add rule name="Cospira Server (3001)" dir=in action=allow protocol=TCP localport=3001 profile=any
echo OK: Port 3001 rule added.

REM Add inbound rule for Mediasoup ports (WebRTC / RTP)
echo Adding inbound rule for Mediasoup ports (40000-40100 UDP)...
netsh advfirewall firewall add rule name="Cospira Mediasoup (UDP)" dir=in action=allow protocol=UDP localport=40000-40100 profile=any
echo OK: Mediasoup UDP rules added.

REM Add outbound rules (usually not needed but good for completeness)
netsh advfirewall firewall add rule name="Cospira Server (3001-Out)" dir=out action=allow protocol=TCP localport=3001 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Cospira Mediasoup (UDP-Out)" dir=out action=allow protocol=UDP localport=40000-40100 profile=any >nul 2>&1

echo.
echo ========================================
echo Firewall configuration complete!
echo ========================================
echo.
echo Please restart your server and try the virtual browser again.
echo.
pause
