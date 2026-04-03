$frontend = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "$PSScriptRoot\..\frontend" -PassThru
$backend = Start-Process -FilePath "go" -ArgumentList "run", "./cmd/api" -WorkingDirectory "$PSScriptRoot\..\backend" -PassThru

Write-Host "Frontend PID: $($frontend.Id)"
Write-Host "Backend PID: $($backend.Id)"
Write-Host "Use Stop-Process -Id <pid> to stop either process."

