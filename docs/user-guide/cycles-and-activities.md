# Hướng Dẫn Sử Dụng Phân Hệ: Mùa Vụ & Nhật Ký Canh Tác Điện Tử

Phân hệ **Mùa vụ** (`/admin/cycles`) và **Nhật ký** (`/admin/activities`) là trái tim vận hành của nông trại XFarm. Phân hệ này cho phép số hóa toàn bộ vòng đời sản xuất cây trồng, vật nuôi, thủy sản từ lúc bắt đầu cho đến khi thu hoạch; đồng thời ghi chép nhật ký điện tử minh bạch phục vụ truy xuất nguồn gốc và tính toán chi phí sản xuất.

---

## 1. Mục đích sử dụng

- **Quản lý kế hoạch và tiến độ sản xuất**: Thiết lập kế hoạch mùa vụ cho từng khu đất hoặc ao/chuồng cụ thể, kiểm soát thời gian bắt đầu và ngày dự kiến thu hoạch.
- **Nhật ký điện tử chuẩn hóa**: Thay thế sổ tay ghi chép truyền thống bằng nhật ký số trên máy tính và điện thoại. Dữ liệu được lưu trữ tập trung, không thể thất lạc.
- **Minh bạch thông tin truy xuất**: Cho phép chọn lọc các khâu chăm sóc đạt chuẩn hữu cơ/VietGAP để công khai cho người tiêu dùng tra cứu qua mã QR tem nhãn.
- **Kiểm soát chi phí và hao hụt**: Tự động tổng hợp chi phí ngày công lao động và vật tư tiêu hao (phân bón, thuốc sinh học, thức ăn) theo từng mùa vụ.

---

## 2. Quy trình vòng đời một mùa vụ

Một mùa vụ tại XFarm trải qua 4 giai đoạn chính theo sơ đồ luồng:

```
[1. Kế hoạch (PLANNED)] 
        ↓  (Bấm "Bắt đầu hoạt động")
[2. Đang hoạt động (ACTIVE)]  ←→  [Ghi chép Nhật ký canh tác hằng ngày]
        ↓  (Bấm "Bắt đầu thu hoạch")
[3. Đang thu hoạch (HARVESTING)]  ←→  [Tạo Lô thu hoạch & Cấp mã QR]
        ↓  (Bấm "Đóng mùa vụ")
[4. Đã đóng (CLOSED)]  (Kết thúc vụ, chốt tổng chi phí & sản lượng)
```
*(Trong trường hợp gặp rủi ro thiên tai dịch bệnh hoặc hủy bỏ, mùa vụ có thể chuyển sang trạng thái `Đã hủy - CANCELLED`)*.

---

## 3. Các bước thao tác chính

### Bước 1: Xem và lọc danh sách mùa vụ

1. Nhấp chọn mục **Mùa vụ** trên thanh menu bên trái.
2. Màn hình danh sách hiển thị các thông tin: Mã mùa vụ, Tên mùa vụ, Loại mùa vụ (Trồng trọt, Chăn nuôi, Thủy sản), Khu/lô canh tác, Ngày bắt đầu, Ngày dự kiến thu hoạch và Trạng thái.
3. Bộ lọc tiện ích:
   - **Ô tìm kiếm**: Gõ tên mùa vụ hoặc mã mùa vụ để tìm nhanh.
   - **Lọc theo loại vụ**: *Trồng trọt (CROP)*, *Chăn nuôi (LIVESTOCK)*, *Thủy sản (AQUA)*.
   - **Lọc theo trạng thái**: *Kế hoạch, Đang hoạt động, Đang thu hoạch, Đã đóng, Đã hủy*.

---

### Bước 2: Tạo mới một mùa vụ sản xuất

*(Dành cho Chủ trang trại và Quản lý)*

1. Tại trang danh sách Mùa vụ, nhấn nút **Thêm mùa vụ** (hoặc **Tạo mùa vụ mới**).
2. Điền các trường thông tin trong hộp thoại:
   - **Mã mùa vụ**: Mã định danh (ví dụ: `VU-LUA-2026-01`, `VU-TOM-02`, `VU-RAU-A1`).
   - **Tên mùa vụ**: Tên gọi rõ ràng (ví dụ: *Vụ dưa lưới vụ Xuân 2026*, *Nuôi tôm thẻ chân trắng ao 03*).
   - **Loại mùa vụ**: Chọn 1 trong 3 nhóm:
     - 🌱 *Trồng trọt (CROP)*
     - 🐄 *Chăn nuôi (LIVESTOCK)*
     - 🐟 *Thủy sản (AQUA)*
   - **Khu/lô canh tác**: Chọn vị trí lô đất, nhà màng hoặc chuồng/ao trong danh sách khu/lô đã tạo.
   - **Ngày bắt đầu**: Ngày xuống giống, thả cá giống hoặc gieo hạt.
   - **Ngày dự kiến thu hoạch**: Thời gian ước tính hoàn thành vụ mùa để hệ thống nhắc nhở trên lịch.
   - **Ghi chú**: Ghi thêm thông tin giống cây/con, nguồn gốc giống, mật độ gieo trồng.
3. Nhấn nút **Lưu** để khởi tạo mùa vụ. Mùa vụ mới sẽ ở trạng thái mặc định là **Kế hoạch (PLANNED)**.

---

### Bước 3: Quản lý trạng thái mùa vụ (Chuyển đổi vòng đời)

1. Nhấp vào tên mùa vụ trên bảng danh sách để mở trang chi tiết mùa vụ (`/admin/cycles/[id]`).
2. Trên đầu trang chi tiết, hệ thống cung cấp các nút chuyển trạng thái phù hợp với từng giai đoạn:
   - Khi vụ mùa chuẩn bị xuống giống thực tế: Nhấn nút **Bắt đầu hoạt động** → Trạng thái chuyển sang `ACTIVE`.
   - Khi cây trồng ra trái chín hoặc tôm cá đạt kích cỡ thu hoạch: Nhấn nút **Bắt đầu thu hoạch** → Trạng thái chuyển sang `HARVESTING`.
   - Khi đã thu hoạch xong và dọn dẹp vệ sinh đồng ruộng: Nhấn nút **Đóng mùa vụ** → Trạng thái chuyển sang `CLOSED`.
   - Trường hợp bất khả kháng phải hủy bỏ: Nhấn nút **Hủy mùa vụ** → Trạng thái chuyển sang `CANCELLED`.
3. Mỗi lần bấm chuyển trạng thái, một hộp thoại xác nhận sẽ hiện lên để đảm bảo bạn không thao tác nhầm lẫn.

---

### Bước 4: Ghi chép nhật ký canh tác điện tử

Nhật ký có thể ghi bằng 2 cách:
- **Cách 1**: Tại trang chi tiết mùa vụ (`/admin/cycles/[id]`), nhấn nút **Ghi nhật ký**.
- **Cách 2**: Truy cập phân hệ **Nhật ký** (`/admin/activities`) từ menu chính và nhấn nút **Ghi nhật ký mới**.

**Các bước điền nội dung nhật ký:**
1. **Mùa vụ & Khu/lô**: Chọn mùa vụ và khu đất thực hiện công việc.
2. **Thời gian thực hiện**: Chọn ngày giờ diễn ra thao tác thực tế.
3. **Loại hoạt động**: Chọn loại công việc phù hợp:
   - Trồng trọt: *Gieo hạt, Trồng cây, Bón phân, Phun thuốc, Tưới nước, Tỉa cành, Làm cỏ, Thu hoạch, Vệ sinh*.
   - Chăn nuôi / Thủy sản: *Cho ăn, Tiêm phòng, Điều trị, Kiểm tra nước, Thả giống, Cân mẫu, Hao hụt*.
4. **Nhập các chỉ số kỹ thuật chuyên biệt (tùy theo loại công việc)**:
   - Bón phân / Phun thuốc: Tên sản phẩm/chế phẩm sinh học, Liều lượng pha chế.
   - Tưới nước: Lượng nước (lít), Thời gian tưới (phút).
   - Kiểm tra nước ao: Độ pH, Chỉ số oxy hòa tan (DO mg/L), Nhiệt độ (°C), Độ mặn, Khí độc NH3.
   - Chăn nuôi: Lượng thức ăn (kg), Cân nặng bình quân mẫu (g hoặc kg), Số lượng đầu con hao hụt, nguyên nhân.
5. **Ghi chú chi tiết**: Mô tả tình trạng thực tế ngoài đồng (ví dụ: *Cây phát triển tốt, lá xanh đậm, không thấy sâu rầy*).
6. **Đính kèm hình ảnh**: Bấm chọn ảnh chụp từ điện thoại hoặc tải ảnh chụp hiện trường để làm bằng chứng xác thực.
7. **Tích chọn "Công khai truy xuất"**: Nếu công việc này tuân thủ quy trình an toàn sinh học và bạn muốn hiển thị trên trang tra cứu cho người mua hàng xem, hãy tích vào ô **Công khai truy xuất**.
8. Nhấn **Lưu nhật ký**.

---

### Bước 5: Xem dòng thời gian (Timeline) và Chi phí nhân công mùa vụ

Tại trang chi tiết mùa vụ (`/admin/cycles/[id]`):
- **Dòng thời gian (Timeline)**: Hiển thị toàn bộ lịch sử các hoạt động đã diễn ra theo thứ tự ngày tháng trực quan (có biểu tượng và màu sắc sinh động). Bấm vào từng hoạt động để xem chi tiết ảnh chụp và các thông số đo đạc.
- **Thống kê chi phí nhân công**: Hiển thị tổng số giờ công lao động và tiền công đã phát sinh cho mùa vụ này (được tổng hợp tự động từ phân hệ Chấm công). Thông tin này chỉ hiển thị cho Chủ trại, Quản lý và Kế toán để bảo mật dữ liệu tài chính.

---

## 4. Lưu ý và Lỗi thường gặp

- **Không thể ghi nhật ký cho mùa vụ đã đóng**: Khi mùa vụ đã chuyển sang trạng thái `Đã đóng (CLOSED)` hoặc `Đã hủy (CANCELLED)`, nút ghi nhật ký sẽ bị vô hiệu hóa để bảo vệ tính toàn vẹn dữ liệu. Nếu cần ghi bổ sung do quên, Quản lý phải mở lại mùa vụ trước.
- **Chuyển trạng thái nhảy cóc**: Hệ thống không cho phép chuyển thẳng từ `Kế hoạch` sang `Đã đóng` mà không qua bước `Hoạt động`. Quy trình phải đi theo đúng trình tự tự nhiên của nông vụ.
- **Nhật ký chưa hiện trên tem QR**: Khách hàng quét mã QR chỉ thấy những nhật ký nào được tích chọn ô **Công khai truy xuất**. Hãy kiểm tra lại nhật ký đó xem đã được bật công khai chưa.
- **Vật tư trừ kho**: Khi ghi nhật ký có khai báo vật tư lấy từ kho, cần đảm bảo kho đã được nhập hàng trước đó. Nếu kho hết hàng, hệ thống sẽ cảnh báo không đủ số lượng tồn khả dụng.
