FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json .
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
# ✨ 核心步骤：先编共享包，再编 Worker
RUN npm run build -w @chcy/shared
RUN npm run build -w @chcy/worker

FROM node:22-alpine
WORKDIR /app
# 🚀 关键修正：必须把共享包的编译产物也拷过来！
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# 保持原有拷贝
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/main.js"]
