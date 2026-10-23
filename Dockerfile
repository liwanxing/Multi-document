# Multi-document 生产镜像（Next.js 14 standalone + Prisma 7，无 Rust 引擎）
#
# 构建：docker compose build          （默认 target: runner）
# 迁移：compose 里 migrate 服务使用 target: deps 执行 prisma migrate deploy
#
# 说明：
# - Prisma 7 的 client 生成到 src/generated/prisma（相对路径 import），
#   standalone 的 nft 追踪可稳定携带，无需额外复制 node_modules/.prisma
# - migrate 不放进 runner：prisma CLI 属 devDependencies，
#   由 compose 的 migrate 服务（target: deps，全量依赖）一次性执行

# ── 阶段 1：依赖安装（全量，含 devDependencies，供 builder 与 migrate 复用）──
FROM node:22-alpine AS deps
WORKDIR /app
# 仅当依赖清单变化时才重新安装（层缓存友好）；清缓存控制镜像体积
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
# Prisma 配置与迁移文件（migrate deploy 需要；npm ci 本身不需要故放其后）
COPY prisma ./prisma
COPY prisma.config.ts ./
# 演示数据种子（compose 的 seed 服务在 SEED_DEMO=true 时执行 scripts/seed-demo.mjs）
COPY scripts ./scripts
COPY seed ./seed

# ── 阶段 2：构建（生成 Prisma client + Next standalone 产物）──
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma.config.ts 的 env("DATABASE_URL") 在加载配置时就要求存在；
# generate 只读 schema 不连库，给占位值即可（migrate 由 compose 用真实连接串执行）
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="mysql://build:placeholder@127.0.0.1:3306/build"
# 先产出 src/generated/prisma，再打包（standalone 通过 import 追踪携带它）
RUN npx prisma generate && npm run build

# ── 阶段 3：生产运行（standalone 自包含产物，非 root 用户，无 npm ci）──
# standalone 由 Next 的 nft 追踪生成：server.js + 最小 node_modules + 相对路径源码
# （含 src/generated/prisma 的 Prisma client），自足运行，无需完整 node_modules
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4000 \
    HOSTNAME=0.0.0.0

# standalone 产物：server.js + 运行所需最小 node_modules + 构建源码追踪结果
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 非 root 运行；上传目录挂卷点预先建好属主
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs \
    && mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app/data
USER nextjs

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 || exit 1

# standalone 产物自带 server.js；CMD 直接启动（compose 负责先等迁移完成）
CMD ["node", "server.js"]
