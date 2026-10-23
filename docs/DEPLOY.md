# 部署（生产环境）

**一句话**：镜像在开发机上构建、打包成一个 tar.gz 传上去，服务器只 `docker load` 和 `docker compose up`，不装 node、不跑 `next build`。

## 为什么不在服务器上构建

生产机是 4 核 / 3.8G，上面还跑着其他业务容器。在它上面跑 `npm ci` + `next build` 会吃掉 1.5–2G 内存和几分钟 CPU，属于拿生产环境的稳定性换部署方便。构建产物是确定性的，在哪台机器上算结果都一样，没有理由每次都在服务器上重算。

## 服务器上的目录长什么样

只有四样东西，源码不在服务器上：

```
/opt/multi-document/
├── docker-compose.yml        # 编排（从仓库同步过来）
├── .env                      # 密钥与开关，600，不进 git
├── data/
│   ├── mysql/                # 数据库文件（bind mount）
│   └── uploads/              # 上传的图片和附件
└── images/                   # 传上来的镜像包（load 完可以删）
```

用 bind mount 而不是命名卷，是为了让「备份」就是「拷一个目录」，而不是记住一串 `docker run --rm -v` 的咒语。

## 首次部署

前提：服务器装了 Docker 与 Compose V2，开发机能 `ssh` 到服务器（建议配好 `~/.ssh/config` 别名）。

```bash
# 开发机上，仓库根目录
bash scripts/deploy-remote.sh
```

它依次做五件事：构建 `app` / `tools` 两个镜像 → 建目录、首次生成随机 `.env` → 上传 compose 与镜像包 → `docker load` + `up -d` → 请求 `/admin/login` 自检。默认部署到 `jinrui` 别名下的 `/opt/multi-document`，可用环境变量改：

```bash
DEPLOY_HOST=root@1.2.3.4 DEPLOY_DIR=/opt/other bash scripts/deploy-remote.sh
```

首次启动后数据库是空的，`init` 服务会跑迁移并灌入演示数据（`SEED_DEMO=true` 时）。默认后台账号 `admin / admin123`，**上线前请改掉**。

## 日常更新

改完代码，同一条命令：

```bash
bash scripts/deploy-remote.sh
```

镜像 tag 自动取 git 短 sha（工作区不干净时加 `-dirty` 后缀），所以「线上跑的是哪一版」永远能对上 commit。回滚 = 把 `.env` 里的 `IMAGE_TAG` 改成旧 tag 再 `up -d`（前提是旧镜像还在服务器上）。

只改了 `.env`（比如换密钥）不需要重新构建，直接：

```bash
ssh jinrui 'cd /opt/multi-document && docker compose up -d'
```

## 备份与恢复

数据全在 `data/` 下，备份就是拷目录：

```bash
# 备份（建议先停写，或至少用 mysqldump 保证一致性）
ssh jinrui 'cd /opt/multi-document && tar czf /root/md-data-$(date +%F).tgz data/'

# 逻辑备份（更稳，可在运行中执行）
ssh jinrui 'docker exec multi-document-db sh -c "exec mysqldump -uroot -p\"\$MYSQL_ROOT_PASSWORD\" --single-transaction --databases multi_document" > /root/md-$(date +%F).sql'
```

恢复：停容器 → 把 `data/` 换回旧内容（或起空库后 `mysql < dump.sql`）→ `up -d`。

`.env` 里的 `MYSQL_PASSWORD` 只在**首次初始化** `data/mysql` 时生效。数据库已经建好后再改它，连不上；要改密码得进数据库改。

## 常用命令

```bash
cd /opt/multi-document

docker compose ps                      # 状态（db healthy / init exited 0 / app healthy）
docker compose logs -f app             # 应用日志
docker compose logs --tail=50 init     # 迁移与种子日志
docker compose up -d                   # 启动
docker compose down                    # 停止（数据保留）
docker compose exec db mysql -uroot -p multi_document   # 进数据库
docker images | grep multi-document    # 现有镜像与 tag
```

## 排障（按现象查）

| 现象 | 原因与处理 |
| --- | --- |
| `up -d` 报 `pull access denied` / `not found` | 镜像是本地 load 的，没有仓库。先 `docker load`，或确认 `IMAGE_TAG` 与已 load 的 tag 一致 |
| 登录成功但页面不跳转 | 纯 HTTP 下 Cookie 带 `Secure` 会被浏览器丢弃。确认 `.env` 里 `COOKIE_SECURE=false` |
| 首次部署/重启后建表偶发 P1001 | db 的 healthcheck 必须走 TCP（`--protocol=TCP -h 127.0.0.1`）。走 socket 时 MySQL 初始化阶段的临时实例会假报健康，init 抢跑。当前 compose 已修正 |
| `app` 一直 unhealthy | healthcheck 打的是端口而非业务路由（首页对未登录用户返回 404，打 `/` 会恒判不健康）。若端口都不通，看 `logs app` |
| 改完文档/代码线上没变 | 浏览器缓存或镜像没换 tag。确认 `docker images` 里的 tag 与本次部署 tag 一致，`docker compose ps` 显示的镜像正确 |
| 8080 被占用 | 服务器上别的项目占了端口。`ss -lntp \| grep 8080` 查，再改 compose 的 `ports` 左侧 |

## 验证清单（交付前过一遍）

- [ ] `docker compose ps`：db healthy、init exited(0)、app healthy
- [ ] 登录页 200，能登录并跳转
- [ ] 建项目 → 建产品 → 建文档 → 发布，全流程走通
- [ ] 上传一张图片，`docker compose restart app` 后仍能打开
- [ ] `docker compose down && docker compose up -d` 后数据还在
- [ ] 服务器上其他项目的容器状态未变
