# Docker 部署说明

> 生产环境一键部署。开发环境（仅数据库容器）仍用 `docker-compose.dev.yml`，两者互不影响。

## 一键启动

```bash
cd /d/MyCode/Multi-document
docker compose up -d --build     # 首次：构建镜像并启动（约 5-10 分钟）
docker compose up -d             # 日常：直接启动（migrate 自动追平新迁移）
```

启动后访问：

| 入口 | 地址 | 账号 |
|---|---|---|
| 前台 | http://localhost:4000 | — |
| 后台 | http://localhost:4000/admin | admin / admin123 |

## 架构

```
docker-compose.yml
├── db       MySQL 8（卷 mysql-data 持久化，不暴露宿主机端口）
├── migrate  一次性任务：prisma migrate deploy（跑完退出，app 等它成功才启动）
└── app      Next.js 14 standalone（node server.js，卷 uploads-data 持久化上传文件）
```

构建链路（多阶段 Dockerfile）：

```
deps    全量依赖（含 prisma CLI）──→ migrate 服务用它执行迁移
  └→ builder  prisma generate + next build（standalone 产物）
       └→ runner  仅生产依赖 + standalone 产物，非 root 用户运行
```

## 首启自动完成的事

1. **建表**：migrate 服务自动执行全部迁移（空库约 30 秒）
2. **初始账号**：首次请求时自动写入默认角色与账号（admin/admin123、operator/operator123）——无需手工 seed
3. **上传目录**：`/app/data/uploads` 已挂载卷，容器重建不丢文件

## 常用命令

```bash
docker compose logs -f app       # 应用日志
docker compose ps                # 各服务状态
docker compose down              # 停止（数据保留在卷里）
docker compose down -v           # 停止并清空全部数据（慎用）

# 数据库维护（db 不映射宿主机端口，走 exec 进容器）
docker compose exec db mysql -uroot -pmultidoc123 multi_document
```

## 配置项（可选 .env 覆盖）

在 `docker-compose.yml` 同目录建 `.env`：

```bash
MYSQL_PASSWORD=你的数据库密码
MYSQL_DATABASE=multi_document
ADMIN_AUTH_SECRET=生产环境请改成随机长字符串   # 会话签名密钥
```

不改也有默认值（见 compose 文件 `${VAR:-default}`），内部使用可不改。

## 与开发环境的关系

| | 开发 | 生产（本文件） |
|---|---|---|
| compose 文件 | `docker-compose.dev.yml` | `docker-compose.yml` |
| MySQL 容器 | multi-doc-mysql（宿主 3307） | multi-document-db-1（仅容器网络） |
| 应用 | 宿主 `npm run dev`（热更新） | 容器内 standalone（`node server.js`） |
| 数据卷 | multi-doc-mysql-data | multi-document_mysql-data |

**注意**：两个应用都监听宿主 4000，同时只能起一个。

## 验证清单（交付前过一遍）

- [ ] `docker compose up -d` 后三个服务顺序就绪（db healthy → migrate exited 0 → app running）
- [ ] 前台首页 200，后台能登录
- [ ] 建项目 → 建产品 → 建文档 → 发布，全流程走通
- [ ] 上传一张图片，重启容器后仍可取（`/api/media/<文件名>`）
- [ ] `docker compose down && docker compose up -d` 后数据还在
