#!/usr/bin/env bash
# Multi-document 首次部署脚本（服务器上、仓库根目录执行）：
#   cd /opt/multi-document && bash deploy/init-server.sh
# 流程：环境检查 → 检查端口 → 生成 .env（自动随机密钥）→ 构建启动 → 自动验证
set -euo pipefail

APP_PORT=4000
cd "$(dirname "$0")/.."   # 仓库根目录

say() { echo -e "\n\033[1;36m==> $*\033[0m"; }
die() { echo -e "\033[1;31m[失败] $*\033[0m" >&2; exit 1; }

say "1/5 环境检查"
command -v docker >/dev/null || die "没装 docker，先让运维安装"
docker compose version >/dev/null 2>&1 || die "缺少 docker compose V2（让运维装 docker-compose-plugin）"

say "2/5 检查 ${APP_PORT} 端口是否被占用"
if command -v ss >/dev/null && ss -ltn 2>/dev/null | grep -q ":${APP_PORT} "; then
  die "端口 ${APP_PORT} 已被占用：先处理占用进程，或改 docker-compose.yml 里 app 的端口映射"
fi
echo "  端口空闲 ✓"

say "3/5 生成 .env（已存在则沿用，不会覆盖）"
if [ ! -f .env ]; then
  SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
  DBPASS=$(openssl rand -hex 12 2>/dev/null || head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')
  cat > .env <<EOF
MYSQL_PASSWORD=${DBPASS}
ADMIN_AUTH_SECRET=${SECRET}
EOF
  echo "  已生成 .env，内容如下："
  echo "  ----------------------------"
  sed 's/^/  /' .env
  echo "  ----------------------------"
  echo "  ⚠ 把上面两行抄到本地保存一份（数据库密码 / 登录会话密钥）"
else
  echo "  .env 已存在，沿用现有配置"
fi

say "4/5 构建并启动（首次约 5-10 分钟；npm 慢就改用：docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com 后重跑本脚本）"
docker compose up -d --build

say "5/5 等待应用就绪（最长 2 分钟）"
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://localhost:${APP_PORT}" 2>/dev/null; then
    echo "  应用已就绪 ✓"
    docker compose ps
    echo
    echo "  前台:  http://<服务器IP>:${APP_PORT}"
    echo "  后台:  http://<服务器IP>:${APP_PORT}/admin   初始账号 admin / admin123"
    echo
    echo "  ⚠ 登录后第一件事：改掉 admin / operator 默认密码"
    echo "  ⚠ 外网访问不通时放行端口：云厂商安全组 + 宝塔「安全」两层都要放行 ${APP_PORT}"
    exit 0
  fi
  sleep 2
done
die "等待超时。看日志定位问题：docker compose logs -f app"
