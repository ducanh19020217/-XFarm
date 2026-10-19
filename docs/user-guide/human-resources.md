# Hướng Dẫn Sử Dụng Phân Hệ: Nhân Sự, Chấm Công & Bảng Lương

Phân hệ **Nhân sự & Chấm công** (`/admin/hr`) là giải pháp quản trị nguồn nhân lực khép kín dành cho nông trại. Hệ thống kết nối chặt chẽ từ khâu quản lý hồ sơ nhân viên, giao việc cụ thể theo từng lô ruộng, theo dõi chấm công hằng ngày cho đến tự động tính toán và phê duyệt chi trả lương cuối tháng một cách minh bạch, chính xác.

---

## 1. Mục đích sử dụng

- **Chuẩn hóa hồ sơ lao động nông nghiệp**: Quản lý đầy đủ thông tin nhân viên cơ hữu (toàn thời gian) và nhân công thời vụ, hợp đồng khoán theo mùa thu hoạch.
- **Phân công công việc rõ ràng**: Giao việc đích danh cho từng người kèm theo hạn hoàn thành, vị trí thửa ruộng và mùa vụ cần làm, tránh bỏ sót việc.
- **Chấm công tự động, chống gian lận**: Công nhân tự bấm vào ca/ra ca trên điện thoại tại hiện trường hoặc quản lý chấm công thủ công khi cần.
- **Tự động hóa tính lương không sai sót**: Không còn cảnh cộng sổ tay phức tạp. Hệ thống tự động tổng hợp số giờ làm việc và sản lượng khoán từ bảng chấm công để tính bảng lương chi tiết.
- **Phê duyệt phân quyền chặt chẽ**: Kế toán lập bảng lương, trình duyệt và chỉ **Chủ trang trại (OWNER)** mới có quyền tối cao bấm xác nhận chi trả tiền lương.

---

## 2. Quy trình Quản lý Lao động & Tính lương

```
[1. Tạo Hồ sơ nhân viên & Liên kết Tài khoản]
        ↓
[2. Giao việc hằng ngày (gắn với Khu/lô & Mùa vụ)]
        ↓
[3. Chấm công vào/ra ca & Ghi nhận sản lượng khoán]
        ↓
[4. Kế toán bấm "Tạo bảng lương tháng" (Tự động tổng hợp)]
        ↓
[5. Kế toán/Quản lý "Duyệt bảng lương" (APPROVED)]
        ↓
[6. Chủ trại (OWNER) bấm "Xác nhận chi trả" (PAID)]
```

---

## 3. Các bước thao tác chính

### Bước 1: Quản lý Hồ sơ Nhân viên (`/admin/hr/employees`)

*(Dành cho Chủ trang trại và Quản lý)*

1. Trên menu bên trái, nhấp chọn **Nhân sự & Chấm công** > **Nhân viên**.
2. **Thêm nhân viên mới**:
   - Nhấn nút màu xanh **Thêm nhân viên**.
   - Điền các thông tin:
     - **Mã nhân viên**: Mã định danh (ví dụ: `NV-001`, `CN-HAI-02`).
     - **Họ và tên**: Tên đầy đủ của người lao động.
     - **Số điện thoại**: Số di động liên hệ.
     - **Vị trí / Chức danh**: Ví dụ: *Tổ trưởng kỹ thuật, Công nhân chăm sóc, Thủ kho, Lái máy cày*.
     - **Hình thức trả lương (Pay Type)**:
       - *Toàn thời gian (FULL_TIME)*: Trả lương cố định theo tháng.
       - *Thời vụ / Theo ngày giờ (PARTIAL)*: Trả lương tính theo số giờ hoặc ngày làm thực tế.
       - *Khoán sản phẩm (CONTRACT)*: Trả lương theo khối lượng sản phẩm thu hái hoặc diện tích làm đất.
     - **Mức lương cơ sở (Base Rate)**: Mức lương thỏa thuận (ví dụ: `8000000` đ/tháng hoặc `35000` đ/giờ hoặc `2500` đ/kg hái dưa).
   - Nhấn **Lưu hồ sơ**.
3. **Liên kết Tài khoản đăng nhập (BẮT BUỘC để dùng App)**:
   - Một nhân viên muốn sử dụng điện thoại để nhận việc và chấm công thì hồ sơ nhân viên phải được gắn với một tài khoản người dùng (`User`).
   - Tại dòng nhân viên tương ứng, nhấn nút **Liên kết tài khoản** (biểu tượng Người dùng).
   - Chọn tài khoản email đăng nhập của nhân viên đó từ danh sách và nhấn **Xác nhận liên kết**.

---

### Bước 2: Phân công Công việc (`/admin/hr/tasks`)

*(Dành cho Chủ trang trại và Quản lý)*

1. Trên menu, nhấp chọn **Nhân sự & Chấm công** > **Giao việc**.
2. **Tạo công việc mới**:
   - Nhấn nút **Giao việc mới**.
   - Điền thông tin giao việc:
     - **Tiêu đề công việc**: Rõ ràng, súc tích (ví dụ: *Tỉa chồi và quấn dây dưa lưới Nhà màng 02*, *Bón thúc phân hữu cơ Lô bưởi A1*).
     - **Mô tả chi tiết**: Hướng dẫn kỹ thuật cần lưu ý (ví dụ: *Chỉ giữ lại 1 quả to tròn nhất ở nách lá thứ 10, tỉa sạch chồi phụ*).
     - **Người thực hiện**: Chọn nhân viên được giao trách nhiệm chính.
     - **Khu/lô & Mùa vụ**: Chọn vị trí đất canh tác và mùa vụ liên quan để chi phí công được hạch toán đúng vụ mùa.
     - **Hạn hoàn thành (Due date)**: Thời hạn nhân viên phải hoàn thành công việc.
   - Nhấn **Giao việc**.
3. **Theo dõi tiến độ công việc**:
   - Bạn có thể chuyển đổi giữa chế độ **Danh sách bảng** hoặc **Bảng Kanban** trực quan.
   - Các trạng thái công việc:
     - 📋 **Cần làm (TODO)**: Việc mới giao, công nhân chưa bắt đầu.
     - ⏳ **Đang làm (IN_PROGRESS)**: Công nhân đã bấm "Bắt đầu làm" trên điện thoại.
     - ✅ **Hoàn thành (DONE)**: Công nhân đã hoàn tất và chụp ảnh nghiệm thu.
     - ❌ **Đã hủy (CANCELLED)**: Quản lý hủy do thay đổi kế hoạch.

---

### Bước 3: Quản lý Chấm công (`/admin/hr/attendance`)

1. Trên menu, nhấp chọn **Nhân sự & Chấm công** > **Chấm công**.
2. **Dữ liệu chấm công tự động**:
   - Hằng ngày khi công nhân đi làm, họ mở điện thoại bấm **Vào ca** và cuối ngày bấm **Hết ca**.
   - Dữ liệu sẽ tự động truyền về bảng chấm công trung tâm: hiển thị rõ giờ vào, giờ ra, số giờ làm việc thực tế (`hours`), sản lượng khoán (`pieceQty`) và ghi chú.
3. **Chấm công thủ công / Chỉnh sửa bổ sung**:
   - Trường hợp công nhân quên mang điện thoại, điện thoại hết pin hoặc làm việc ngoài vùng không có mạng chưa kịp đồng bộ:
     - Quản lý nhấn nút **Thêm lượt chấm công** (hoặc bấm nút **Sửa** tại dòng tương ứng).
     - Chọn Nhân viên, Ngày làm việc, Giờ vào, Giờ ra, Số lượng khoán (nếu có).
     - Nhấn **Lưu chấm công**.

---

### Bước 4: Tính toán và Phê duyệt Bảng lương (`/admin/hr/payroll`)

Phân hệ Bảng lương được thiết kế với quy trình phê duyệt 2 bước chuẩn mực tài chính:

#### 1. Tạo Bảng lương tháng tự động (Generate)
*(Dành cho Kế toán và Chủ trang trại)*
- Nhấp chọn **Nhân sự & Chấm công** > **Bảng lương**.
- Nhấn nút **Tạo bảng lương mới** (hoặc **Tính lương tự động**).
- Chọn **Kỳ lương**: Chọn Ngày bắt đầu và Ngày kết thúc của tháng cần tính (ví dụ: *01/10/2026 đến 31/10/2026*).
- Nhấn **Tạo bảng lương**.
- **Cơ chế thông minh**: Hệ thống sẽ tự động quét toàn bộ lượt chấm công trong tháng của tất cả nhân viên:
  - Nhân viên toàn thời gian: Tính theo ngày công chuẩn và ngày công đi làm thực tế.
  - Nhân viên thời vụ: Lấy tổng số giờ công nhân với đơn giá giờ.
  - Nhân viên khoán: Lấy tổng sản lượng (kg/quả/cây) nhân với đơn giá khoán sản phẩm.
- Bảng lương được sinh ra ở trạng thái ban đầu là **Bản nháp (DRAFT)**.

#### 2. Kiểm tra chi tiết và Điều chỉnh
- Kế toán nhấp vào tên nhân viên để mở hộp thoại **Chi tiết lương**:
  - Xem bảng kê chi tiết từng ngày công trong tháng (Daily Breakdown: ngày nào làm mấy giờ, ở mùa vụ nào).
  - Có thể điền thêm các khoản: **Thưởng chuyên cần / Phụ cấp trách nhiệm** hoặc **Giảm trừ tạm ứng**.
  - Hệ thống tự động tính lại con số **Thực lĩnh** cuối cùng.

#### 3. Duyệt bảng lương (Approve)
*(Dành cho Kế toán và Chủ trang trại)*
- Sau khi kiểm tra toàn bộ bảng lương không còn sai sót, Kế toán hoặc Quản lý nhấn nút **Duyệt bảng lương** (Approve).
- Trạng thái chuyển sang **Đã duyệt (APPROVED)**. Bảng lương lúc này sẵn sàng chờ Chủ trang trại chi trả.

#### 4. Xác nhận chi trả lương (Pay)
*(QUYỀN DUY NHẤT: Chỉ có Chủ trang trại - OWNER mới được thực hiện)*
- Chủ trang trại đăng nhập tài khoản của mình, kiểm tra lần cuối tổng số tiền chi lương của toàn nông trại.
- Nhấn nút **Xác nhận chi trả** (Pay).
- Hộp thoại cảnh báo xuất hiện xác nhận việc chuyển tiền/phát lương đã hoàn tất.
- Sau khi bấm xác nhận, trạng thái chuyển thành **Đã chi trả (PAID)**. Bảng lương chính thức được khóa sổ vĩnh viễn, không ai có thể can thiệp hay sửa đổi số liệu.

---

## 4. Lưu ý và Lỗi thường gặp

- **Công nhân đăng nhập điện thoại không thấy việc và không chấm công được**: Đây là lỗi phổ biến nhất. Hãy vào lại mục *Nhân viên* (`/admin/hr/employees`), kiểm tra xem hồ sơ của công nhân đó đã được nhấn nút **Liên kết tài khoản** với email đăng nhập của họ hay chưa.
- **Kế toán không bấm được nút "Xác nhận chi trả"**: Để đảm bảo kiểm soát dòng tiền của trang trại, hệ thống quy định chỉ tài khoản có vai trò **Chủ trang trại (OWNER)** mới có quyền bấm nút *Xác nhận chi trả* (`PAID`). Kế toán chỉ dừng lại ở bước *Duyệt bảng lương* (`APPROVED`).
- **Bảng lương đã chi trả (PAID) không thể sửa**: Khi đã ở trạng thái `PAID`, mọi nút chỉnh sửa hoặc xóa đều bị khóa nhằm tuân thủ nguyên tắc kế toán tài chính minh bạch. Nếu có sai sót cần điều chỉnh, kế toán sẽ bù trừ vào kỳ lương của tháng tiếp theo.
- **Công nhân quên bấm Hết ca**: Nếu công nhân chỉ bấm Vào ca buổi sáng mà quên bấm Hết ca buổi chiều, số giờ công ngày hôm đó có thể bị thiếu. Quản lý cần vào rà soát bảng chấm công và điền bổ sung giờ ra trước khi nhấn lệnh tính bảng lương tháng.
