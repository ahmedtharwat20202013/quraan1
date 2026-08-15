$projectPath = $PSScriptRoot
Set-Location $projectPath

$lastCommit = ""

Write-Host "Auto Git Push is running..."
Write-Host "Watching: $projectPath"
Write-Host "Press Ctrl+C to stop."

while ($true) {

    $status = git status --porcelain

    if ($status) {

        Start-Sleep -Seconds 10

        $newStatus = git status --porcelain

        if ($newStatus) {

            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

            git add .

            git commit -m "Auto update $timestamp"

            git push origin main

            Write-Host "[$timestamp] Changes pushed successfully." -ForegroundColor Green
        }
    }

    Start-Sleep -Seconds 3
}