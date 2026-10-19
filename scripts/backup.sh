#!/usr/bin/env bash
# ==============================================================================
# XFarm - Kịch bản Sao lưu Cơ sở dữ liệu và Media (Backup Script)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Nạp file .env nếu có (không ghi đè biến đã được chỉ định ở môi trường hiện tại)
if [ -f "$REPO_ROOT/.env" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
      # Xóa dấu nháy bao quanh nếu có
      val="${val%\"}"
      val="${val#\"}"
      val="${val%\'}"
      val="${val#\'}"
      if [ -z "${!key+x}" ]; then
        export "$key"="$val"
      fi
    fi
  done < "$REPO_ROOT/.env"
fi

# Các tham số cấu hình
BACKUP_DATABASE="${1:-${BACKUP_DATABASE:-xfarm_main}}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-xfarm_postgres}"
POSTGRES_USER="${POSTGRES_USER:-xfarm}"

MINIO_CONTAINER="${MINIO_CONTAINER:-xfarm_minio}"
MINIO_BUCKET="${MINIO_BUCKET:-xfarm-media}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost}"
MINIO_PORT="${MINIO_PORT:-9010}"
MINIO_USE_SSL="${MINIO_USE_SSL:-false}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-${MINIO_ROOT_USER:-xfarm_minio}}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-xfarm_minio_secret}}"

BACKUP_KEEP="${BACKUP_KEEP:-7}"
BACKUP_ROOT="${REPO_ROOT}/backups"
TIMESTAMP="$(date +"%Y%m%d-%H%M")"
BACKUP_DIR="${BACKUP_ROOT}/xfarm-${TIMESTAMP}"

TEMP_MEDIA_DIR=""

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $*"
}

log_warn() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $*" >&2
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2
}

log_success() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $*"
}

# Dọn dẹp khi có lỗi bất ngờ
cleanup_on_error() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    log_error "Quá trình sao lưu gặp lỗi (mã thoát: $exit_code)!"
    if [ -d "${BACKUP_DIR:-}" ]; then
      log_warn "Đang dọn dẹp thư mục sao lưu chưa hoàn chỉnh: $BACKUP_DIR"
      rm -rf "$BACKUP_DIR"
    fi
  fi
  if [ -n "${TEMP_MEDIA_DIR:-}" ] && [ -d "$TEMP_MEDIA_DIR" ]; then
    rm -rf "$TEMP_MEDIA_DIR"
  fi
}
trap cleanup_on_error EXIT

log "=== BẮT ĐẦU QUÁ TRÌNH SAO LƯU XFARM ==="
log "Thời gian: $(date)"
log "Cơ sở dữ liệu: $BACKUP_DATABASE"
log "Container Postgres: $POSTGRES_CONTAINER"
log "Bucket Media: $MINIO_BUCKET"
log "Thư mục đích: $BACKUP_DIR"
log "Số bản lưu giữ (retention): $BACKUP_KEEP"

# 1. Kiểm tra Docker và Postgres Container
if ! command -v docker >/dev/null 2>&1; then
  log_error "Không tìm thấy lệnh 'docker'. Vui lòng cài đặt Docker."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qw "$POSTGRES_CONTAINER"; then
  log_error "Container PostgreSQL '$POSTGRES_CONTAINER' hiện không chạy!"
  exit 1
fi

# Kiểm tra database có tồn tại trong Postgres không
DB_EXISTS="$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$BACKUP_DATABASE'" || true)"
if [ "$DB_EXISTS" != "1" ]; then
  log_error "Cơ sở dữ liệu '$BACKUP_DATABASE' không tồn tại trong container '$POSTGRES_CONTAINER'!"
  exit 1
fi

# Tạo thư mục sao lưu
mkdir -p "$BACKUP_DIR"

# 2. Sao lưu Cơ sở dữ liệu bằng pg_dump (định dạng custom -Fc)
log "Đang sao lưu database '$BACKUP_DATABASE' (định dạng custom pg_dump)..."
DUMP_FILE="$BACKUP_DIR/db.dump"
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$BACKUP_DATABASE" -Fc > "$DUMP_FILE"

if [ ! -s "$DUMP_FILE" ]; then
  log_error "File sao lưu db.dump rỗng hoặc không được tạo thành công!"
  exit 1
fi

DUMP_SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
log_success "Sao lưu database thành công! Kích thước: $DUMP_SIZE"

# 3. Sao lưu bucket Media (MinIO / RustFS)
log "Đang kiểm tra và sao lưu bucket media '$MINIO_BUCKET'..."
TEMP_MEDIA_DIR="$(mktemp -d /tmp/xfarm-media-backup-XXXXXX)"
MEDIA_ARCHIVE="$BACKUP_DIR/media.tar.gz"

PROTOCOL="http"
if [ "$MINIO_USE_SSL" = "true" ]; then
  PROTOCOL="https"
fi
S3_ENDPOINT="${PROTOCOL}://${MINIO_ENDPOINT}:${MINIO_PORT}"

MEDIA_BACKED_UP=false

# Ưu tiên 1: Sử dụng aws CLI trên máy host nếu có
if command -v aws >/dev/null 2>&1; then
  log "Sử dụng aws CLI cục bộ để đồng bộ media..."
  if AWS_ACCESS_KEY_ID="$MINIO_ACCESS_KEY" \
     AWS_SECRET_ACCESS_KEY="$MINIO_SECRET_KEY" \
     AWS_DEFAULT_REGION="us-east-1" \
     aws --endpoint-url "$S3_ENDPOINT" s3 sync "s3://$MINIO_BUCKET" "$TEMP_MEDIA_DIR" --quiet; then
    MEDIA_BACKED_UP=true
  else
    log_warn "Đồng bộ qua aws CLI cục bộ không thành công, sẽ thử phương án tiếp theo."
  fi
fi

# Ưu tiên 2: Sử dụng mc trong container minio nếu có
if [ "$MEDIA_BACKED_UP" = "false" ] && docker ps --format '{{.Names}}' | grep -qw "$MINIO_CONTAINER"; then
  if docker exec "$MINIO_CONTAINER" which mc >/dev/null 2>&1; then
    log "Sử dụng mc trong container '$MINIO_CONTAINER'..."
    docker exec "$MINIO_CONTAINER" mc alias set local "$S3_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" --api S3v4 >/dev/null 2>&1 || true
    if docker exec "$MINIO_CONTAINER" mc mirror --quiet "local/$MINIO_BUCKET" "/tmp/mc-backup-$TIMESTAMP"; then
      docker cp "$MINIO_CONTAINER:/tmp/mc-backup-$TIMESTAMP/." "$TEMP_MEDIA_DIR/"
      docker exec "$MINIO_CONTAINER" rm -rf "/tmp/mc-backup-$TIMESTAMP"
      MEDIA_BACKED_UP=true
    fi
  fi
fi

# Ưu tiên 3: Sử dụng docker image amazon/aws-cli
if [ "$MEDIA_BACKED_UP" = "false" ]; then
  if docker image inspect amazon/aws-cli >/dev/null 2>&1 || docker image inspect amazon/aws-cli:latest >/dev/null 2>&1; then
    log "Sử dụng docker container 'amazon/aws-cli' để đồng bộ media..."
    if docker run --rm \
      --user "$(id -u):$(id -g)" \
      --network host \
      -v "$TEMP_MEDIA_DIR:/backup" \
      -e AWS_ACCESS_KEY_ID="$MINIO_ACCESS_KEY" \
      -e AWS_SECRET_ACCESS_KEY="$MINIO_SECRET_KEY" \
      -e AWS_DEFAULT_REGION="us-east-1" \
      amazon/aws-cli --endpoint-url "$S3_ENDPOINT" s3 sync "s3://$MINIO_BUCKET" /backup --only-show-errors; then
      MEDIA_BACKED_UP=true
    else
      log_warn "Đồng bộ qua container amazon/aws-cli gặp lỗi."
    fi
  fi
fi

if [ "$MEDIA_BACKED_UP" = "true" ]; then
  # Nén thư mục media thành media.tar.gz
  log "Đang nén dữ liệu media vào $MEDIA_ARCHIVE..."
  tar -czf "$MEDIA_ARCHIVE" -C "$TEMP_MEDIA_DIR" .
  MEDIA_SIZE="$(du -h "$MEDIA_ARCHIVE" | cut -f1)"
  log_success "Sao lưu media thành công! Kích thước file nén: $MEDIA_SIZE"
else
  log_warn "Không thể sao chép bucket qua aws/mc/docker aws-cli. Tạo file media.tar.gz rỗng để ghi nhận."
  tar -czf "$MEDIA_ARCHIVE" -T /dev/null
fi

# Dọn dẹp thư mục tạm media
rm -rf "$TEMP_MEDIA_DIR"
TEMP_MEDIA_DIR=""

# 4. Ghi manifest thông tin bản sao lưu
cat <<EOF > "$BACKUP_DIR/manifest.json"
{
  "timestamp": "$TIMESTAMP",
  "database": "$BACKUP_DATABASE",
  "dump_file": "db.dump",
  "media_file": "media.tar.gz",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "postgres_container": "$POSTGRES_CONTAINER",
  "minio_bucket": "$MINIO_BUCKET"
}
EOF

# 5. Dọn dẹp các bản sao lưu cũ (Retention Policy)
if [ "$BACKUP_KEEP" -gt 0 ]; then
  log "Kiểm tra chính sách lưu trữ (giữ $BACKUP_KEEP bản sao lưu gần nhất)..."
  mapfile -t ALL_BACKUPS < <(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name 'xfarm-*' | sort)
  TOTAL_BACKUPS=${#ALL_BACKUPS[@]}

  if [ "$TOTAL_BACKUPS" -gt "$BACKUP_KEEP" ]; then
    EXCESS=$((TOTAL_BACKUPS - BACKUP_KEEP))
    log "Tìm thấy $TOTAL_BACKUPS bản sao lưu. Đang xóa $EXCESS bản cũ nhất..."
    for (( i=0; i<EXCESS; i++ )); do
      OLD_BACKUP="${ALL_BACKUPS[i]}"
      log "Xóa bản sao lưu cũ: $OLD_BACKUP"
      rm -rf "$OLD_BACKUP"
    done
  else
    log "Số lượng bản sao lưu hiện tại ($TOTAL_BACKUPS) nằm trong giới hạn cho phép ($BACKUP_KEEP)."
  fi
fi

# Gỡ bỏ trap lỗi vì đã hoàn thành an toàn
trap - EXIT

log_success "=== SAO LƯU HOÀN TẤT THÀNH CÔNG ==="
log_success "Thư mục bản sao lưu: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
exit 0
