# Firewall Diagnostic and Configuration Script for Cospira Server
# Checks if port 3001 is blocked and optionally adds firewall exception

Write-Host "=== Cospira Server Firewall Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "   Some checks may be limited. Rerun as Admin for full diagnostics." -ForegroundColor Yellow
    Write-Host ""
}

# 1. Check if port 3001 is listening
Write-Host "1. Checking if port 3001 is listening..." -ForegroundColor Green
$listening = netstat -ano | Select-String ":3001.*LISTENING"
if ($listening) {
    Write-Host "   OK: Port 3001 is LISTENING" -ForegroundColor Green
    $listening | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
}
else {
    Write-Host "   ERROR: Port 3001 is NOT listening" -ForegroundColor Red
    Write-Host "      Start the server first: npm run dev:server" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 2. Test localhost connectivity
Write-Host "2. Testing localhost:3001 connectivity..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   OK: Localhost accessible (Status: $($response.StatusCode))" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR: Localhost NOT accessible" -ForegroundColor Red
    Write-Host "      $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

# 3. Get local IP address
Write-Host "3. Detecting local IP address..." -ForegroundColor Green
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress
if ($localIP) {
    Write-Host "   Local IP: $localIP" -ForegroundColor Cyan
}
else {
    Write-Host "   WARNING: Could not detect local IP" -ForegroundColor Yellow
    $localIP = "192.168.1.9"
    Write-Host "   Using default: $localIP" -ForegroundColor Yellow
}
Write-Host ""

# 4. Test network IP connectivity
Write-Host "4. Testing $localIP`:3001 connectivity..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "http://$localIP`:3001/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   OK: Network IP accessible (Status: $($response.StatusCode))" -ForegroundColor Green
    Write-Host ""
    Write-Host "SUCCESS: No firewall issues detected! Server is accessible." -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "   ERROR: Network IP NOT accessible" -ForegroundColor Red
    Write-Host "      $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

# 5. Check firewall rules
Write-Host "5. Checking Windows Firewall rules for port 3001..." -ForegroundColor Green
if ($isAdmin) {
    $existingRule = Get-NetFirewallRule -DisplayName "Cospira Server*" -ErrorAction SilentlyContinue
    if ($existingRule) {
        Write-Host "   INFO: Existing firewall rule found:" -ForegroundColor Cyan
        $existingRule | ForEach-Object { 
            $status = if ($_.Enabled -eq 'True') { 'Enabled' } else { 'Disabled' }
            Write-Host "      - $($_.DisplayName) [$status]" -ForegroundColor Gray 
        }
    }
    else {
        Write-Host "   WARNING: No firewall rule found for Cospira Server" -ForegroundColor Yellow
    }
}
else {
    Write-Host "   WARNING: Cannot check firewall rules (requires Admin)" -ForegroundColor Yellow
}
Write-Host ""

# 6. Offer to add firewall rule
Write-Host "=== Recommended Action ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "The server is running but not accessible from network IP." -ForegroundColor Yellow
Write-Host "This is likely due to Windows Firewall blocking port 3001." -ForegroundColor Yellow
Write-Host ""

if ($isAdmin) {
    $response = Read-Host "Would you like to add a firewall exception for port 3001? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host ""
        Write-Host "Adding firewall rules..." -ForegroundColor Green
        
        # Add inbound rule
        New-NetFirewallRule -DisplayName "Cospira Server (TCP-In)" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
        
        # Add outbound rule
        New-NetFirewallRule -DisplayName "Cospira Server (TCP-Out)" -Direction Outbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
        
        Write-Host "OK: Firewall rules added successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Testing connectivity again..." -ForegroundColor Cyan
        Start-Sleep -Seconds 2
        
        try {
            $testResponse = Invoke-WebRequest -Uri "http://$localIP`:3001/health" -TimeoutSec 3 -ErrorAction Stop
            Write-Host "SUCCESS! Server is now accessible at http://$localIP`:3001" -ForegroundColor Green
            Write-Host ""
            Write-Host "You can now test the mobile app connection." -ForegroundColor Cyan
        }
        catch {
            Write-Host "WARNING: Still not accessible. Additional troubleshooting needed." -ForegroundColor Yellow
            Write-Host "   Try restarting the server or checking antivirus software." -ForegroundColor Gray
        }
    }
    else {
        Write-Host ""
        Write-Host "Firewall rule not added. To add manually:" -ForegroundColor Yellow
        Write-Host "1. Open Windows Defender Firewall" -ForegroundColor Gray
        Write-Host "2. Click Advanced settings" -ForegroundColor Gray
        Write-Host "3. Add Inbound Rule for TCP port 3001" -ForegroundColor Gray
    }
}
else {
    Write-Host "To add firewall exception, rerun this script as Administrator:" -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell -> Run as Administrator" -ForegroundColor Gray
    Write-Host "   Then run: .\firewall-check.ps1" -ForegroundColor Gray
}

Write-Host ""
