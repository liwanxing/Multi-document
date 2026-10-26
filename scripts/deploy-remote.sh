#!/usr/bin/env bash
# 一条命令完成部署：本地构建镜像 → 传上去 → load → 重启 → 自检
#
#   bash scripts/deploy-remote.sh                  # 部署到 jinrui（~/.ssh/config 里的别名）
#   DEPLOY_HOST=root@1.2.3.4 bash scripts/deploy-remote.sh
#   DEPLOY_DIR=/opt/other bash scripts/deploy-remote.sh
#
# 首次部署会自动建目录、生成 .env（随机强密码）；之后只更新镜像与编排文件，
# 不会覆盖服务器上已有的 .env，也不会碰 data/ 里的数据。
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${DEPLOY_HOST:-jinrui}"
REMOTE_DIR="${DEPLOY_DIR:-/opt/multi-document}"

TAG="$(git rev-parse --short HEAD 2>/dev/null || echo latest)"
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  TAG="${TAG}-dirty"
fi

echo "==> [1/5] 构建镜像"
bash scripts/build-image.sh "$TAG"
OUT="dist/md-images-${TAG}.tar.gz"

echo "==> [2/5] 准备服务器目录与 .env"
ssh "$HOST" "set -e
  mkdir -p '$REMOTE_DIR/data/mysql' '$REMOTE_DIR/data/uploads' '$REMOTE_DIR/images'
  if [ ! -f '$REMOTE_DIR/.env' ]; then
    PW=\$(openssl rand -hex 16)
    SECRET=\$(openssl rand -hex 32)
    cat > '$REMOTE_DIR/.env' <<ENVEOF
MYSQL_PASSWORD=\$PW
ADMIN_AUTH_SECRET=\$SECRET
MYSQL_DATABASE=multi_document
SEED_DEMO=true
IMAGE_TAG=$TAG
COOKIE_SECURE=false
ENVEOF
    chmod 600 '$REMOTE_DIR/.env'
    echo '    已生成新 .env（随机密码）'
  else
    echo '    沿用已有 .env'
  fi
  # .env 里的 IMAGE_TAG 会被 docker compose 直接采用（服务器重启、手动 up -d 也走它），
  # 不同步就会出现“部署完能跑，重启退回旧镜像”——每次部署都把它钉到当前 tag。
  if grep -q '^IMAGE_TAG=' '$REMOTE_DIR/.env'; then
    sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/' '$REMOTE_DIR/.env'
  else
    echo 'IMAGE_TAG=$TAG' >> '$REMOTE_DIR/.env'
  fi
  echo "    IMAGE_TAG 已同步为 $TAG""

echo "==> [3/5] 上传编排与镜像包"
scp -q docker-compose.yml "$HOST:$REMOTE_DIR/docker-compose.yml"
scp -q "$OUT" "$HOST:$REMOTE_DIR/images/"

echo "==> [4/5] load 镜像并重启"
ssh "$HOST" "set -e
  cd '$REMOTE_DIR'
  gunzip -c 'images/$(basename "$OUT")' | docker load
  IMAGE_TAG='$TAG' docker compose up -d --remove-orphans
  docker compose ps"

echo "==> [5/5] 自检"
ssh "$HOST" "set -e
  for i in \$(seq 1 30); do
    code=\$(curl -s -o /dev/null -w '%{http_code}' -m 3 http://127.0.0.1:8080/admin/login || true)
    if [ \"\$code\" = '200' ]; then echo '    /admin/login 200 OK'; break; fi
    sleep 2
  done
  [ \"\$code\" = '200' ] || { echo '    自检失败，看日志： docker compose logs --tail=50 app'; exit 1; }
  echo
  echo '    当前容器：'
  docker ps --filter name=multi-document --format '    {{.Names}}  {{.Status}}  {{.Ports}}'
  echo
  echo '    磁盘：'; du -sh '$REMOTE_DIR' 2>/dev/null | awk '{print \"    部署目录 \" \$1}'
  du -sh '$REMOTE_DIR/data' 2>/dev/null | awk '{print \"    数据目录 \" \$1}'"

echo
echo "完成。本次部署镜像 tag: ${TAG}"
