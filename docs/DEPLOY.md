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

## 部署目标机（内网）

| 项 | 值 |
| --- | --- |
| 主机 | `172.16.50.69`（内网，需在公司网络 / VPN 内） |
| SSH 别名 | `jinrui`（`~/.ssh/config` 里已指向上面这台，部署脚本默认用它） |
| 部署目录 | `/opt/multi-document`（本项目独占） |
| 访问入口（内网） | `http://172.16.50.69:8080`（需先连公司 WireGuard VPN） |
| 访问入口（公网） | 运维在公网网关上做的端口映射，形如 `http://<公网IP>:8080`。**具体地址不写进本仓库**（公开仓库不暴露入口），存个人凭据笔记 |
| Docker | 已装（29.x + Compose V2） |

同一台机器上还跑着另一套业务（`/opt/jinrui_cloud`，容器名 `jinrui-*`，占用 6070–6073）。**本项目只用 8080**，不要动那几个容器，也不要改它们的网络和端口。

### 两个入口指向同一个容器，但内网反而更慢

| 入口 | 实际链路 | 首字节 TTFB |
| --- | --- | --- |
| 内网 `172.16.50.69:8080` | 本机 → WireGuard 隧道 → 公司网关 → 服务器 | **约 9.6 秒** |
| 公网映射 `:8080` | 本机 → 公网直达 → 服务器 | 约 0.03 秒 |

这 9.6 秒是**每条新建 TCP 连接付一次**的固定代价：`HEAD` 请求（响应只有一个包）也是 9.6 秒，跟响应大小无关；而同一条连接上的第二个请求只要 20 毫秒。所以既不是应用慢、也不是带宽或数据库——服务器本机 `curl 127.0.0.1:8080` 只要 17–24 毫秒，公网入口 30 毫秒，只有走隧道进来的新连接被拖住。

结论：**这不是项目的问题，不要为它改代码、加缓存、换框架。** 慢在「客户端到服务器」那段隧道路径上，归运维管。原理、实测数据、排查方法和临时自救办法见个人笔记《VPN 与内网访问》。

**在服务器上验收一律走 `127.0.0.1`**，完全不受这条链路影响：

```bash
ssh jinrui "curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/admin/login"
```

自己电脑上要频繁点页面又嫌内网慢，可以借已有 ssh 通道把 8080 拉到本地（浏览器访问 `127.0.0.1` 是本地连接，之后复用同一条 ssh，实测首字节 38 毫秒）：

```bash
ssh -N -L 8080:127.0.0.1:8080 jinrui   # 另开一个窗口保持不关，然后浏览器开 http://127.0.0.1:8080
```

首次部署后数据库是空的，`init` 服务会跑迁移并灌入演示数据（`SEED_DEMO=true` 时）。默认后台账号 `admin / admin123`，**上线前请改掉**。

## 日常更新

改完代码，同一条命令：

```bash
bash scripts/deploy-remote.sh
```

镜像 tag 自动取 git 短 sha（工作区不干净时加 `-dirty` 后缀），所以「线上跑的是哪一版」永远能对上 commit。回滚 = 把 `.env` 里的 `IMAGE_TAG` 改成旧 tag 再 `up -d`（前提是旧镜像还在服务器上）。

**注意 `.env` 里的 `IMAGE_TAG`**：`docker compose` 启动时会直接读它，而脚本第 4 步是用命令行环境变量临时覆盖的。如果不同步 `.env`，会出现「部署完是新的、服务器重启后又退回旧版本」。脚本现在每步部署都会把 `.env` 里的 `IMAGE_TAG` 钉到本次 tag（2026-10-26 修）。

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
| 部署完是新的，服务器重启后又变回旧版 | `.env` 里的 `IMAGE_TAG` 没同步（compose 默认读它）。改成当前 tag 后 `up -d` |
| `kex_exchange_identification: read: Connection timed out` / `Connection timed out` | 到 `172.16.50.69` 的内网链路抖动（VPN 重连、跨网段）。`Test-NetConnection 172.16.50.69 -Port 22` 通了就重试；脚本每一步都是幂等的，重跑不会弄坏数据 |
| 登录成功但页面不跳转 | 纯 HTTP 下 Cookie 带 `Secure` 会被浏览器丢弃。确认 `.env` 里 `COOKIE_SECURE=false` |
| 首次部署/重启后建表偶发 P1001 | db 的 healthcheck 必须走 TCP（`--protocol=TCP -h 127.0.0.1`）。走 socket 时 MySQL 初始化阶段的临时实例会假报健康，init 抢跑。当前 compose 已修正 |
| `app` 一直 unhealthy | healthcheck 打的是端口而非业务路由（首页对未登录用户返回 404，打 `/` 会恒判不健康）。若端口都不通，看 `logs app` |
| 改完文档/代码线上没变 | 浏览器缓存或镜像没换 tag。确认 `docker images` 里的 tag 与本次部署 tag 一致，`docker compose ps` 显示的镜像正确 |
| 8080 被占用 | 服务器上别的项目占了端口。`ss -lntp \| grep 8080` 查，再改 compose 的 `ports` 左侧 |
| 走内网地址时每个页面都卡约 10 秒，公网入口却很快 | VPN 隧道路径上对新建 TCP 连接的固定延迟，与本项目无关。换公网入口，或本地 `ssh -N -L 8080:127.0.0.1:8080 jinrui` 后开 `http://127.0.0.1:8080` |

## 验证清单（交付前过一遍）

- [ ] `docker compose ps`：db healthy、init exited(0)、app healthy
- [ ] 登录页 200，能登录并跳转
- [ ] 建项目 → 建产品 → 建文档 → 发布，全流程走通
- [ ] 上传一张图片，`docker compose restart app` 后仍能打开
- [ ] `docker compose down && docker compose up -d` 后数据还在
- [ ] 服务器上其他项目的容器状态未变

### 接口级自检（在服务器本机跑，走 127.0.0.1 不受隧道延迟影响）

页面能开不等于业务对。用下面这组请求能盖住「登录 → 建项目 → 产品分类排序 → 建文档发布 → 变量渲染」整条链路，跑完自己删干净：

```bash
# 登录拿会话
curl -s -c /tmp/c.txt -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:8080/api/admin/auth/login \
  -d '{"username":"admin","password":"admin123"}'

# 建项目（记下返回的 data.id 当作 PID）
curl -s -b /tmp/c.txt -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:8080/api/admin/projects \
  -d '{"name":"QA","slug":"qa-check-1","company":"QA","brandName":"VerifyBrand"}'

# 产品分类排序（2026-10-26 新增能力）：首位上移应回 400，否则回 200 且 productGroups 已换位
curl -s -b /tmp/c.txt -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:8080/api/admin/catalog \
  -d '{"projectId":"<PID>","action":"reorder-group","name":"<分组名>","offset":-1}'
```

文档发布要注意两点：`publish` 的请求体必须是**文档本体**（`productId`/`slug`/`title`/`content`/`placements`），不是 `save` 返回的整个信封（否则报「文档路径无效」）；并且要带上 `save` 返回的 `updatedAt` 才能通过乐观锁。

## 镜像产物

`bash scripts/build-image.sh`（或部署脚本第 1 步）在本机产出 `dist/md-images-<tag>.tar.gz`：

| 镜像 | 内容 | 体积 |
| --- | --- | --- |
| `multi-document-app:<tag>` | Next standalone 运行时 | ~286 MB |
| `multi-document-tools:<tag>` | prisma CLI + adapter + seed 依赖，只跑一次性迁移 | ~602 MB |
| 合并包 | `dist/md-images-<tag>.tar.gz` | ~149 MB |

层缓存命中时第二次构建只要几十秒（`npm ci` 与 `next build` 都会 CACHED）。

## 部署记录

| 日期 | 镜像 tag | 内容 | 结果 |
| --- | --- | --- | --- |
| 2026-10-30 | `e2a6893` | 编辑器与预览改为双向滚动联动：滚右侧预览时左侧源码按同比例跟随；记录驱动方并忽略程序设置滚动的回传事件，避免两边互相拉扯；正文变更后 600ms 内忽略预览侧事件，防止滚动锚定带动编辑器；新增 `scripts/browser-test-scroll-sync.mjs`（插入定位/高亮 + 双向联动 + 无拉扯四场景） | init 无待执行迁移、数据未动；app healthy；`/admin/login` 200；`.env` 的 IMAGE_TAG 已同步。第 5 步自检那次 `ssh` 被 `Connection reset`，重连后手工自检通过 |
| 2026-10-30 | `f069d34` | 编辑器插入组件后自动定位：未碰过正文时追加文末（原先插文首）、编辑器滚到插入点、预览同步定位并短暂高亮；新增插入位置浏览器回归 | init 无待执行迁移、数据未动；app healthy；`/admin/login` 200；`.env` 的 IMAGE_TAG 已同步 |
| 2026-10-26 | `6e0d2fe` | 拉取远程 8 个提交：编辑器「项目变量」快捷插入、`{{变量\|默认值}}` 语法、产品分类排序（`reorder-group`）、弹窗统一 70vh 限高、去「中广云」品牌字样 | init 无待执行迁移、种子自动跳过（已有 2 个项目，数据未动）；app healthy；接口级自检全通过 |

本次部署的完整链路（可直接照抄）：

```bash
cd D:/MyCode/Multi-document
git fetch origin && git pull --ff-only origin main   # 本地未提交改动先还原（以远程为准）
npx tsc --noEmit                                    # 类型检查
npm run build                                       # 本地先编一遍，确认不是容器环境问题
bash scripts/deploy-remote.sh                       # 构建 → 上传 → load → 重启 → 自检
```

如果 `ssh` 报 `Connection timed out`（链路抖动），直接重跑最后一条：镜像层有缓存，重跑只花几十秒，第 2 步之后的 `mkdir`/`.env` 判断都是幂等的，不会覆盖服务器上的 `.env` 和 `data/`。
