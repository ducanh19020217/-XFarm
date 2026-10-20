# Hướng Dẫn Sử Dụng Phân Hệ: Du Lịch Trải Nghiệm & Đặt Chỗ

Phân hệ **Du lịch** gồm khu vực quản trị tour (`/admin/tours`), lịch suất trải nghiệm của từng tour và danh sách đặt chỗ (`/admin/tours/bookings`). Khách tham quan đặt chỗ tại website công khai; nhân viên tiếp nhận, xác nhận, thu tiền và hoàn tất booking trong hệ thống.

## 1. Mục đích sử dụng

- Đưa các chương trình tham quan, làm nông và trải nghiệm sinh thái lên website.
- Chủ động tạo lịch suất theo ngày, thứ trong tuần, khung giờ và sức chứa.
- Kiểm soát số khách còn chỗ; hệ thống giữ chỗ trong giao dịch để không vượt sức chứa khi nhiều khách đặt cùng lúc.
- Theo dõi trạng thái booking, thanh toán và doanh thu tour.

## 2. Quản lý tour trong trang quản trị

### 2.1. Tạo và chỉnh sửa tour (`/admin/tours`)

1. Mở menu **Du lịch** và nhấn **Thêm tour**.
2. Nhập các thông tin:
   - **Tên tour** và **Slug** dùng trong đường dẫn công khai. Slug được gợi ý tự động từ tên nhưng có thể chỉnh sửa.
   - **Mô tả** bằng trình soạn thảo nội dung.
   - **Thời lượng (phút)**, **giá người lớn**, **giá trẻ em** và **sức chứa mỗi suất**.
   - Ảnh minh họa và thứ tự hiển thị nếu cần.
3. Nhấn **Lưu**. Tour mới có thể để ở trạng thái nháp.
4. Khi nội dung và giá đã sẵn sàng, nhấn **Xuất bản**. Tour xuất bản mới xuất hiện ở trang `/tour` và có thể được khách đặt chỗ. Dùng **Ẩn xuất bản** khi tạm dừng nhận đăng ký.

Chỉ **OWNER** và **MANAGER** được tạo, sửa, xuất bản hoặc xóa tour. Không xóa được tour đã phát sinh booking; hãy ẩn xuất bản để giữ lịch sử.

### 2.2. Tạo lịch suất tour

1. Nhấn tên tour trong danh sách để mở chi tiết. Màn hình có thể xem lịch theo **Tuần** hoặc **Tháng**.
2. Dùng **Tạo hàng loạt suất** khi muốn lập lịch dài ngày:
   - Chọn ngày bắt đầu và ngày kết thúc.
   - Chọn các thứ trong tuần, ví dụ **Thứ 7** và **Chủ nhật**.
   - Thêm một hoặc nhiều khung giờ, ví dụ `08:00` và `14:00`.
   - Nhập sức chứa rồi nhấn tạo.
3. Dùng **Thêm suất** để tạo một ngày/giờ riêng lẻ. Có thể sửa sức chứa hoặc tắt suất sau đó.
4. Theo dõi số **đã đặt / sức chứa** trên lịch. Không giảm sức chứa xuống thấp hơn số khách đã đặt.

## 3. Luồng đặt chỗ của khách

Khách truy cập `/tour`, chọn một tour đã xuất bản rồi mở trang chi tiết `/tour/<slug>`. Tại phần **Đặt chỗ**, khách:

1. Chọn ngày và suất còn chỗ.
2. Nhập họ tên, số điện thoại, email (nếu muốn), số người lớn và trẻ em.
3. Kiểm tra tổng tiền, đồng ý thông tin và gửi đặt chỗ.
4. Nhận mã booking tại trang xác nhận `/tour/dat-cho-thanh-cong/<ma-booking>`.

Sức chứa được kiểm tra ngay lúc tạo booking. Nếu suất vừa hết chỗ, khách cần chọn suất khác. Email xác nhận được gửi khi môi trường SMTP/Mailpit đã được cấu hình.

## 4. Tiếp nhận và xử lý booking (`/admin/tours/bookings`)

1. Mở menu **Đặt chỗ tour**. Có thể lọc theo tour, suất, khoảng ngày, trạng thái, trạng thái thanh toán hoặc tìm theo mã/tên/số điện thoại.
2. Mở một dòng để xem chi tiết khách, số người, suất tour, tổng tiền và các khoản đã thu.
3. Với booking mới, kiểm tra thông tin rồi nhấn **Xác nhận**. Khi khách hủy, dùng **Hủy**; sau khi khách tham gia xong, dùng **Hoàn tất**.
4. Nhấn **Ghi nhận thanh toán**, nhập số tiền thực nhận, phương thức (**Tiền mặt**, **Chuyển khoản**, **VNPay** hoặc **Thu khi đến**) và ghi chú nếu cần. Có thể ghi nhận nhiều lần cho đến khi đủ tiền.
5. Khi booking đã thanh toán, hệ thống tạo giao dịch thu tương ứng trong phân hệ Tài chính. Không tự tạo thêm một giao dịch thủ công cho cùng khoản tiền.

Trạng thái booking gồm **PENDING**, **CONFIRMED**, **CANCELLED**, **COMPLETED**. Trạng thái thanh toán được theo dõi riêng là **UNPAID**, **PARTIAL** hoặc **PAID**.

OWNER, MANAGER và SALES được quản lý trạng thái booking; OWNER, MANAGER, SALES và ACCOUNTANT được ghi nhận thanh toán. WORKER không truy cập phân hệ này.

## 5. Khách tự tra cứu

Khách mở **Tra cứu đặt chỗ** tại `/tour/tra-cuu`, nhập **mã booking** và **số điện thoại** đã dùng khi đặt. Chỉ cung cấp đúng hai thông tin này cho khách; không gửi ảnh màn hình danh sách booking nội bộ vì danh sách có dữ liệu của khách khác.

## 6. Lưu ý và lỗi thường gặp

- Tour chưa xuất bản hoặc suất đã tắt sẽ không xuất hiện cho khách chọn.
- Kiểm tra múi giờ Việt Nam khi tạo lịch; giờ hiển thị trên màn hình theo `Asia/Ho_Chi_Minh`.
- Nếu không gửi được email, vẫn kiểm tra mã booking trên trang xác nhận và hướng dẫn khách lưu mã để tra cứu.
- Không giảm sức chứa dưới số vé đã đặt. Nếu cần ngừng nhận khách, tắt suất thay vì xóa; suất có booking không thể xóa.
