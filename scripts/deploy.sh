#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.deploy"
COMPOSE_FILE="$ROOT_DIR/docker-compose.deploy.yml"

if [ ! -f "$ENV_FILE" ]; then
  cp "$ROOT_DIR/.env.deploy.example" "$ENV_FILE"
  echo "已创建 $ENV_FILE，请先按服务器实际地址和密钥填写后再重新执行。"
  exit 1
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
