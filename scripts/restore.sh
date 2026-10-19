#!/usr/bin/env bash
# ==============================================================================
# XFarm - Kịch bản Khôi phục Cơ sở dữ liệu và Media (Restore Script)
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

# 1. Phân tích tham số dòng lệnh
CONFIRM_YES=false
BACKUP_DIR=""

for arg in "$@"; do
  case "$arg" in
    --yes|-y)
      CONFIRM_YES=true
      ;;
    *)
      if [ -z "$BACKUP_DIR" ]; then
        BACKUP_DIR="$arg"
      fi
      ;;
  esac
done

if [ -z "$BACKUP_DIR" ]; then
  log_error "Lỗi: Chưa chỉ định thư mục sao lưu!"
  echo "Cách dùng: $0 <thư-mục-backup> [--yes]"
  echo "Ví dụ:"
  echo "  RESTORE_DATABASE=xfarm_restore_test $0 backups/xfarm-20261019-1818"
  echo "  RESTORE_DATABASE=xfarm_main $0 backups/xfarm-20261019-1818 --yes"
  exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
  log_error "Lỗi: Thư mục sao lưu không tồn tại: $BACKUP_DIR"
  exit 1
fi

# Tìm file dump
DUMP_FILE=""
if [ -f "$BACKUP_DIR/db.dump" ]; then
  DUMP_FILE="$BACKUP_DIR/db.dump"
elif compgen -G "$BACKUP_DIR/*.dump" >/dev/null; then
  DUMP_FILE="$(ls "$BACKUP_DIR"/*.dump | head -n 1)"
fi

if [ -z "$DUMP_FILE" ] || [ ! -s "$DUMP_FILE" ]; then
  log_error "Lỗi: Không tìm thấy file dump hợp lệ (db.dump) trong '$BACKUP_DIR'!"
  exit 1
fi

# 2. Kiểm tra biến môi trường RESTORE_DATABASE
if [ -z "${RESTORE_DATABASE:-}" ]; then
  log_error "Lỗi: Biến môi trường RESTORE_DATABASE chưa được thiết lập!"
  echo "Vui lòng chỉ định tên database đích, ví dụ: RESTORE_DATABASE=xfarm_restore_test $0 $BACKUP_DIR"
  exit 1
fi

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-xfarm_postgres}"
POSTGRES_USER="${POSTGRES_USER:-xfarm}"

MINIO_CONTAINER="${MINIO_CONTAINER:-xfarm_minio}"
MINIO_BUCKET="${MINIO_BUCKET:-xfarm-media}"
RESTORE_MEDIA_BUCKET="${RESTORE_MEDIA_BUCKET:-$MINIO_BUCKET}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost}"
MINIO_PORT="${MINIO_PORT:-9010}"
MINIO_USE_SSL="${MINIO_USE_SSL:-false}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-${MINIO_ROOT_USER:-xfarm_minio}}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-xfarm_minio_secret}}"

TEMP_MEDIA_RESTORE_DIR=""

cleanup_on_exit() {
  if [ -n "${TEMP_MEDIA_RESTORE_DIR:-}" ] && [ -d "$TEMP_MEDIA_RESTORE_DIR" ]; then
    rm -rf "$TEMP_MEDIA_RESTORE_DIR"
  fi
}
trap cleanup_on_exit EXIT

# 3. Kiểm tra bảo vệ database đang dùng (Active Database Protection)
# Trích xuất database đang cấu hình trong DATABASE_URL của ứng dụng
APP_ACTIVE_DB=""
if [ -n "${DATABASE_URL:-}" ]; then
  cleaned_url="${DATABASE_URL%%\?*}"
  APP_ACTIVE_DB="${cleaned_url##*/}"
fi

IS_IN_USE=false
REASON=""

if [ -n "$APP_ACTIVE_DB" ] && [ "$RESTORE_DATABASE" = "$APP_ACTIVE_DB" ]; then
  IS_IN_USE=true
  REASON="trùng với database ứng dụng hiện tại cấu hình trong .env ($APP_ACTIVE_DB)"
elif [ "$RESTORE_DATABASE" = "xfarm_main" ]; then
  IS_IN_USE=true
  REASON="là database chính (xfarm_main)"
elif [ -n "${POSTGRES_DB:-}" ] && [ "$RESTORE_DATABASE" = "$POSTGRES_DB" ]; then
  IS_IN_USE=true
  REASON="trùng với POSTGRES_DB ($POSTGRES_DB)"
fi

# Kiểm tra số lượng kết nối đang hoạt động tới database đích trong Postgres
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qw "$POSTGRES_CONTAINER"; then
  ACTIVE_CONNS="$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT count(*) FROM pg_stat_activity WHERE datname = '$RESTORE_DATABASE' AND pid <> pg_backend_pid();" 2>/dev/null || echo "0")"
  if [ "${ACTIVE_CONNS:-0}" -gt 0 ]; then
    IS_IN_USE=true
    REASON="hiện có $ACTIVE_CONNS kết nối ứng dụng đang mở tới database này"
  fi
fi

if [ "$IS_IN_USE" = "true" ]; then
  if [ "$CONFIRM_YES" != "true" ]; then
    echo "================================================================================" >&2
    log_error "TỪ CHỐI THỰC THI: Database '$RESTORE_DATABASE' là database đang được sử dụng ($REASON)!"
    log_error "Thao tác khôi phục sẽ ghi đè và làm mới toàn bộ dữ liệu."
    log_error "Để xác nhận khôi phục đè lên database đang dùng, bạn BẮT BUỘC phải truyền thêm cờ --yes."
    log_error "Cú pháp:"
    log_error "  RESTORE_DATABASE=$RESTORE_DATABASE $0 $BACKUP_DIR --yes"
    echo "================================================================================" >&2
    exit 1
  else
    log_warn "CẢNH BÁO: Database '$RESTORE_DATABASE' đang được sử dụng ($REASON), nhưng cờ --yes đã được cung cấp. Tiếp tục khôi phục..."
  fi
fi

log "=== BẮT ĐẦU QUÁ TRÌNH KHÔI PHỤC XFARM ==="
log "Thư mục nguồn: $BACKUP_DIR"
log "File dump cơ sở dữ liệu: $DUMP_FILE"
log "Cơ sở dữ liệu đích: $RESTORE_DATABASE"
log "Container PostgreSQL: $POSTGRES_CONTAINER"
log "Bucket Media đích: $RESTORE_MEDIA_BUCKET"

# 4. Kiểm tra container PostgreSQL
if ! docker ps --format '{{.Names}}' | grep -qw "$POSTGRES_CONTAINER"; then
  log_error "Container PostgreSQL '$POSTGRES_CONTAINER' không chạy!"
  exit 1
fi

# Kiểm tra xem database đích đã tồn tại chưa
DB_EXISTS="$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$RESTORE_DATABASE';" 2>/dev/null || true)"

if [ "$DB_EXISTS" = "1" ]; then
  log "Cơ sở dữ liệu '$RESTORE_DATABASE' đã tồn tại. Đang ngắt kết nối và tạo mới lại để bảo đảm sạch sẽ..."
  docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$RESTORE_DATABASE' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
  docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE \"$RESTORE_DATABASE\";"
fi

log "Đang tạo cơ sở dữ liệu trống: $RESTORE_DATABASE..."
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$RESTORE_DATABASE\";"

# 5. Khôi phục dữ liệu bằng pg_restore
log "Đang nạp file dump vào database '$RESTORE_DATABASE'..."
# Sử dụng --no-owner --no-privileges để không phụ thuộc vào username ban đầu
docker exec -i "$POSTGRES_CONTAINER" pg_restore -U "$POSTGRES_USER" -d "$RESTORE_DATABASE" --no-owner --no-privileges < "$DUMP_FILE" || {
  # Lưu ý: pg_restore có thể trả về exit code 1 với một vài cảnh báo không nghiêm trọng
  # Ta kiểm tra lại xem các bảng đã được nạp hay chưa
  TABLE_COUNT="$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$RESTORE_DATABASE" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")"
  if [ "$TABLE_COUNT" -eq 0 ]; then
    log_error "Khôi phục dữ liệu database thất bại: không có bảng nào được tạo trong '$RESTORE_DATABASE'!"
    exit 1
  fi
}

log_success "Khôi phục cấu trúc và dữ liệu database '$RESTORE_DATABASE' thành công!"

# 6. Khôi phục Media nếu có
MEDIA_SOURCE_DIR=""
if [ -f "$BACKUP_DIR/media.tar.gz" ]; then
  TEMP_MEDIA_RESTORE_DIR="$(mktemp -d /tmp/xfarm-media-restore-XXXXXX)"
  log "Giải nén media.tar.gz vào thư mục tạm..."
  tar -xzf "$BACKUP_DIR/media.tar.gz" -C "$TEMP_MEDIA_RESTORE_DIR"
  MEDIA_SOURCE_DIR="$TEMP_MEDIA_RESTORE_DIR"
elif [ -d "$BACKUP_DIR/media" ]; then
  MEDIA_SOURCE_DIR="$BACKUP_DIR/media"
fi

if [ -n "$MEDIA_SOURCE_DIR" ] && [ -d "$MEDIA_SOURCE_DIR" ]; then
  # Kiểm tra xem có file nào bên trong không
  FILE_COUNT="$(find "$MEDIA_SOURCE_DIR" -type f | wc -l)"
  if [ "$FILE_COUNT" -gt 0 ]; then
    log "Đang khôi phục $FILE_COUNT tệp media vào bucket '$RESTORE_MEDIA_BUCKET'..."
    PROTOCOL="http"
    if [ "$MINIO_USE_SSL" = "true" ]; then
      PROTOCOL="https"
    fi
    S3_ENDPOINT="${PROTOCOL}://${MINIO_ENDPOINT}:${MINIO_PORT}"

    MEDIA_RESTORED=false

    # Ưu tiên 1: aws CLI trên máy host
    if command -v aws >/dev/null 2>&1; then
      log "Sử dụng aws CLI cục bộ..."
      if AWS_ACCESS_KEY_ID="$MINIO_ACCESS_KEY" \
         AWS_SECRET_ACCESS_KEY="$MINIO_SECRET_KEY" \
         AWS_DEFAULT_REGION="us-east-1" \
         aws --endpoint-url "$S3_ENDPOINT" s3 sync "$MEDIA_SOURCE_DIR" "s3://$RESTORE_MEDIA_BUCKET" --quiet; then
        MEDIA_RESTORED=true
      fi
    fi

    # Ưu tiên 2: mc trong container minio
    if [ "$MEDIA_RESTORED" = "false" ] && docker ps --format '{{.Names}}' | grep -qw "$MINIO_CONTAINER"; then
      if docker exec "$MINIO_CONTAINER" which mc >/dev/null 2>&1; then
        log "Sử dụng mc trong container '$MINIO_CONTAINER'..."
        docker cp "$MEDIA_SOURCE_DIR/." "$MINIO_CONTAINER:/tmp/mc-restore/"
        docker exec "$MINIO_CONTAINER" mc alias set local "$S3_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" --api S3v4 >/dev/null 2>&1 || true
        docker exec "$MINIO_CONTAINER" mc mb "local/$RESTORE_MEDIA_BUCKET" >/dev/null 2>&1 || true
        if docker exec "$MINIO_CONTAINER" mc mirror --quiet "/tmp/mc-restore" "local/$RESTORE_MEDIA_BUCKET"; then
          MEDIA_RESTORED=true
        fi
        docker exec "$MINIO_CONTAINER" rm -rf "/tmp/mc-restore"
      fi
    fi

    # Ưu tiên 3: docker container amazon/aws-cli
    if [ "$MEDIA_RESTORED" = "false" ]; then
      if docker image inspect amazon/aws-cli >/dev/null 2>&1 || docker image inspect amazon/aws-cli:latest >/dev/null 2>&1; then
        log "Sử dụng container amazon/aws-cli để khôi phục media..."
        # Tạo bucket nếu chưa có
        docker run --rm \
          --user "$(id -u):$(id -g)" \
          --network host \
          -e AWS_ACCESS_KEY_ID="$MINIO_ACCESS_KEY" \
          -e AWS_SECRET_ACCESS_KEY="$MINIO_SECRET_KEY" \
          -e AWS_DEFAULT_REGION="us-east-1" \
          amazon/aws-cli --endpoint-url "$S3_ENDPOINT" s3 mb "s3://$RESTORE_MEDIA_BUCKET" >/dev/null 2>&1 || true

        if docker run --rm \
          --user "$(id -u):$(id -g)" \
          --network host \
          -v "$MEDIA_SOURCE_DIR:/source" \
          -e AWS_ACCESS_KEY_ID="$MINIO_ACCESS_KEY" \
          -e AWS_SECRET_ACCESS_KEY="$MINIO_SECRET_KEY" \
          -e AWS_DEFAULT_REGION="us-east-1" \
          amazon/aws-cli --endpoint-url "$S3_ENDPOINT" s3 sync /source "s3://$RESTORE_MEDIA_BUCKET" --only-show-errors; then
          MEDIA_RESTORED=true
        fi
      fi
    fi

    if [ "$MEDIA_RESTORED" = "true" ]; then
      log_success "Khôi phục media thành công vào bucket '$RESTORE_MEDIA_BUCKET'!"
    else
      log_warn "Cảnh báo: Không thể hoàn tất đồng bộ media tự động. Vui lòng kiểm tra lại cấu hình S3/MinIO."
    fi
  else
    log "Bản sao lưu không có tệp media nào hoặc media rỗng."
  fi
fi

# 7. Thống kê kết quả
log "=== KIỂM TRA DỮ LIỆU ĐÃ KHÔI PHỤC TRONG '$RESTORE_DATABASE' ==="
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$RESTORE_DATABASE" -c "
  SELECT table_name,
         (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
  FROM (
    SELECT table_name,
           query_to_xml(format('SELECT count(*) as cnt FROM %I', table_name), false, true, '') as xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('users', 'cycles', 'activities', 'areas', 'items')
  ) t ORDER BY table_name;
" 2>/dev/null || true

log_success "=== KHÔI PHỤC HOÀN TẤT THÀNH CÔNG ==="
exit 0
