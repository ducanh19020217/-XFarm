# Hướng Dẫn Sử Dụng Phân Hệ: Cảnh Báo Thông Minh

Phân hệ **Cảnh báo** (`/admin/alerts`) hoạt động như một "trợ lý số" liên tục giám sát tình trạng kho bãi và hạn dùng của vật tư, nông sản 24/7. Hệ thống tự động phát hiện rủi ro và thông báo kịp thời cho ban quản lý để tránh tình trạng đứt gãy sản xuất hoặc thất thoát do hàng hóa quá hạn.

---

## 1. Mục đích sử dụng

- **Chủ động phòng ngừa rủi ro đứt nguồn vật tư**: Phát hiện ngay khi số lượng phân bón, hạt giống hay thức ăn chạm ngưỡng an toàn tối thiểu để kịp thời lập đơn mua hàng mới.
- **Giảm thiểu thất thoát hàng quá hạn**: Báo trước các lô hàng chuẩn bị hết hạn để ưu tiên xuất dùng trước (hoặc thanh lý), tránh để hàng tồn bị hỏng trong kho.
- **Theo dõi tức thì qua biểu tượng Chuông**: Không cần phải lục tìm sổ sách kiểm kê, chỉ cần nhìn số lượng thông báo trên thanh tiêu đề là biết được các vấn đề cần xử lý.

---

## 2. Các loại cảnh báo trong hệ thống

Hệ thống XFarm hiện phân loại cảnh báo theo 3 mức độ nhận diện rõ ràng:

| Loại cảnh báo | Mã hệ thống | Màu sắc hiển thị | Ý nghĩa & Hướng xử lý |
|---|:---:|:---:|---|
| **Tồn kho thấp** | `LOW_STOCK` | Màu vàng (Warning) | Số lượng tồn kho của mặt hàng đã giảm xuống dưới định mức tối thiểu (`minStock`). Cần lập đơn mua hàng (PO) bổ sung. |
| **Lô sắp hết hạn** | `LOT_EXPIRING` | Màu đỏ nhạt (Destructive) | Lô vật tư/nông sản còn hạn dưới 30 ngày. Cần ưu tiên xuất kho dùng ngay theo nguyên tắc FIFO. |
| **Lô đã hết hạn** | `LOT_EXPIRED` | Màu đỏ đậm (Destructive) | Lô hàng đã quá hạn sử dụng ghi trên bao bì. Cần kiểm tra chất lượng, cách ly hoặc lập phiếu xuất hủy để không ảnh hưởng đến cây trồng/vật nuôi. |

---

## 3. Các bước thao tác chính

### Bước 1: Theo dõi Chuông thông báo trên thanh tiêu đề (Header)

1. Ở góc trên bên phải màn hình làm việc (cạnh lời chào và nút Đăng xuất), bạn sẽ thấy biểu tượng **Chuông thông báo**.
2. **Số đếm màu đỏ**: Khi có cảnh báo mới chưa đọc, một chấm đỏ kèm con số (ví dụ: `3`, `5`) sẽ xuất hiện trên quả chuông.
3. Nhấp vào biểu tượng Chuông: Một danh sách thả xuống (popup) sẽ hiển thị tóm tắt các cảnh báo mới nhất:
   - Tên cảnh báo và thời gian phát hiện.
   - Bạn có thể nhấp thẳng vào một dòng để đi tới chi tiết hoặc nhấp vào dòng chữ **Xem tất cả cảnh báo** ở dưới cùng để mở trang Quản lý Cảnh báo đầy đủ (`/admin/alerts`).

---

### Bước 2: Xem và lọc danh sách cảnh báo chi tiết

Tại màn hình **Quản lý Cảnh báo** (`/admin/alerts`):
1. Bảng dữ liệu liệt kê chi tiết:
   - **Loại cảnh báo**: Huy hiệu màu sắc giúp phân biệt loại nguy cơ.
   - **Nội dung cảnh báo**: Mô tả chi tiết (ví dụ: *Vật tư "Phân bón NPK 16-16-8" tại Kho trung tâm chỉ còn 2 bao, dưới mức tối thiểu 10 bao*).
   - **Thời gian**: Ngày giờ hệ thống phát hiện vấn đề.
   - **Trạng thái**: Đã đọc hoặc Chưa đọc (các dòng chưa đọc sẽ được làm nổi bật để dễ quan sát).
2. **Sử dụng bộ lọc linh hoạt**:
   - **Lọc theo trạng thái đọc**: Chọn *Tất cả*, *Chưa đọc* (để tập trung giải quyết các việc tồn đọng), hoặc *Đã đọc*.
   - **Lọc theo loại cảnh báo**: Chọn *Tất cả*, hoặc lọc riêng *Tồn kho thấp*, *Lô sắp hết hạn*, *Lô đã hết hạn*.

---

### Bước 3: Thao tác xử lý nhanh (Điều hướng đến kho)

1. Tại mỗi dòng cảnh báo, bạn sẽ thấy biểu tượng **Liên kết nhanh (Mũi tên chéo / External Link)** hoặc nút **Xem kho**.
2. Nhấp vào liên kết này: Hệ thống sẽ **tự động mở trang Tồn kho (`/admin/inventory`)** và lọc sẵn đúng mặt hàng hoặc đúng mã lô hàng bị cảnh báo.
3. Từ đây, Quản lý có thể:
   - Bấm vào mục Mua hàng để tạo ngay đơn đặt hàng mới nếu vật tư thiếu.
   - Bấm vào Phiếu kho để tạo phiếu xuất kho ưu tiên sử dụng lô sắp hết hạn.

---

### Bước 4: Đánh dấu đã đọc cảnh báo

1. **Đánh dấu từng cảnh báo**: Khi bạn đã nắm được thông tin hoặc đã xử lý xong một cảnh báo, nhấn vào biểu tượng **Dấu tích (Check)** ở cột Thao tác của dòng đó. Cảnh báo sẽ chuyển sang trạng thái đã đọc và số lượng trên quả chuông sẽ giảm đi 1.
2. **Đánh dấu tất cả đã đọc**: Nếu bạn muốn xóa toàn bộ thông báo chưa đọc cùng lúc:
   - Nhấn nút **Đánh dấu tất cả đã đọc** (biểu tượng 2 dấu tích) ở góc trên bên phải trang.
   - Chuông thông báo sẽ trở về trạng thái 0 cảnh báo chưa đọc.

---

### Bước 5: Kích hoạt kiểm tra kho tức thì (Chỉ dành cho Chủ trang trại)

- Thông thường, hệ thống tự động chạy tác vụ kiểm tra kho định kỳ theo lịch trình.
- Tuy nhiên, sau khi vừa hoàn thành một đợt nhập kho lớn hoặc xuất kho số lượng nhiều, **Chủ trang trại (OWNER)** có thể chủ động kích hoạt kiểm tra ngay:
  1. Tại trang Quản lý Cảnh báo, nhấn nút **Kiểm tra kho ngay** (biểu tượng Tam giác Play).
  2. Hệ thống sẽ quét lại toàn bộ dữ liệu số dư và hạn dùng trên tất cả các kho bãi trong vòng vài giây.
  3. Danh sách cảnh báo sẽ được cập nhật tức thì theo hiện trạng kho mới nhất.

---

## 4. Lưu ý và Lỗi thường gặp

- **Phân quyền truy cập**: Phân hệ Cảnh báo chỉ dành riêng cho **Chủ trang trại (OWNER)** và **Quản lý (MANAGER)**. Nhân viên kế toán, bán hàng và công nhân không có quyền truy cập vào mục này.
- **Đã nhập hàng nhưng cảnh báo cũ vẫn hiện**: Khi bạn vừa nhập thêm hàng vào kho để bù cho lượng tồn kho bị thấp, bản ghi cảnh báo trước đó vẫn lưu trong lịch sử cho đến khi bạn bấm **Đánh dấu đã đọc**. Để làm mới trạng thái cảnh báo ngay lập tức, Chủ trại có thể bấm nút **Kiểm tra kho ngay**.
- **Không nên bỏ qua cảnh báo Lô đã hết hạn**: Tuyệt đối không xuất kho các lô hàng đã chuyển sang cảnh báo `LOT_EXPIRED` cho cây trồng hay vật nuôi mà không qua kiểm định chất lượng, nhằm tránh gây hại cho sinh trưởng của nông trại.
