# PowerShell script to recreate symbolic links for relocated node_modules
$destBase = "C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\NODE_MODULES"

$links = @(
    @("c:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\node_modules", "root"),
    @("c:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\mobile-app\node_modules", "mobile_app"),
    @("c:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\mobile-app\dist\assets\node_modules", "mobile_app_dist"),
    @("c:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\server\node_modules", "server")
)

foreach ($link in $links) {
    $linkPath = $link[0]
    $destDir = Join-Path $destBase $link[1]
    $targetDir = Join-Path $destDir "node_modules"
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    if (Test-Path $linkPath) {
        $item = Get-Item $linkPath
        if ($item.Attributes -match "ReparsePoint") {
            Write-Host "Removing existing junction: $linkPath"
            Remove-Item $linkPath -Force
        } else {
            Write-Host "Moving real directory $linkPath to $targetDir"
            if (Test-Path $targetDir) {
                Write-Host "Destination $targetDir already exists. Merging content..."
                Move-Item -Path "$linkPath\*" -Destination $targetDir -Force -ErrorAction SilentlyContinue
                Remove-Item $linkPath -Recurse -Force
            } else {
                Move-Item -Path $linkPath -Destination $destDir -Force
            }
        }
    }

    if (-not (Test-Path $linkPath)) {
        Write-Host "Creating junction: $linkPath -> $targetDir"
        New-Item -ItemType Junction -Path $linkPath -Value $targetDir | Out-Null
    }
}

Write-Host "`nAll node_modules have been moved to $destBase and linked back."
Write-Host "The folders still appear in your project but the ACTUAL files are in the central location."
