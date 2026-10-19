# Hướng Dẫn Sử Dụng Phân Hệ: Lịch Nông Vụ

Phân hệ **Lịch** (`/admin/calendar`) là công cụ lập kế hoạch và trực quan hóa toàn bộ hoạt động sản xuất trên một giao diện lịch tháng quen thuộc. Quản lý trang trại có thể nhìn tổng thể lịch gieo trồng, thời điểm thu hoạch dự kiến và các công việc chăm sóc hằng ngày của tất cả các khu vực.

---

## 1. Mục đích sử dụng

- **Bức tranh tổng thể về thời vụ**: Giúp người quản lý nắm bắt nông trại đang có những mùa vụ nào đang bắt đầu, đang ở giai đoạn chăm sóc hay chuẩn bị thu hoạch trong tháng.
- **Điều phối nhân lực và máy móc**: Tránh tình trạng trùng lặp lịch thu hoạch hoặc quá tải công việc vào cùng một thời điểm giữa các phân khu.
- **Tra cứu lịch sử và kế hoạch tương lai**: Dễ dàng xem lại các đợt bón phân, phun thuốc đã làm trong quá khứ và theo dõi các mốc hoàn thành vụ mùa sắp tới.

---

## 2. Quy ước màu sắc và ký hiệu trên Lịch

Để người dùng dễ dàng nhận diện nhanh chóng mà không cần đọc nhiều chữ, XFarm quy ước hệ thống màu sắc chuẩn theo từng loại mùa vụ:

| Loại mùa vụ | Mã màu nhận diện | Chấm chỉ thị | Biểu tượng mốc mùa vụ |
|---|---|:---:|---|
| **Trồng trọt (CROP)** | Xanh lá cây (Emerald) | 🟢 | Cờ bắt đầu vụ (Màu xanh) |
| **Chăn nuôi (LIVESTOCK)** | Vàng cam (Amber) | 🟡 | Tam giác cảnh báo dự kiến xong (Màu vàng) |
| **Thủy sản (AQUA)** | Xanh dương (Sky Blue) | 🔵 | Vòng tròn tích kết thúc vụ (Màu tím) |
| **Việc chung / Khác** | Màu xám (Slate) | ⚪ | — |

---

## 3. Các bước thao tác chính

### Bước 1: Xem lịch tổng thể nông trại theo tháng

1. Nhấp chọn mục **Lịch** trên thanh menu bên trái.
2. Màn hình hiển thị lưới lịch tháng chuẩn quốc tế với 7 cột (từ **Thứ 2** đến **Chủ nhật**).
3. **Thanh công cụ điều hướng tháng** ở góc trên bên trái:
   - Nhấn nút **Mũi tên trái (◀)**: Quay lại xem tháng trước.
   - Nhấn nút **Mũi tên phải (▶)**: Chuyển sang xem tháng sau.
   - Nhấn nút **Hôm nay**: Quay nhanh về ngày và tháng hiện tại của ngày hôm nay (ngày hôm nay được đánh dấu bằng vòng tròn màu xanh lá nổi bật).

---

### Bước 2: Lọc sự kiện theo Khu/lô và Loại vụ

Nếu nông trại có quy mô lớn với hàng chục khu vực canh tác, bạn có thể lọc bớt dữ liệu để dễ quan sát:
1. **Lọc theo Khu/lô**: Nhấp vào ô chọn *Tất cả khu/lô* ở góc trên bên phải lịch. Chọn đích danh một khu đất (ví dụ: `Vườn bưởi da xanh (KHU-A)`) để chỉ xem các công việc và vụ mùa thuộc khu vực đó.
2. **Lọc theo Loại mùa vụ**: Nhấp vào ô chọn *Tất cả loại vụ* để lọc riêng:
   - Chỉ xem các vụ *Trồng trọt*
   - Chỉ xem các vụ *Chăn nuôi*
   - Chỉ xem các vụ *Thủy sản*

---

### Bước 3: Đọc hiểu các mốc sự kiện trên ô ngày

Mỗi ô ngày trên lưới lịch cung cấp các thông tin trực quan:
- **Số ngày trong tháng**: Hiển thị ở góc trên mỗi ô. Các ngày thuộc tháng trước hoặc tháng sau sẽ có màu xám mờ.
- **Số lượng công việc**: Một con số nhỏ hiển thị tổng số hoạt động diễn ra trong ngày đó.
- **Hàng chấm màu (Indicator Dots)**: Thể hiện cơ cấu các loại công việc trong ngày (ví dụ: có 2 chấm xanh lá và 1 chấm vàng nghĩa là ngày đó có 2 việc trồng trọt và 1 việc chăn nuôi).
- **Thẻ mốc sự kiện mùa vụ (Badge)**: Hiển thị tóm tắt tên mã vụ và tính chất mốc thời gian:
  - `MãVụ: Bắt đầu`: Ngày chính thức xuống giống hoặc thả con giống.
  - `MãVụ: Dự kiến xong`: Hạn chót dự kiến kết thúc hoặc bắt đầu đợt thu hoạch.
  - `MãVụ: Kết thúc`: Ngày đã đóng vụ mùa thành công.

---

### Bước 4: Xem chi tiết công việc trong ngày (Bảng thông tin bên phải)

1. Nhấp chuột vào bất kỳ ô ngày nào bạn muốn xem trên lưới lịch. Ô ngày được chọn sẽ có viền xanh lá đậm bao quanh.
2. Nhìn sang **Bảng chi tiết ngày** ở cột bên phải màn hình:
   - Hiển thị ngày tháng đầy đủ theo định dạng tiếng Việt (ví dụ: *Thứ Năm, ngày 19 tháng 10 năm 2026*).
   - **Mục "Sự kiện mùa vụ"**: Liệt kê các mốc mùa vụ bắt đầu hoặc đến hạn trong ngày.
   - **Mục "Nhật ký canh tác"**: Liệt kê chi tiết từng hoạt động đã thực hiện hoặc được lên lịch trong ngày:
     - Biểu tượng công việc (🌱 Gieo hạt, 💧 Tưới nước, 🧪 Bón phân, 🌾 Cho ăn...).
     - Tên công việc và mùa vụ liên quan.
     - Vị trí khu/lô thực hiện.
     - Người ghi chép và thời gian cụ thể.

---

### Bước 5: Điều hướng nhanh sang chi tiết Mùa vụ hoặc Nhật ký

Từ bảng chi tiết ngày bên phải:
- Bạn có thể nhấp chuột trực tiếp vào tên mùa vụ để mở trang chi tiết mùa vụ đó (`/admin/cycles/[id]`) nhằm kiểm tra toàn bộ dòng thời gian hoặc chuyển trạng thái mùa vụ.
- Nhấp vào hoạt động để xem chi tiết ghi chép thông số và hình ảnh thực tế.

---

## 4. Lưu ý và Lỗi thường gặp

- **Ô ngày hiển thị dấu chấm thay vì tên công việc**: Khi một ngày có quá nhiều hoạt động (từ 3 công việc trở lên), màn hình sẽ ưu tiên hiển thị các chấm màu và thẻ rút gọn để tránh làm vỡ khung lịch. Bạn chỉ cần **bấm vào ô ngày đó**, toàn bộ danh sách công việc sẽ hiển thị đầy đủ, chi tiết ở khung bên phải.
- **Không thấy sự kiện trên lịch**: Nếu bạn vừa ghi một nhật ký mới nhưng không thấy xuất hiện trên lịch, hãy kiểm tra lại bộ lọc *Khu/lô* hoặc *Loại vụ* ở góc trên xem có đang để lọc riêng khu khác hay không. Hãy đưa về *Tất cả khu/lô* và *Tất cả loại vụ*.
- **Lịch chỉ xem (Read-only)**: Giao diện lịch hiện tại được thiết kế để theo dõi và đối chiếu tiến độ. Để tạo mới mùa vụ hoặc ghi nhật ký, bạn thực hiện tại phân hệ **Mùa vụ** (`/admin/cycles`) hoặc **Nhật ký** (`/admin/activities`).
