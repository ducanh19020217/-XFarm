# Hướng dẫn Sao lưu & Khôi phục Dữ liệu XFarm (Backup & Restore)

Tài liệu này hướng dẫn chi tiết về cơ chế sao lưu định kỳ, kiểm tra tính toàn vẹn của bản sao lưu và quy trình khôi phục dữ liệu cho hệ thống XFarm (bao gồm Cơ sở dữ liệu PostgreSQL và Tệp Media trên MinIO/RustFS).

---

## 1. Tổng quan Kiến trúc Sao lưu & Khôi phục

Hệ thống sao lưu của XFarm được thiết kế để đảm bảo an toàn tuyệt đối cho toàn bộ dữ liệu nghiệp vụ và dữ liệu tệp đa phương tiện của trang trại:

| Thành phần | Công nghệ | Phương thức Sao lưu / Khôi phục | Định dạng |
| :--- | :--- | :--- | :--- |
| **Cơ sở dữ liệu** | PostgreSQL 16 | `pg_dump` qua `docker exec` vào container Postgres | Custom format (`-Fc`), nén zlib nguyên tử |
| **Dữ liệu Media** | RustFS / MinIO (S3 API) | Đồng bộ qua `aws s3 sync` hoặc `mc` | File nén `media.tar.gz` (gzip) |
| **Metadata** | JSON | Tự động sinh `manifest.json` chứa timestamp, nguồn DB, cấu hình | Plaintext JSON |

### Cấu trúc Thư mục Bản sao lưu

Mỗi lần chạy sao lưu, hệ thống sẽ tạo một thư mục con dưới `backups/`:

```text
backups/
├── xfarm-20261019-1818/
│   ├── db.dump          # Bản sao lưu PostgreSQL (định dạng custom -Fc)
│   ├── media.tar.gz     # Bản sao lưu toàn bộ bucket xfarm-media
│   └── manifest.json    # Thông tin chi tiết về bản sao lưu
└── ...
```

---

## 2. Yêu cầu Môi trường & Công cụ

- **Docker**: Docker Engine và Docker Compose đang chạy trên máy chủ.
- **PostgreSQL Container**: Mặc định là `xfarm_postgres` (hoặc thiết lập qua biến `POSTGRES_CONTAINER`).
- **MinIO/RustFS Container**: Mặc định là `xfarm_minio` (hoặc thiết lập qua biến `MINIO_CONTAINER`).
- **Công cụ đồng bộ Media**: Kịch bản tự động nhận diện và sử dụng theo thứ tự ưu tiên:
  1. `aws` CLI cài sẵn trên máy host (`aws --endpoint-url ... s3 sync`).
  2. `mc` (MinIO Client) cài bên trong container MinIO.
  3. Docker image `amazon/aws-cli` (đã có sẵn trong Docker cache của dự án, chạy độc lập không cần cài thêm công cụ trên host).

---

## 3. Hướng dẫn Kịch bản Sao lưu (`scripts/backup.sh`)

### 3.1. Cú pháp & Tùy chọn

```bash
./scripts/backup.sh [tên_database]
```

### 3.2. Biến môi trường hỗ trợ

Các biến này tự động được nạp từ file `.env` ở thư mục gốc nếu người dùng không truyền trực tiếp:

| Biến môi trường | Mặc định | Mô tả |
| :--- | :--- | :--- |
| `BACKUP_DATABASE` | `xfarm_main` | Tên cơ sở dữ liệu cần sao lưu (hoặc truyền qua đối số `$1`) |
| `POSTGRES_CONTAINER` | `xfarm_postgres` | Tên container Docker chứa PostgreSQL |
| `POSTGRES_USER` | `xfarm` | Người dùng PostgreSQL |
| `MINIO_CONTAINER` | `xfarm_minio` | Tên container MinIO/RustFS |
| `MINIO_BUCKET` | `xfarm-media` | Tên bucket media cần sao lưu |
| `MINIO_ENDPOINT` | `localhost` | Địa chỉ host của dịch vụ MinIO/RustFS |
| `MINIO_PORT` | `9010` | Cổng API của dịch vụ MinIO/RustFS |
| `MINIO_ACCESS_KEY` | `xfarm_minio` | Khóa truy cập S3 |
| `MINIO_SECRET_KEY` | `xfarm_minio_secret` | Khóa bí mật S3 |
| `BACKUP_KEEP` | `7` | Số lượng bản sao lưu gần nhất được giữ lại (Retention Policy) |

### 3.3. Ví dụ Sao lưu

1. **Sao lưu mặc định (`xfarm_main` và bucket `xfarm-media`, giữ 7 bản gần nhất):**
   ```bash
   ./scripts/backup.sh
   ```

2. **Sao lưu một database cụ thể (ví dụ `xfarm_s3`):**
   ```bash
   ./scripts/backup.sh xfarm_s3
   # Hoặc:
   BACKUP_DATABASE=xfarm_s3 ./scripts/backup.sh
   ```

3. **Tùy chỉnh số lượng bản sao lưu giữ lại (ví dụ giữ 14 bản):**
   ```bash
   BACKUP_KEEP=14 ./scripts/backup.sh
   ```

---

## 4. Hướng dẫn Kịch bản Khôi phục (`scripts/restore.sh`)

### 4.1. Cú pháp & Tùy chọn

```bash
RESTORE_DATABASE=<tên-db-đích> ./scripts/restore.sh <thư-mục-backup> [--yes]
```

### 4.2. Cơ chế An toàn Bảo vệ Database Đang Dùng (Safety Guard)

Nhằm ngăn chặn sự cố vô tình xóa sạch dữ liệu sản xuất hoặc database đang chạy, `restore.sh` tự động kiểm tra xem database đích có phải là:
- Database đang cấu hình trong `DATABASE_URL` của `.env`.
- Database chính `xfarm_main` hoặc `POSTGRES_DB`.
- Database đang có các kết nối mở (active connections) từ ứng dụng.

Nếu database đích thuộc các trường hợp trên, kịch bản sẽ **TỪ CHỐI THỰC THI** và yêu cầu người dùng phải cung cấp cờ xác nhận `--yes`.

### 4.3. Ví dụ Khôi phục

1. **Khôi phục kiểm thử vào một database mới (`xfarm_restore_test`):**
   ```bash
   RESTORE_DATABASE=xfarm_restore_test ./scripts/restore.sh backups/xfarm-20261019-1818
   ```
   *(Không cần cờ `--yes` vì `xfarm_restore_test` là database phụ tách biệt)*.

2. **Khôi phục đè vào database chính đang hoạt động khi gặp sự cố:**
   ```bash
   RESTORE_DATABASE=xfarm_main ./scripts/restore.sh backups/xfarm-20261019-1818 --yes
   ```

---

## 5. Lịch Cron Gợi ý (Cron Schedule Recommendations)

Để hệ thống tự động sao lưu định kỳ, thêm các dòng sau vào crontab của máy chủ (`crontab -e`):

### 5.1. Sao lưu Hàng ngày (Khuyến nghị cho Môi trường Tiêu chuẩn)
Thực hiện sao lưu vào 02:00 sáng mỗi ngày (khung giờ thấp điểm ít phát sinh giao dịch) và giữ lại 7 bản gần nhất (1 tuần):

```cron
# XFarm Daily Backup at 02:00 AM
0 2 * * * cd /home/ducanh/.agenthub/worktrees/xfarm/ops-backup && BACKUP_KEEP=7 ./scripts/backup.sh >> /var/log/xfarm-backup.log 2>&1
```

### 5.2. Sao lưu Mỗi 6 Giờ (Cho Môi trường Tần suất Giao dịch Cao)
Thực hiện sao lưu 4 lần một ngày (vào lúc 00:00, 06:00, 12:00, 18:00) và giữ lại 28 bản (tương đương 7 ngày gần nhất):

```cron
# XFarm 6-hourly Backup
0 0,6,12,18 * * * cd /home/ducanh/.agenthub/worktrees/xfarm/ops-backup && BACKUP_KEEP=28 ./scripts/backup.sh >> /var/log/xfarm-backup.log 2>&1
```

### 5.3. Gợi ý Đẩy bản Sao lưu lên Offsite Storage (Cloud S3 / GCS)
Sau khi sao lưu cục bộ hoàn tất, nên có thêm bước đồng bộ thư mục `backups/` lên Cloud Storage bên ngoài để phòng ngừa thảm họa hỏng ổ cứng máy chủ:

```bash
# Ví dụ đẩy lên AWS S3 riêng biệt hoặc Google Cloud Storage:
aws s3 sync /path/to/xfarm/backups/ s3://my-company-xfarm-offsite-backups/ --delete
```

---

## 6. Quy trình Kiểm tra Định kỳ Bản Sao lưu (Verification Procedure)

Một bản sao lưu chỉ có giá trị khi nó có thể khôi phục thành công. Khuyến nghị thực hiện kiểm tra diễn tập định kỳ hàng tháng theo các bước sau:

1. **Kiểm tra tính toàn vẹn của tệp dump cơ sở dữ liệu:**
   ```bash
   docker exec -i xfarm_postgres pg_restore -l < backups/xfarm-YYYYmmdd-HHMM/db.dump | head -n 20
   ```
   *Nếu hiển thị danh sách các bảng và index mà không báo lỗi archive, file dump hoàn toàn hợp lệ.*

2. **Kiểm tra danh sách tệp media:**
   ```bash
   tar -tzf backups/xfarm-YYYYmmdd-HHMM/media.tar.gz | head -n 20
   ```

3. **Diễn tập khôi phục tự động vào database kiểm thử:**
   ```bash
   # Bước a: Khôi phục vào database tạm xfarm_restore_test
   RESTORE_DATABASE=xfarm_restore_test ./scripts/restore.sh backups/xfarm-YYYYmmdd-HHMM

   # Bước b: Đối chiếu số lượng bản ghi giữa database chính và database khôi phục
   docker exec xfarm_postgres psql -U xfarm -d xfarm_restore_test -c "
     SELECT 'users' as tbl, count(*) FROM users
     UNION ALL SELECT 'cycles', count(*) FROM cycles
     UNION ALL SELECT 'activities', count(*) FROM activities;
   "

   # Bước c: Xóa database tạm sau khi kiểm tra xong
   docker exec xfarm_postgres psql -U xfarm -d postgres -c "DROP DATABASE xfarm_restore_test;"
   ```

---

## 7. Quy trình Khôi phục Khi Gặp Sự cố (Disaster Recovery Runbook)

Khi xảy ra sự cố hỏng dữ liệu, mã độc tấn công hoặc thao tác nhầm trên môi trường sản xuất:

1. **Bước 1: Cách ly và tạm dừng tiếp nhận dữ liệu mới**
   - Đặt Web frontend về trang bảo trì (Maintenance Mode) hoặc tạm dừng backend API để ngăn chặn ghi dữ liệu mới không đồng nhất:
     ```bash
     # Tạm ngưng API service nếu đang chạy qua systemd / docker / pm2
     ```
2. **Bước 2: Lựa chọn bản sao lưu an toàn**
   - Kiểm tra danh sách bản sao lưu trong `backups/`:
     ```bash
     ls -l backups/
     cat backups/xfarm-YYYYmmdd-HHMM/manifest.json
     ```
3. **Bước 3: Thực thi khôi phục**
   ```bash
   RESTORE_DATABASE=xfarm_main ./scripts/restore.sh backups/xfarm-YYYYmmdd-HHMM --yes
   ```
4. **Bước 4: Kiểm tra tính sẵn sàng của dữ liệu**
   - Kiểm tra các bảng cốt lõi (Người dùng, Mùa vụ, Nhật ký công việc, Tồn kho).
   - Kiểm tra hình ảnh/media trên MinIO Console hoặc giao diện web.
5. **Bước 5: Mở lại hệ thống cho người dùng**
   - Bật lại backend API và Web frontend.
   - Theo dõi log hệ thống (`logs`, NestJS API logs) trong 30 phút đầu sau khôi phục.
