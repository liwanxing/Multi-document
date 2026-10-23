# 本地开发

## 环境要求

- Node.js 24（已在 24.20.0 验证）与 npm
- Docker Desktop（只用来跑 MySQL，应用本身在宿主机跑，享受热更新）

## 一键启动

```bash
bash scripts/dev-start.sh
```

依次做：检查 Docker → 启动数据库容器 → 等数据库就绪 → `npm run dev`。看到 `Ready` 后访问 http://localhost:4000 ，首次编译约 1 分钟，之后改代码秒级热更新。

## 手动启动

```bash
# 1. 数据库（Docker Desktop 必须已启动）
docker compose -f docker-compose.dev.yml up -d

# 2. 开发服务器
npm run dev
```

首次还需 `npm ci`。

## 关键信息

| 项 | 值 |
| --- | --- |
| 前台 | http://localhost:4000 |
| 后台 | http://localhost:4000/admin/login（admin / admin123） |
| 数据库 | 127.0.0.1:**3307**，root / multidoc123，库名 multi_document |
| 数据 | 在 Docker 卷 `multi-doc-mysql-data` 里，删容器不丢；`down -v` 会清空 |

开发环境与生产环境用的是两份独立配置：`docker-compose.dev.yml`（只有 MySQL）和 `docker-compose.yml`（db + init + app 完整生产编排）。两者都监听宿主机 4000，不能同时起应用。

## 测试

```bash
npm run typecheck          # 类型检查
npm run build              # 生产构建
npm run test:components    # 组件测试（纯函数，不需要服务）
npm run test:icons
npm run test:codewrap
npm run test:htmltabs
```

集成测试需要先起服务，且会创建并清理临时项目：

```bash
TEST_BASE_URL=http://localhost:4000 npm run test:integration
TEST_BASE_URL=http://localhost:4000 npm run test:media
TEST_BASE_URL=http://localhost:4000 npm run test:reorder
TEST_BASE_URL=http://localhost:4000 npm run test:groups
TEST_BASE_URL=http://localhost:4000 npm run test:expansion
```

## 演示数据

- 把当前库的内容固化成种子：`npm run seed:export`（写入 `seed/demo-seed.json`，可提交）
- 把种子灌进本地库：`npm run seed:run`
- 生产环境由 `init` 服务在 `SEED_DEMO=true` 时自动灌入，`projects` 表非空则跳过

## 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 页面 500/502，日志报 `pool failed to retrieve a connection` | Docker Desktop 没启动。启动它，再跑脚本 |
| `Missing script: "dev"` | 不在项目根目录 |
| 启动时报 safe-delete 错误 | 启动命令要带那几个 `env -u` 前缀（`scripts/dev-start.sh` 已内置） |
| 启动很慢 | 首次编译 + 清旧缓存，等 1–2 分钟，不要频繁重启 |
| 想彻底重来 | `docker compose -f docker-compose.dev.yml down -v` 会**删光数据** |
| 想验证生产镜像 | `bash scripts/build-image.sh` 本地构建，或直接 `docker compose up -d`（需先 load 镜像） |
