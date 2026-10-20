# Hướng Dẫn Sử Dụng Phân Hệ: Thiết Bị, IoT & Cảm Biến

Phân hệ này gồm **Thiết bị** (`/admin/equipment`), **IoT & Cảm biến** (`/admin/iot/sensors`) và **Biểu đồ IoT** (`/admin/iot/charts`). Thiết bị dùng để quản lý tài sản và bảo trì; cảm biến gửi số đo về XFarm qua API key để người vận hành theo dõi môi trường theo khu/lô.

## 1. Quản lý thiết bị

### 1.1. Danh sách và bộ lọc (`/admin/equipment`)

Màn hình hiển thị mã, tên, loại, khu vực, giá trị, trạng thái và tình trạng bảo trì. Dùng ô tìm kiếm hoặc lọc theo **Loại**, **Trạng thái**, **Khu vực**. Các nhãn bảo trì gồm:

- **Quá hạn**: đã qua ngày bảo trì kế tiếp.
- **Đến hạn bảo trì**: còn trong khoảng cần nhắc.
- Ngày hạn tiếp theo nếu lịch vẫn còn hiệu lực.

Nhấn **Thêm thiết bị** để nhập mã, tên, loại, khu vực, ngày mua, giá trị và trạng thái. Có thể sửa thông tin từ nút **Chỉnh sửa** hoặc mở đường dẫn **Chi tiết**. OWNER và MANAGER được quản lý thiết bị; các vai trò khác chỉ xem theo quyền được cấp.

### 1.2. Lịch và nhật ký bảo trì

Trong chi tiết thiết bị (`/admin/equipment/<id>`):

1. Nhấn **Thêm lịch bảo trì**, nhập chu kỳ ngày và ngày đến hạn tiếp theo. Có thể bật/tắt lịch mà không xóa lịch sử.
2. Khi thực hiện bảo trì, nhấn **Ghi nhận bảo trì**, chọn ngày, loại bảo trì, chi phí và ghi chú.
3. Theo dõi tổng chi phí bảo trì, số lịch đang hoạt động và lịch sử các lần sửa chữa ngay trên trang chi tiết.

OWNER, MANAGER và WORKER có thể ghi nhận lần bảo trì; chỉ OWNER và MANAGER được sửa thiết bị hoặc lịch bảo trì. Nút **Chạy kiểm tra bảo trì** ở danh sách dùng để cập nhật các cảnh báo đến hạn/quá hạn.

## 2. Quản lý cảm biến (`/admin/iot/sensors`)

1. Nhấn **Thêm cảm biến**, nhập mã, tên, loại thông số, đơn vị, khu/lô và trạng thái hoạt động.
2. Khi tạo thành công, hệ thống chỉ hiển thị **API key một lần**. Sao chép khóa vào thiết bị hoặc gateway gửi dữ liệu và lưu ở nơi an toàn; không đưa khóa vào ảnh chụp hoặc tài liệu công khai.
3. Danh sách cho biết loại cảm biến, khu/lô, trạng thái **Online/Offline** và thời điểm kết nối gần nhất. Có thể tìm kiếm hoặc lọc theo khu/lô, loại và trạng thái hoạt động.
4. Dùng nút **Ngưỡng cảnh báo** để tạo quy tắc so sánh lớn hơn (`GT`) hoặc nhỏ hơn (`LT`) một ngưỡng. Có thể đặt thời gian chống lặp cảnh báo nếu biểu mẫu cung cấp.
5. Nếu khóa bị lộ, nhấn **Xoay API key**, xác nhận thao tác rồi cập nhật khóa mới trên thiết bị. Khóa cũ mất hiệu lực ngay lập tức.

Các loại thông số chuẩn gồm nhiệt độ, độ ẩm, độ ẩm đất, pH, DO, ánh sáng và loại khác. Cảm biến phải gắn với đúng khu/lô để biểu đồ và cảnh báo đến đúng người vận hành.

## 3. Gửi và kiểm tra dữ liệu IoT

Gateway gửi dữ liệu đến API `/api/v1/iot/readings` qua header `X-Sensor-Key`. Chỉ gửi giá trị số cùng thời điểm đo hợp lệ; không dùng API key của cảm biến khác. Nếu cảm biến bị khóa hoặc khóa sai, hệ thống từ chối dữ liệu.

Khi số đo vượt ngưỡng đang bật, XFarm tạo cảnh báo. Kiểm tra chuông cảnh báo ở thanh đầu trang và mở liên kết đến biểu đồ của cảm biến để xem nguyên nhân.

## 4. Xem biểu đồ (`/admin/iot/charts`)

1. Mở menu **Biểu đồ IoT**.
2. Chọn **Cảm biến đơn lẻ** rồi chọn cảm biến cần xem, hoặc chọn **Cây Khu / Lô** để xem các cảm biến thuộc một khu.
3. Chọn khoảng thời gian **24 giờ**, **7 ngày**, **30 ngày** hoặc **Tùy chọn**. Ở chế độ 24 giờ, biểu đồ tự làm mới mỗi 60 giây.
4. Đọc đường trung bình, dải min–max và các đường ngưỡng cảnh báo trên biểu đồ. Dùng nút làm mới khi cần lấy số đo mới nhất.

Với khoảng tùy chọn, chọn thời điểm bắt đầu/kết thúc và độ gộp dữ liệu phù hợp: `5 phút`, `1 giờ` hoặc `1 ngày`. Khoảng dài nên dùng độ gộp lớn hơn để biểu đồ dễ đọc.

## 5. Lưu ý vận hành

- Kiểm tra đơn vị trên cảm biến và trong cấu hình (°C, %, pH...) trước khi đặt ngưỡng; sai đơn vị làm cảnh báo sai.
- Khi cảm biến Offline, kiểm tra nguồn điện, mạng gateway và API key trước khi thay cảm biến.
- Không xóa dữ liệu đo để xử lý cảnh báo. Ghi chú nguyên nhân và thao tác khắc phục ở nhật ký thiết bị hoặc nhật ký sản xuất liên quan.
- Cảnh báo IoT chỉ phản ánh số đo nhận được; vẫn cần kiểm tra thực địa khi có dấu hiệu bất thường.
