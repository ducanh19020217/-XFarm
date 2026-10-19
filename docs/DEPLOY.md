# Triển khai XFarm bằng Docker Compose

## Chuẩn bị

Máy chạy production cần Docker Engine và Compose plugin. Tạo file cấu hình từ mẫu, sau đó thay toàn bộ giá trị `replace-with-*` bằng giá trị thật:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

`docker-compose.prod.yml` không chứa Mailpit. SMTP phải trỏ tới nhà cung cấp thật qua các biến `SMTP_*` khi module gửi email được bật.

## Build và khởi động

Kiểm tra cấu hình trước khi tạo image hoặc container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

Build và khởi động trên máy production/CI:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

API được bind vào loopback ở cổng `API_PORT`; web bind ở `WEB_PORT` (mặc định 3100). RustFS, Postgres và Redis chỉ nằm trong network riêng `xfarm_prod_network`.

API entrypoint tự chạy `prisma migrate deploy` trước khi khởi động NestJS. Nếu migration lỗi, container API dừng để tránh phục vụ ứng dụng với schema chưa cập nhật.

## Migrate và seed lần đầu

Migration được chạy tự động bởi API. Seed là thao tác một lần, chạy trong container API sau khi stack đã healthy:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api \
  /app/node_modules/.bin/tsx /app/packages/db/prisma/seed.ts
```

Seed hiện được thiết kế idempotent, nhưng hãy kiểm tra dữ liệu trước khi chạy lại trên hệ thống đã có dữ liệu nghiệp vụ.

## Sao lưu và khôi phục

Sao lưu PostgreSQL bằng `pg_dump` vào thư mục backup đã chuẩn bị trên host:

```bash
mkdir -p backups
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "backups/xfarm-$(date +%Y%m%d-%H%M%S).dump"
```

Khôi phục vào database đã dừng API (lệnh sẽ ghi đè dữ liệu trong database đích):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml stop api
cat backups/xfarm-YYYYMMDD-HHMMSS.dump | docker compose \
  --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists'
docker compose --env-file .env.production -f docker-compose.prod.yml start api
```

Volume RustFS `xfarm_prod_miniodata` chứa media và phải được backup riêng theo chính sách snapshot/backup volume của máy chủ. Không xóa các volume production để xử lý lỗi ứng dụng.

## Cập nhật phiên bản

1. Backup PostgreSQL và media.
2. Checkout tag/commit mới.
3. Kiểm tra `.env.production` và chạy `docker compose ... config`.
4. Build image mới rồi triển khai:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build --pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
```

5. Xác nhận `GET /api/v1/health` trả `{ "status": "ok" }`, sau đó kiểm tra các luồng đăng nhập và truy xuất public.

## Reverse proxy và HTTPS

Đặt Nginx/Traefik ở phía trước web và API. Ví dụ Nginx tối giản:

```nginx
server {
    listen 80;
    server_name www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.example.com;

    ssl_certificate     /etc/letsencrypt/live/www.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.example.com/privkey.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:4100;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Chỉ mở cổng HTTPS trên firewall. Dùng Certbot hoặc ACME client để cấp và tự động gia hạn chứng chỉ; không commit chứng chỉ hoặc private key vào repository.
