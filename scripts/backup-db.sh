#!/usr/bin/env bash
# 每日数据库备份（服务器上由 crontab 调用，也可手动跑）
#
#   ./backup-db.sh                 # 导出到 backups/，保留最近 7 份
#   BACKUP_KEEP=30 ./backup-db.sh  # 改保留份数
#
# 为什么用份数而不是天数：每天固定跑一次，7 份就是 7 天。
# 用份数能保证不管隔多久跑，目录里始终留着最近几份可恢复的快照。
set -euo pipefail
cd "$(dirname "$0")"

KEEP="${BACKUP_KEEP:-7}"

if [ ! -f .env ]; then
  echo "[backup] 找不到 .env，退出"
  exit 1
fi
set -a
. ./.env
set +a

DB="${MYSQL_DATABASE:-multi_document}"
TS=$(date +%Y%m%d-%H%M%S)
OUT="backups/${DB}-${TS}.sql"
mkdir -p backups

# --single-transaction：不锁表，备份时站点照常访问
# --databases：带上 CREATE DATABASE / USE，恢复时不用先建库
docker exec multi-document-db mysqldump -uroot -p"$MYSQL_PASSWORD" \
  --single-transaction --quick --default-character-set=utf8mb4 \
  --databases "$DB" > "$OUT"

SIZE=$(stat -c%s "$OUT")
echo "[backup] $(date '+%F %T')  $OUT  $((SIZE / 1024)) KB"

# 空库或导出失败也会生成文件，太小就说明有问题
if [ "$SIZE" -lt 10240 ]; then
  echo "[backup] !! 文件小于 10KB，导出可能异常，请检查"
fi

# 按修改时间倒序，从第 KEEP+1 份开始删
ls -1t backups/"${DB}"-*.sql 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "[backup] 当前保留 $(ls -1 backups/"${DB}"-*.sql 2>/dev/null | wc -l) 份"
