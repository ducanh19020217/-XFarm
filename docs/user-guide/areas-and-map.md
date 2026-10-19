# Hướng Dẫn Sử Dụng Phân Hệ: Khu/Lô & Bản Đồ Số Nông Trại

Phân hệ **Khu/lô** (`/admin/areas`) giúp nông trại số hóa toàn bộ không gian đất đai, nhà màng, chuồng trại và ao nuôi. Tại đây, bạn có thể thiết lập cây phân cấp quản lý đất canh tác, theo dõi diện tích, vẽ ranh giới tọa độ địa lý (polygon) và xuất mã QR để dán tại thực địa.

---

## 1. Mục đích sử dụng

- **Chuẩn hóa không gian nông trại**: Phân chia nông trại thành các phân khu lớn, lô đất, thửa ruộng, nhà lưới, chuồng chăn nuôi hoặc ao thủy sản theo cấu trúc hình cây (Cấp 1 > Cấp 2 > Cấp 3).
- **Trực quan hóa trên bản đồ số vệ tinh**: Xem vị trí, diện tích và hình thái thực tế của từng lô đất trên nền bản đồ số.
- **Gắn kết mùa vụ và nhật ký**: Mọi hoạt động gieo trồng, chăm sóc, chăn nuôi đều gắn liền với một khu/lô cụ thể, giúp định vị chính xác nguồn gốc sản phẩm.
- **Nhận diện nhanh tại hiện trường**: Cung cấp mã QR định danh cho từng khu/lô để công nhân quét mã bằng điện thoại khi ra đồng làm việc.

---

## 2. Các bước thao tác chính

### Bước 1: Xem danh sách và tìm kiếm khu/lô

1. Trên thanh menu bên trái, nhấp chọn mục **Khu/lô**.
2. Hệ thống cung cấp **3 chế độ xem linh hoạt** ở thanh điều hướng trên cùng:
   - **Danh sách bảng (Table)**: Xem danh sách dạng bảng phân trang với đầy đủ thông tin: Mã khu, Tên khu, Loại khu (kèm màu sắc nhận diện), Khu cha, Diện tích (m²), Số mùa vụ đang chạy và Trạng thái hoạt động.
   - **Dạng cây phân cấp (Tree)**: Xem cấu trúc phả hệ phân tầng của nông trại (ví dụ: *Khu A > Lô A1 > Luống 01*). Bạn có thể bấm vào dấu mũi tên để thu gọn hoặc mở rộng từng nhánh.
   - **Bản đồ nông trại (Map)**: Xem bản đồ tổng thể toàn bộ các khu/lô đã được chấm tọa độ trên nền bản đồ vệ tinh.
3. Khi ở chế độ Danh sách bảng, bạn có thể:
   - Nhập tên hoặc mã vào ô **Tìm kiếm khu/lô...** để lọc nhanh.
   - Dùng ô chọn **Lọc theo loại** để lọc riêng: *Vườn ngoài trời, Nhà kính, Nhà lưới, Chuồng trại, Ao nuôi, Kho bãi, Khu sơ chế chế biến, Khác*.
   - Dùng ô chọn **Trạng thái** để lọc: *Tất cả, Hoạt động, Đã khóa*.

---

### Bước 2: Thêm mới một khu/lô đất canh tác

*(Chức năng dành cho Chủ trang trại và Quản lý)*

1. Tại góc trên bên phải màn hình Quản lý Khu/lô, nhấn nút màu xanh **Thêm khu/lô mới**.
2. Một biểu mẫu (hộp thoại) hiện lên, bạn điền các thông tin sau:
   - **Mã khu/lô**: Nhập mã định danh viết hoa không dấu (ví dụ: `KHU-A`, `LO-A1`, `CHUONG-01`). Mã này phải là duy nhất trong toàn trang trại.
   - **Tên khu/lô**: Tên gọi quen thuộc để nhận biết (ví dụ: *Vườn bưởi da xanh*, *Nhà màng dưa lưới số 2*, *Ao cá giống 01*).
   - **Loại khu vực**: Chọn loại hình phù hợp trong danh sách:
     - *Vườn ngoài trời (OPEN_FIELD)*
     - *Nhà kính (GREENHOUSE)*
     - *Nhà lưới (NET_HOUSE)*
     - *Chuồng trại (BARN)*
     - *Ao nuôi (POND)*
     - *Kho bãi (WAREHOUSE)*
     - *Khu sơ chế / Chế biến (PROCESSING)*
     - *Khác (OTHER)*
   - **Khu cha (Thuộc khu vực nào)**: Nếu khu/lô này là phân khu con (ví dụ: `Lô A1` nằm trong `Khu A`), hãy chọn khu cha tương ứng. Nếu là khu vực cấp cao nhất, để trống mục này.
   - **Diện tích (m²)**: Nhập diện tích ước tính hoặc đo đạc thực tế (ví dụ: `5000` cho 5.000 m²).
   - **Mô tả / Ghi chú**: Điền đặc điểm thổ nhưỡng, loại đất, nguồn nước tưới hoặc vị trí nhận diện.
3. Nhấn nút **Lưu khu/lô**. Hệ thống sẽ kiểm tra hợp lệ và thông báo thêm mới thành công.

---

### Bước 3: Xem chi tiết và theo dõi mùa vụ tại khu/lô

1. Trong bảng danh sách, nhấp vào biểu tượng **Con mắt (Xem chi tiết)** ở cột Thao tác tương ứng với khu/lô cần xem (hoặc truy cập đường dẫn `/admin/areas/[id]`).
2. Màn hình chi tiết hiển thị:
   - Thẻ thông tin tổng quan: Tên, Mã, Loại khu vực, Khu cha, Diện tích, Trạng thái hoạt động, Mô tả chi tiết.
   - Thẻ danh sách **Mùa vụ đang chạy**: Liệt kê các vụ trồng trọt, chăn nuôi hoặc thả thủy sản đang diễn ra trực tiếp trên khu vực này kèm ngày bắt đầu và trạng thái. Bạn có thể bấm vào tên mùa vụ để chuyển nhanh sang trang quản lý mùa vụ.
   - Khung **Bản đồ không gian số** của riêng khu/lô.

---

### Bước 4: Vẽ và chỉnh sửa ranh giới bản đồ (Bản đồ số Polygon)

1. Tại màn hình chi tiết của khu/lô, cuộn xuống phần **Bản đồ ranh giới khu/lô**.
2. Nếu khu/lô chưa có ranh giới:
   - Nhấn vào công cụ vẽ hình đa giác (biểu tượng Polygon trên thanh công cụ bản đồ).
   - Nhấp chuột lần lượt vào các góc/điểm ranh giới trên thực địa (tối thiểu 3 điểm).
   - Nhấp đúp chuột hoặc nhấp vào điểm đầu tiên để khép kín hình đa giác.
3. Nếu muốn chỉnh sửa ranh giới đã vẽ:
   - Nhấp vào hình đa giác trên bản đồ. Các điểm mốc tròn (chốt góc) sẽ hiện lên.
   - Nhấp giữ và kéo rê các điểm mốc đến vị trí chuẩn xác theo bờ ranh thực tế.
4. Nhấn nút **Lưu ranh giới bản đồ** màu xanh lá ở phía trên bản đồ. Hệ thống sẽ lưu tọa độ địa lý GeoJSON vào cơ sở dữ liệu.

---

### Bước 5: Xuất và in mã QR định danh khu/lô

1. Tại màn hình chi tiết khu/lô, ở góc trên bên phải, nhấn nút **Mã QR khu/lô**.
2. Hộp thoại hiện ra hiển thị hình ảnh mã QR chuẩn hóa chứa thông tin định danh của khu/lô.
3. Thao tác khả dụng:
   - Nhấn nút **Tải mã QR về máy** (ảnh PNG) để chèn vào tài liệu thiết kế biển bảng.
   - Nhấn nút **In mã QR** để in trực tiếp ra máy in tem dán hoặc máy in nhiệt.
4. **Ứng dụng thực tế**: Dán tem QR này lên cọc đầu luống, cổng nhà màng hoặc biển hiệu cửa chuồng. Khi công nhân đến làm việc, chỉ cần mở ứng dụng di động XFarm và quét mã QR để ghi nhật ký nhanh đúng khu/lô.

---

### Bước 6: Khóa hoặc Mở khóa khu/lô

1. Khi một khu/lô tạm thời ngừng canh tác, cho thuê hoặc chuyển mục đích sử dụng:
   - Tại bảng danh sách hoặc trang chi tiết, nhấn vào nút **Khóa** (biểu tượng Ổ khóa màu đỏ).
   - Hộp thoại xác nhận sẽ hiện lên hỏi: *"Bạn có chắc chắn muốn khóa khu/lô này không?"*. Nhấn **Đồng ý**.
   - Trạng thái khu vực sẽ chuyển sang **Đã khóa (Màu xám)**. Khu vực này sẽ không xuất hiện trong danh sách chọn mùa vụ mới nữa.
2. Khi muốn đưa khu/lô vào sản xuất trở lại, nhấn vào nút **Mở khóa** (biểu tượng Ổ khóa mở màu xanh lá) và xác nhận.

---

## 3. Lưu ý và Lỗi thường gặp

- **Lỗi trùng lặp mã khu/lô**: Mã khu/lô (ví dụ: `LO-01`) là duy nhất. Nếu nhập trùng với mã đã có trong hệ thống, bạn sẽ nhận được thông báo lỗi *Mã khu/lô đã tồn tại*. Hãy kiểm tra lại tiền tố mã quy định của trang trại.
- **Lỗi vòng lặp phân cấp khu cha**: Tuyệt đối không chọn chính khu/lô đó làm khu cha của chính nó, hoặc chọn khu con làm cha của khu mẹ. Hệ thống sẽ báo lỗi để tránh gây hỏng cấu trúc cây dữ liệu.
- **Khóa khu vực đang có mùa vụ**: Hệ thống cảnh báo nếu bạn khóa một khu/lô đang có mùa vụ đang hoạt động (`activeCyclesCount > 0`). Tốt nhất bạn nên chuyển trạng thái đóng mùa vụ trước khi khóa khu vực.
- **Vẽ bản đồ không lưu được**: Cần đảm bảo hình vẽ trên bản đồ là một đa giác khép kín hợp lệ (không tự cắt chéo nhau dạng số 8). Khi di chuyển mốc tọa độ xong, bắt buộc phải bấm nút **Lưu ranh giới bản đồ** thì dữ liệu mới được ghi nhận.
