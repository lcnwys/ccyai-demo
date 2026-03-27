#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.pm2"
ECOSYSTEM_FILE="$ROOT_DIR/deploy/pm2/ecosystem.config.cjs"

if [ ! -f "$ENV_FILE" ]; then
  cp "$ROOT_DIR/.env.pm2.example" "$ENV_FILE"
  echo "已创建 $ENV_FILE，请先按服务器实际配置填写后再重新执行。"
  exit 1
fi

cd "$ROOT_DIR"

mkdir -p storage

npm install
npm run db:generate
(cd apps/api && npx prisma db push --schema prisma/schema.prisma)
npm run build:shared
npm run build:api
npm run build:web
npm run build:worker

pm2 startOrReload "$ECOSYSTEM_FILE" --update-env
pm2 save

echo "PM2 部署完成，当前进程状态如下："
pm2 status
