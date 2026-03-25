$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env.deploy"
$composeFile = Join-Path $root "docker-compose.deploy.yml"

if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $root ".env.deploy.example") $envFile
  Write-Host "已创建 $envFile，请先按服务器实际地址和密钥填写后再重新执行。"
  exit 1
}

docker compose -f $composeFile --env-file $envFile up -d --build
docker compose -f $composeFile --env-file $envFile ps
