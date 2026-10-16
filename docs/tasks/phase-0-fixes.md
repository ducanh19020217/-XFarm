# Task: phase-0-fixes – Sửa lỗi sau review GĐ 0

Đọc trước: `AGENTS.md`. Làm trên nhánh **`phase-0-foundation`** (nhánh đã có).
Mỗi lỗi một commit riêng, message theo Conventional Commits (`fix(auth): …`).
Không dồn tất cả vào một commit như lần trước.
Khi xong tạo `docs/tasks/phase-0-fixes.DONE`. Nếu bị chặn thì tạo `.BLOCKED`.

Môi trường: `source ~/.nvm/nvm.sh && nvm use 22`.

## Lỗi cần sửa (xếp theo mức độ)

### 1. [Cao] Refresh đồng thời làm người dùng bị đăng xuất
- **Vị trí:** `apps/web/src/lib/api.ts`, `apps/api/src/modules/auth/auth.service.ts` (`refresh`).
- **Tình huống lỗi:**
  1. Access token hết hạn.
  2. Trang `/admin/users` gọi song song 2 request (ví dụ `/auth/me` và `/users`). Cả hai nhận 401.
  3. Cả hai cùng gọi `/auth/refresh` với **cùng** một refresh token.
  4. Request đến sau thấy token đã bị revoke, nên coi đó là "token reuse" và revoke toàn bộ phiên. Người dùng bị đăng xuất.
- Ngoài ra, ở server, bước `findFirst` rồi `update` không nguyên tử. Hai request đến cùng lúc có thể cùng tạo ra token mới.
- **Yêu cầu sửa:**
  - **Client:** refresh dạng single-flight. Tại mọi thời điểm chỉ có tối đa 1 request `/auth/refresh` đang chạy; các request bị 401 khác chờ chung promise đó rồi thử lại.
  - **Server:** revoke token một cách nguyên tử bằng `updateMany({ where: { id, revokedAt: null }, data: { revokedAt } })`, và chỉ tiếp tục khi `count === 1`. Toàn bộ thao tác revoke cũ + tạo mới đặt trong `prisma.$transaction`.
  - **Server:** thêm **grace period 30 giây**. Nếu token vừa bị revoke trong vòng 30 giây trước đó, trả 401 bình thường, **không** revoke toàn bộ phiên. Chỉ coi là reuse khi token bị revoke đã lâu hơn 30 giây.
- **Test bắt buộc:**
  - e2e: gửi 2 request refresh song song với cùng một token. Phiên không bị hủy: refresh token mới vẫn dùng được.
  - e2e: dùng lại token đã revoke hơn 30 giây thì toàn bộ phiên bị hủy (giả lập bằng cách lùi `revokedAt` trong DB).
  - Vitest: 3 request cùng nhận 401 thì `/auth/refresh` chỉ được gọi đúng 1 lần.

### 2. [Cao] Token bị trả trong JSON, mất tác dụng của httpOnly cookie
- **Vị trí:** `auth.controller.ts`, hai hàm `login` và `refresh`.
- **Vấn đề:** response body có `accessToken` và `refreshToken`. Khi đó JavaScript (và mã độc XSS) đọc được token, nên việc lưu token trong cookie httpOnly trở nên vô nghĩa.
- **Yêu cầu sửa:** bỏ cả hai trường khỏi response, chỉ trả `{ message, user }`. Cập nhật e2e test để đọc token từ header `set-cookie`.
- Bỏ luôn khả năng nhận `refreshToken` qua body (`RefreshTokenDto`) trong `refresh` và `logout`. Chỉ đọc từ cookie.

### 3. [Cao] Người dùng bị đá về `/login` sau 15 phút dù refresh token còn hạn
- **Vị trí:** `apps/web/src/middleware.ts`.
- **Vấn đề:** cookie `refresh_token` có `path=/api/v1/auth`, nên trình duyệt không gửi nó khi mở `/admin`. Khi `access_token` hết hạn sau 15 phút, middleware không thấy cookie nào và chuyển người dùng về `/login`, dù refresh token vẫn còn hạn 7 ngày.
- **Yêu cầu sửa:**
  - API set thêm cookie `session=1`: **không** httpOnly, `path=/`, cùng thời hạn với refresh token, chỉ dùng làm cờ báo "có phiên". Middleware kiểm tra `access_token || session`.
  - Logout xóa cả cookie `session`.
  - Khi trang admin gọi API bị 401 và refresh thất bại thì chuyển về `/login`.

### 4. [Trung bình] Audit log lưu refresh token dạng thô
- **Vị trí:** `audit-log.interceptor.ts`.
- **Vấn đề:** chỉ che `password` và `passwordHash` ở cấp đầu tiên của body. Khi gọi `/auth/refresh` hoặc `/auth/logout` kèm `refreshToken` trong body, token thô bị ghi vào DB.
- **Yêu cầu sửa:**
  - Che **đệ quy** mọi key có tên khớp `/pass|token|secret|authorization/i`.
  - **Không** ghi audit cho `/auth/*`.
  - Thêm unit test cho hàm che dữ liệu.

### 5. [Trung bình] `POST /media` tin `key` và `url` do client gửi lên
- **Vị trí:** `media.service.ts`, hàm `create`.
- **Vấn đề:** client gửi URL bất kỳ, kể cả trỏ ra ngoài, và URL đó được lưu thẳng. Sau này website hiển thị URL này thì thành lỗ hổng.
- **Yêu cầu sửa:**
  - Chỉ nhận `key`. Kiểm tra key khớp `^uploads/\d+-[0-9a-f]{16}\.[a-z0-9]{1,5}$`.
  - Kiểm tra object có tồn tại trong bucket (`HeadObject`), rồi **server tự dựng `url`**.
  - Lấy `mime` và `size` từ kết quả `HeadObject`, không lấy từ client.
  - Ở bước presign: extension lấy từ mime theo whitelist (`image/jpeg→jpg`, `png`, `webp`, `pdf`), không lấy từ tên file.

### 6. [Thấp] Các điểm nhỏ
- `login`: kiểm tra mật khẩu **trước**, rồi mới kiểm tra `isActive`. Hiện tại có thể dò ra tài khoản bị khóa mà không cần biết mật khẩu. Khi email không tồn tại vẫn chạy `argon2.verify` trên một hash giả để thời gian phản hồi đồng đều.
- Cookie `secure` lấy theo `NODE_ENV === 'production'`, không hardcode `false`. Gom phần set/clear cookie vào một helper dùng chung, tránh lặp lại 3 lần.
- `env.config.ts`: `JWT_SECRET` bắt buộc dài tối thiểu 32 ký tự. Cập nhật `.env.example` theo.

## Nghiệm thu
- `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` đều đạt. Ghi số test trước và sau khi sửa vào file `.DONE`.
- Trong file `.DONE`, liệt kê từng lỗi 1–6 kèm hash commit đã sửa lỗi đó.
