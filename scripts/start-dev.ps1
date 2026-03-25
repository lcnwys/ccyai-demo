$ErrorActionPreference = "Stop"

$root = "D:\codex-program\chuangciyuan"
$pwsh = "C:\Program Files\PowerShell\7\pwsh.exe"

$envBlock = @'
$env:DATABASE_URL="mysql://chcy:chcy123@127.0.0.1:3306/chcyai"
$env:REDIS_URL="redis://127.0.0.1:6379"
$env:REDIS_HOST="127.0.0.1"
$env:REDIS_PORT="6379"
$env:CHCY_API_BASE_URL="https://api.chcyai.com"
$env:CHCY_ACCESS_KEY="AK_N8I_4F8Wv1mXSxT3I9HuRi7s"
$env:CHCY_SECRET_KEY="SK_URoB9EEy7caYrbI-uCayGzrt3cycTUgmpFLhHBAtxno"
$env:CHCY_CALLBACK_BASE_URL="http://localhost:3001"
$env:ALI_OSS_REGION="oss-cn-hangzhou"
$env:ALI_OSS_BUCKET="replace_me"
$env:ALI_OSS_ACCESS_KEY_ID="replace_me"
$env:ALI_OSS_ACCESS_KEY_SECRET="replace_me"
$env:PORT="3001"
'@

Write-Host ""
Write-Host "Starting CHCY dev stack..." -ForegroundColor Cyan
Write-Host "Workspace: $root"
Write-Host "Web:    http://localhost:3000"
Write-Host "API:    http://localhost:3001/api/health"
Write-Host ""

$apiCommand = @"
Set-Location '$root'
$envBlock
npm.cmd run dev:api
"@

$webCommand = @"
Set-Location '$root'
npm.cmd run dev:web
"@

$workerCommand = @"
Set-Location '$root'
$envBlock
npm.cmd run dev:worker
"@

Start-Process $pwsh -WorkingDirectory $root -ArgumentList @(
  "-NoLogo",
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-NoExit",
  "-Command", $apiCommand
)

Start-Process $pwsh -WorkingDirectory $root -ArgumentList @(
  "-NoLogo",
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-NoExit",
  "-Command", $webCommand
)

Start-Process $pwsh -WorkingDirectory $root -ArgumentList @(
  "-NoLogo",
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-NoExit",
  "-Command", $workerCommand
)

Write-Host "Launched 3 pwsh windows for api/web/worker." -ForegroundColor Green
Write-Host "This version avoids loading your PowerShell profile and conda auto-activation." -ForegroundColor Yellow
