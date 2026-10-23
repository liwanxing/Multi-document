#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Multi-document 宝塔面板部署/更新脚本
#
# 用法（在宝塔终端或 SSH 中执行）：
#   bash deploy-baota.sh            # 首次部署或拉取更新
#   bash deploy-baota.sh status     # 查看运行状态
#   bash deploy-baota.sh logs       # 查看应用日志
#   bash deploy-baota.sh stop       # 停止服务
#
# 首次使用：只改下面"配置区"，其他部分不用动。
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# ───────── 配置区（按服务器实际情况修改）─────────
# 仓库地址：默认走 Gitee（国内快），失败自动回退 GitHub
GITEE_URL="https://gitee.com/LiWanXing/multi-document.git"
GITHUB_URL="https://github.com/liwanxing/Multi-document.git"

# 代码存放目录（宝塔默认站点根目录习惯）
APP_DIR="/www/wwwroot/multi-document"
BRANCH="main"

# 部署方式：
#   docker = 推荐，自带 MySQL/迁移/编排，服务器只需装 Docker
#   node   = 直接跑 Node 进程，需在宝塔面板自行安装 MySQL 和 PM2
MODE="docker"

# 访问端口（docker 模式下改端口请同时改仓库里 docker-compose.yml 的 ports）
PORT=4000

# 生产安全配置（务必修改！）
ADMIN_AUTH_SECRET="请改成一段随机长字符串"    # 后台会话签名密钥
MYSQL_PASSWORD="multidoc123"                 # docker 模式：数据库 root 密码
MYSQL_DATABASE="multi_document"

# node 模式专用：宝塔面板所装 MySQL 的连接串（docker 模式忽略此项）
NODE_DATABASE_URL="mysql://root:请改成数据库密码@127.0.0.1:3306/multi_document"
# ───────── 配置区结束 ─────────

info()  { echo -e "\033[32m[部署]\033[0m $*"; }
warn()  { echo -e "\033[33m[注意]\033[0m $*"; }
fail()  { echo -e "\033[31m[失败]\033[0m $*" >&2; exit 1; }

# ───────── 拉取代码：优先 Gitee，失败回退 GitHub ─────────
fetch_code() {
  if [ -d "$APP_DIR/.git" ]; then
    info "目录已存在，拉取最新代码（$BRANCH）"
    git -C "$APP_DIR" fetch origin "$BRANCH"
    git -C "$APP_DIR" reset --hard "origin/$BRANCH"
  else
    info "首次部署，克隆仓库到 $APP_DIR"
    mkdir -p "$(dirname "$APP_DIR")"
    if git clone -b "$BRANCH" "$GITEE_URL" "$APP_DIR" 2>/dev/null; then
      info "已从 Gitee 克隆"
    elif git clone -b "$BRANCH" "$GITHUB_URL" "$APP_DIR"; then
      info "已从 GitHub 克隆（Gitee 不可达）"
    else
      fail "两个仓库地址都无法克隆，请检查服务器网络"
    fi
  fi
}

# ───────── docker 模式 ─────────
deploy_docker() {
  command -v docker >/dev/null || fail "服务器未安装 Docker，请在宝塔【Docker管理器】安装后重试"

  info "写入生产环境变量 $APP_DIR/.env"
  cat > "$APP_DIR/.env" <<EOF
ADMIN_AUTH_SECRET=$ADMIN_AUTH_SECRET
MYSQL_PASSWORD=$MYSQL_PASSWORD
MYSQL_DATABASE=$MYSQL_DATABASE
EOF
  chmod 600 "$APP_DIR/.env"

  info "构建镜像并启动（首次构建约 5-10 分钟）"
  docker compose -f "$APP_DIR/docker-compose.yml" --project-directory "$APP_DIR" up -d --build

  info "等待应用就绪…"
  for i in $(seq 1 30); do
    if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then
      info "应用已就绪：http://服务器IP:$PORT"
      return
    fi
    sleep 2
  done
  warn "60 秒内未探活成功，请执行 bash deploy-baota.sh logs 排查"
}

# ───────── node 模式（PM2）─────────
deploy_node() {
  command -v pm2 >/dev/null || fail "未安装 PM2，请在宝塔【Node项目】或 npm install -g pm2 安装"
  [ "$NODE_DATABASE_URL" != *"请改成数据库密码"* ] || warn "NODE_DATABASE_URL 仍是占位值，请先在配置区填写"

  cd "$APP_DIR"
  info "安装依赖"
  npm ci --omit=dev=false

  info "执行数据库迁移"
  DATABASE_URL="$NODE_DATABASE_URL" npx prisma migrate deploy

  info "构建生产包"
  npm run build

  info "重启 PM2 进程"
  pm2 delete multi-document 2>/dev/null || true
  PORT="$PORT" DATABASE_URL="$NODE_DATABASE_URL" DATA_BACKEND=mysql \
    ADMIN_AUTH_SECRET="$ADMIN_AUTH_SECRET" \
    pm2 start node_modules/next/dist/bin/next --name multi-document -- start -p "$PORT"
  pm2 save

  info "应用已启动：http://服务器IP:$PORT（pm2 logs multi-document 查看日志）"
}

# ───────── 辅助命令 ─────────
show_status() {
  if [ "$MODE" = "docker" ]; then
    docker compose -f "$APP_DIR/docker-compose.yml" --project-directory "$APP_DIR" ps
  else
    pm2 status multi-document
  fi
  curl -s -o /dev/null -w "前台首页 HTTP 状态: %{http_code}\n" -m 5 "http://127.0.0.1:$PORT/" || true
}

show_logs() {
  if [ "$MODE" = "docker" ]; then
    docker compose -f "$APP_DIR/docker-compose.yml" --project-directory "$APP_DIR" logs -f app
  else
    pm2 logs multi-document
  fi
}

stop_service() {
  if [ "$MODE" = "docker" ]; then
    docker compose -f "$APP_DIR/docker-compose.yml" --project-directory "$APP_DIR" down
  else
    pm2 stop multi-document || true
  fi
  info "已停止"
}

# ───────── 入口 ─────────
case "${1:-deploy}" in
  deploy) fetch_code; [ "$MODE" = "docker" ] && deploy_docker || deploy_node ;;
  status) show_status ;;
  logs)   show_logs ;;
  stop)   stop_service ;;
  *)      echo "用法: bash deploy-baota.sh [deploy|status|logs|stop]"; exit 1 ;;
esac
