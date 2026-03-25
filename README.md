# 创次元内部工作台

这是一个给内部销售和小范围客户体验用的单页工作台，核心能力是：

- 印花提取
- AI 生图
- 图裂变
- 批量任务管理
- 结果下载与印刷图导出
- 创次元回调、轮询、手动查询补偿
- 阿里云 OSS 或本地回退存储

## 技术栈

- `Next.js`：前端工作台
- `NestJS`：API、登录、回调、系统设置
- `BullMQ`：任务队列与补偿轮询
- `MySQL`：业务数据
- `Redis`：队列
- `Prisma`：ORM
- `Aliyun OSS`：文件存储

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 启动 MySQL 和 Redis

```bash
docker compose up -d
```

3. 初始化数据库

```bash
cd apps/api
npx prisma db push
cd ../..
```

4. 分别启动

```bash
npm run dev:api
npm run dev:web
npm run dev:worker
```

打开：

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/health`

## 运行时设置

部署后，大部分业务配置都可以在前端 `系统设置` 页面修改，并写入 `storage/runtime-settings.json`：

- 内部登录账号和密码
- 创次元 `AccessKey / SecretKey / 回调地址`
- 阿里云 OSS `Region / Bucket / AK / SK`

这些配置仍然保留环境变量兜底。也就是说：

- 环境变量负责首次启动默认值
- 前端系统设置负责后续在线修改

说明：

- API 保存后立即生效
- Worker 读取的是共享的 `storage/runtime-settings.json`，重启 Worker 后会读取最新配置

## 一键部署

### 方式一：Linux 服务器

1. 复制部署环境变量模板

```bash
cp .env.deploy.example .env.deploy
```

2. 编辑 `.env.deploy`

至少需要改这些：

- `NEXT_PUBLIC_API_BASE_URL`
- `CHCY_CALLBACK_BASE_URL`
- `APP_SESSION_SECRET`
- MySQL 密码
- 如果你要直接上线联调，再填 `CHCY_*` 和 `ALI_OSS_*`

3. 一键启动

```bash
bash scripts/deploy.sh
```

### 方式二：Windows 服务器

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1
```

## Docker 部署说明

部署文件：

- `docker-compose.deploy.yml`
- `.env.deploy.example`
- `scripts/deploy.sh`
- `scripts/deploy.ps1`

启动后会拉起：

- `mysql`
- `redis`
- `api`
- `worker`
- `web`

默认端口：

- Web: `3000`
- API: `3001`
- MySQL: `3306`
- Redis: `6379`

## 上线后推荐步骤

1. 打开 `http://服务器IP:3000/login`
2. 用默认测试账号登录
3. 进入 `系统设置`
4. 填写创次元接口配置和 OSS 配置
5. 重启 `worker` 容器
6. 开始创建提取、生图、裂变任务

## 当前约束

- 本地开发环境下，创次元无法直接回调 `127.0.0.1`，所以需要依赖手动查询结果或公网回调地址
- 印刷图导出已支持 DPI 导出，裁剪区域 `selectedArea` 还没有接前端交互
