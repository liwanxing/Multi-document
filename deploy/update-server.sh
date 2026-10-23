#!/usr/bin/env bash
# Multi-document 日常更新脚本（服务器上、仓库根目录执行）：
#   cd /opt/multi-document && bash deploy/update-server.sh
# 流程：拉最新代码 → 重建滚动重启（有层缓存，通常 1-3 分钟）→ 验证
set -euo pipefail

APP_PORT=4000
cd "$(dirname "$0")/.."

say() { echo -e "\n\033[1;36m==> $*\033[0m"; }

say "1/3 拉取最新代码"
git pull --ff-only || {
  echo "  git pull 失败：服务器上可能有本地改动或网络问题。" >&2
  echo "  处理：git stash（暂存本地改动）后重试；或 git pull 手动解决。" >&2
  exit 1
}

say "2/3 重建并滚动重启"
docker compose up -d --build

say "3/3 验证（最长 1 分钟）"
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://localhost:${APP_PORT}" 2>/dev/null; then
    echo "  更新完成，应用正常 ✓"
    docker compose ps
    exit 0
  fi
  sleep 2
done
echo "  等待超时，查看日志定位：docker compose logs -f app" >&2
exit 1
