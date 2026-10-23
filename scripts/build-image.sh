#!/usr/bin/env bash
# 在开发机（或 CI）上构建生产镜像并打包成单个 tar.gz
#
#   bash scripts/build-image.sh            # tag 取 git 短 sha（有未提交改动加 -dirty）
#   bash scripts/build-image.sh v1.2.0     # 指定 tag
#
# 产物：dist/md-images-<tag>.tar.gz（含 app 与 tools 两个镜像）
# 用法：把产物和 docker-compose.yml 传到服务器后 docker load（见 scripts/deploy-remote.sh）
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:-}"
if [ -z "$TAG" ]; then
  TAG="$(git rev-parse --short HEAD 2>/dev/null || echo latest)"
  # 工作区不干净时打标记，避免"这个 tar 到底是哪一版"的歧义
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    TAG="${TAG}-dirty"
  fi
fi

PLATFORM="${PLATFORM:-linux/amd64}"
NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmjs.org}"
OUT="dist/md-images-${TAG}.tar.gz"

mkdir -p dist

echo "==> 构建 app:${TAG}（目标平台 ${PLATFORM}）"
docker build --platform "$PLATFORM" --target runner \
  -t "multi-document-app:${TAG}" \
  --build-arg NPM_REGISTRY="$NPM_REGISTRY" \
  .

echo "==> 构建 tools:${TAG}"
docker build --platform "$PLATFORM" --target tools \
  -t "multi-document-tools:${TAG}" \
  --build-arg NPM_REGISTRY="$NPM_REGISTRY" \
  .

echo "==> 打包 $OUT"
docker save "multi-document-app:${TAG}" "multi-document-tools:${TAG}" | gzip -9 > "$OUT"

echo
echo "app   $(docker image inspect "multi-document-app:${TAG}"   --format '{{.Size}}' | awk '{printf "%.0f MB", $1/1024/1024}')"
echo "tools $(docker image inspect "multi-document-tools:${TAG}" --format '{{.Size}}' | awk '{printf "%.0f MB", $1/1024/1024}')"
ls -lh "$OUT" | awk '{print "包体  " $5 "  " $9}'
echo "TAG=${TAG}"
