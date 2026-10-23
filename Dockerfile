# Multi-document 生产镜像（Next.js 14 standalone + Prisma 7，无 Rust 引擎）
#
# 两个会打 tag 的目标：
#   runner → multi-document-app     运行时镜像（默认 target）
#   tools  → multi-document-tools   迁移/种子镜像（只跑一次性任务，跑完退出）
#
# 构建在生产机上做（见 scripts/build-image.sh），服务器只 docker load 不编译。
#
# 说明：
# - Prisma 7 的 client 生成到 src/generated/prisma（相对路径 import），
#   standalone 的 nft 追踪可稳定携带，无需额外复制 node_modules/.prisma
# - tools 阶段刻意不装项目全量依赖：prisma migrate + seed 只需要
#   prisma CLI / adapter / dotenv / mysql2，全量 npm ci 会得到 1.6GB 的镜像，
#   而这里只有前者的零头
# - migrate 不进 runner：prisma CLI 属 devDependencies，塞进生产镜像只会让
#   每次拉取多几十 MB，而它一生只跑几秒

ARG NODE_IMAGE=node:22-alpine

# ── 阶段 1：依赖安装（全量，含 devDependencies，供 builder）──
# 国内构建慢时切淘宝源：
#   docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com ...
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org
# 仅当依赖清单变化时才重新安装（层缓存友好）；清缓存控制镜像体积
COPY package.json package-lock.json ./
RUN npm config set registry "$NPM_REGISTRY" && npm ci && npm cache clean --force
COPY prisma ./prisma
COPY prisma.config.ts ./

# ── 阶段 2：构建（生成 Prisma client + Next standalone 产物）──
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma.config.ts 的 env("DATABASE_URL") 在加载配置时就要求存在；
# generate 只读 schema 不连库，给占位值即可（migrate 由 init 服务用真实连接串执行）
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="mysql://build:placeholder@127.0.0.1:3306/build"
# 先产出 src/generated/prisma，再打包（standalone 通过 import 追踪携带它）
RUN npx prisma generate && npm run build

# ── 阶段 3：生产运行（standalone 自包含产物，非 root 用户，无 npm ci）──
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4000 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 非 root 运行；上传目录挂卷点预先建好属主
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs \
    && mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app/data
USER nextjs

EXPOSE 4000
# standalone 产物自带 server.js；CMD 直接启动（compose 负责先等 init 完成）
CMD ["node", "server.js"]

# ── 阶段 4：迁移与种子工具（精简依赖）──
# 只装 migrate/seed 真正 import 的包，而不是整棵 node_modules 树：
#   prisma CLI            migrate deploy
#   @prisma/adapter-mariadb  prisma.config.ts 的 datasource 适配器
#   dotenv                prisma.config.ts 与 seed 脚本读环境变量
#   mysql2                seed 脚本写库
#   tsx                   Prisma 7 加载 prisma.config.ts（TS）需要
FROM ${NODE_IMAGE} AS tools
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org
ARG PRISMA_VERSION=7.10.1
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY scripts/seed-demo.mjs ./scripts/seed-demo.mjs
COPY seed ./seed
RUN npm config set registry "$NPM_REGISTRY" \
 && npm init -y > /dev/null 2>&1 \
 && npm install --no-audit --no-fund --no-package-lock \
      "prisma@${PRISMA_VERSION}" \
      "@prisma/adapter-mariadb@^7.10.1" \
      "dotenv@^18.0.8" \
      "mysql2@^3.24.6" \
      "tsx@^4.23.15" \
 && npm cache clean --force \
 && rm -rf /root/.npm /tmp/*

# compose 会用 command 覆盖；单独跑时默认只做迁移
CMD ["npx", "prisma", "migrate", "deploy"]
