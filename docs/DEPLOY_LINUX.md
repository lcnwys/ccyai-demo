# Linux 服务器一键部署

这份文档按“Docker Compose 一键部署”为主线，PM2 为备用方案。

## 1. 服务器准备

推荐环境：

- Ubuntu 22.04 / Debian 12
- 2 核 CPU 起步
- 4GB 内存起步
- 20GB 可用磁盘
- 已开放端口：`80`、`443`、`3000`、`3001`（如果先不接 Nginx，至少开放 `3000`）

安装基础组件：

```bash
sudo apt update
sudo apt install -y git curl ca-certificates gnupg lsb-release
```

安装 Docker：

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

确认：

```bash
docker --version
docker compose version
```

## 2. 拉代码

```bash
git clone https://github.com/lcnwys/ccyai-demo.git
cd ccyai-demo
git checkout codex/chcy-workbench
```

## 3. 准备部署环境变量

复制模板：

```bash
cp .env.deploy.example .env.deploy
```

至少要改这些：

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `NEXT_PUBLIC_API_BASE_URL`
- `CHCY_CALLBACK_BASE_URL`
- `APP_SESSION_SECRET`

如果你希望容器启动后就带默认平台配置，也可以补：

- `CHCY_API_BASE_URL`
- `CHCY_ACCESS_KEY`
- `CHCY_SECRET_KEY`
- `ALI_OSS_REGION`
- `ALI_OSS_BUCKET`
- `ALI_OSS_ACCESS_KEY_ID`
- `ALI_OSS_ACCESS_KEY_SECRET`

注意：

- 创次元现在推荐每个销售在“个人设置”里维护自己的 AK/SK。
- `.env.deploy` 里的 `CHCY_ACCESS_KEY / CHCY_SECRET_KEY` 更适合做管理员回退配置，不建议当作所有人的统一账号。

示例：

```env
MYSQL_ROOT_PASSWORD=change_me_root
MYSQL_DATABASE=chcyai
MYSQL_USER=chcy
MYSQL_PASSWORD=change_me_app
MYSQL_PORT=3306
REDIS_PORT=6379
API_PORT=3001
WEB_PORT=3000
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com/api
APP_SESSION_SECRET=replace_with_long_random_string
CHCY_API_BASE_URL=https://api.chcyai.com
CHCY_ACCESS_KEY=
CHCY_SECRET_KEY=
CHCY_CALLBACK_BASE_URL=https://your-domain.com
ALI_OSS_REGION=oss-cn-hangzhou
ALI_OSS_BUCKET=your-bucket
ALI_OSS_ACCESS_KEY_ID=
ALI_OSS_ACCESS_KEY_SECRET=
```

## 4. 一键部署

项目已经带好脚本，直接执行：

```bash
bash scripts/deploy.sh
```

它会做：

- 读取 `.env.deploy`
- 执行 `docker compose -f docker-compose.deploy.yml up -d --build`
- 拉起：`mysql`、`redis`、`api`、`worker`、`web`

查看状态：

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.deploy ps
```

查看日志：

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.deploy logs -f api
docker compose -f docker-compose.deploy.yml --env-file .env.deploy logs -f worker
docker compose -f docker-compose.deploy.yml --env-file .env.deploy logs -f web
```

停止服务：

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.deploy down
```

更新代码后重建：

```bash
git pull
docker compose -f docker-compose.deploy.yml --env-file .env.deploy up -d --build
```

## 5. 首次上线后操作

如果你还没接 Nginx，可以先直接访问：

- `http://服务器IP:3000`

登录后建议马上做：

1. 用管理员账号登录。
2. 打开“系统设置”，填写：
   - 平台会话密钥
   - OSS 配置
   - 必要时填写全局创次元回退配置
3. 打开“个人设置”，给每个销售填写自己的创次元 `AccessKey / SecretKey`。
4. 如果你刚改过系统设置里的 OSS 或全局回退配置，重启 `worker`：

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.deploy restart worker
```

## 6. Nginx 反向代理

推荐用域名把 `web` 和 `api` 统一到一个域名下：

- 前端：`https://your-domain.com`
- API：`https://your-domain.com/api`

项目已提供 Nginx 配置样板：

- `deploy/nginx/chcyai.conf`

部署步骤：

```bash
sudo apt install -y nginx
sudo cp deploy/nginx/chcyai.conf /etc/nginx/sites-available/chcyai.conf
sudo ln -sf /etc/nginx/sites-available/chcyai.conf /etc/nginx/sites-enabled/chcyai.conf
sudo nginx -t
sudo systemctl reload nginx
```

如果要配 HTTPS，推荐：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 7. PM2 备用方案

如果你不想用 Docker，也可以直接：

- MySQL、Redis 继续独立安装/托管
- API / Worker / Web 用 PM2 托管

项目已提供样板：

- `deploy/pm2/ecosystem.config.cjs`

注意：PM2 方案下你需要自己先完成：

```bash
npm install
cd apps/api && npx prisma db push && cd ../..
npm run build -w @chcy/api
npm run build -w @chcy/worker
npm run build -w @chcy/web
```

然后：

```bash
pm2 start deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

说明：

- Docker 方案更适合现在这套项目，一致性更高。
- PM2 方案更适合你已经有自己的 MySQL / Redis / Nginx 体系，不想容器化的时候。

## 8. 数据与备份

Docker Compose 默认卷：

- `mysql_data`
- `redis_data`
- `app_storage`

查看卷：

```bash
docker volume ls
```

备份 MySQL：

```bash
docker exec -i chuangciyuan-mysql-1 mysqldump -uroot -p$MYSQL_ROOT_PASSWORD chcyai > backup.sql
```

如果容器名不同，先执行 `docker ps` 看实际名称。

## 9. 常见问题

### 9.1 本地 callback 打不到

本地开发用 `127.0.0.1` 时，创次元无法直接回调，所以详情页里需要用“一键查询结果”或“手动查询结果”。

### 9.2 上传/导出没结果

先看：

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.deploy logs -f worker
```

重点确认：

- OSS 配置是否正确
- 用户个人创次元密钥是否已填写
- 任务是否已经拿到 provider taskId

### 9.3 看不到历史任务

现在任务中心按当前登录用户隔离显示。
如果是老数据，请确认 `batch_jobs.createdBy` 是否已经归属到当前用户 id。

## 10. 推荐上线架构

- `Nginx`：对外统一入口、HTTPS、反向代理
- `web`：Next.js 前端
- `api`：NestJS API
- `worker`：异步任务与查询
- `mysql`：业务数据库
- `redis`：队列
- `oss`：文件存储

对你现在这个内部销售测试场景，最务实的方案就是：

- Docker Compose 一键部署
- Nginx 反代
- 管理员维护平台级配置
- 每个销售在个人设置里维护自己的创次元密钥
