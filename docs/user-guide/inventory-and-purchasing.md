# Hướng Dẫn Sử Dụng Phân Hệ: Quản Lý Kho & Mua Hàng

Phân hệ **Kho** (`/admin/inventory`) và **Mua hàng** (`/admin/purchase-orders`) giúp nông trại kiểm soát chặt chẽ toàn bộ vật tư đầu vào (hạt giống, phân bón, chế phẩm vi sinh, thức ăn chăn nuôi, bao bì) và nông sản sau thu hoạch. Hệ thống vận hành theo nguyên tắc quản lý kho chuẩn mực: quản lý theo lô hạn dùng, xuất kho theo thứ tự nhập trước xuất trước (FIFO) và **tuyệt đối chặn xuất âm**.

---

## 1. Mục đích sử dụng

- **Quản lý danh mục vật tư tập trung**: Định danh rõ ràng từng loại hạt giống, phân bón, nông dược sinh học với đơn vị tính chuẩn (kg, bao, chai, lít, cây).
- **Theo dõi tồn kho theo thời gian thực**: Nắm bắt chính xác số lượng tồn khả dụng tại từng kho bãi để kịp thời bổ sung, không làm gián đoạn sản xuất.
- **Quản lý theo Lô và Hạn sử dụng (FIFO)**: Cảnh báo sớm các lô vật tư sắp hết hạn và tự động trừ các lô hàng nhập trước khi xuất kho.
- **Quy trình mua hàng minh bạch**: Theo dõi từ khâu lập dự trù đơn mua hàng (PO), phê duyệt đặt hàng đến lúc thủ kho nhận hàng thực tế và nhập vào kho.
- **Minh bạch tài chính giá vốn**: Tự động tính giá vốn bình quân gia quyền phục vụ kế toán tính toán chi phí giá thành mùa vụ.

---

## 2. Cấu trúc phân hệ Kho

Khi vào mục **Kho** trên menu, bạn sẽ thấy 4 tab chức năng trên thanh điều hướng (`InventoryNav`):
1. **Tồn kho** (`/admin/inventory`): Xem danh sách số dư tồn kho hiện tại của từng vật tư tại các kho.
2. **Thẻ kho** (`/admin/inventory/moves`): Xem lịch sử từng lần nhập, xuất, điều chuyển của từng mặt hàng.
3. **Phiếu kho** (`/admin/inventory/documents`): Quản lý các chứng từ Nhập kho, Xuất kho, Điều chuyển và Kiểm kê.
4. **Danh mục** (`/admin/inventory/items`): Quản lý danh sách vật tư, kho bãi và nhà cung cấp.

---

## 3. Các bước thao tác chính

### Bước 1: Quản lý Danh mục Vật tư, Kho bãi và Nhà cung cấp

*(Thực hiện tại tab Danh mục)*

1. **Thêm mới Vật tư (`/admin/inventory/items`)**:
   - Nhấn nút **Thêm vật tư**.
   - Nhập: Mã vật tư (ví dụ: `VT-PHAN-NPK`, `GIONG-LUA-ST25`), Tên vật tư, Nhóm phân loại (*Giống cây, Phân bón, Thuốc BVTV, Thức ăn, Nông sản, Bao bì, Khác*), Đơn vị tính (kg, bao, bao 50kg, lít...), Định mức tồn tối thiểu (để hệ thống cảnh báo khi chạm ngưỡng).
   - Nhấn **Lưu vật tư**.
2. **Thêm mới Kho bãi (`/admin/inventory/warehouses`)**:
   - Khởi tạo các địa điểm chứa hàng: *Kho trung tâm, Kho vật tư phân bón, Kho bảo quản lạnh, Kho dã ngoại Khu A*.
3. **Thêm mới Nhà cung cấp (`/admin/inventory/suppliers`)**:
   - Nhập tên công ty/đại lý, mã số thuế, số điện thoại liên hệ, địa chỉ và thông tin thanh toán.

---

### Bước 2: Tra cứu Tồn kho và Số dư theo lô

1. Nhấp vào tab **Tồn kho** (`/admin/inventory`).
2. Bảng dữ liệu hiển thị:
   - Tên và mã vật tư.
   - Vị trí kho đang chứa.
   - Mã lô hàng (`stockLotId`) và Hạn sử dụng (Exp Date).
   - Số lượng tồn thực tế và số lượng khả dụng.
   - Cột cảnh báo trạng thái: Bình thường (xanh lá), Sắp hết hàng (vàng), Sắp hết hạn (đỏ).
   - Đối với vai trò Chủ trại, Quản lý và Kế toán: Hiển thị thêm cột Đơn giá vốn và Tổng giá trị thành tiền.
3. Bạn có thể gõ từ khóa vào ô tìm kiếm hoặc lọc theo từng kho để kiểm tra nhanh.

---

### Bước 3: Lập các loại Phiếu kho (Nhập, Xuất, Chuyển, Kiểm kê)

Truy cập tab **Phiếu kho** (`/admin/inventory/documents`), nhấn nút **Tạo phiếu kho** và chọn loại chứng từ tương ứng:

#### 1. Lập Phiếu Nhập kho (Receipt)
- **Mục đích**: Nhập hàng mua từ nhà cung cấp (ngoài quy trình PO), nhập thu hoạch nông sản từ mùa vụ, hoặc nhập điều chỉnh thừa.
- **Thao tác**:
  1. Chọn Kho nhận hàng.
  2. Chọn Nhà cung cấp hoặc Mùa vụ liên quan (nếu có).
  3. Thêm các dòng hàng: Chọn Mặt hàng, Số lượng nhập, Đơn giá nhập, Số lô sản xuất và Hạn sử dụng của nhà sản xuất.
  4. Nhấn **Xác nhận nhập kho**. Hệ thống tự động tăng tồn kho và sinh thẻ kho.

#### 2. Lập Phiếu Xuất kho (Issue)
- **Mục đích**: Xuất phân bón, thuốc, thức ăn cho mùa vụ canh tác; xuất bán nông sản; hoặc xuất hủy do hỏng hóc, hao hụt.
- **Thao tác**:
  1. Chọn Kho xuất hàng.
  2. Chọn Mục đích xuất: *Xuất cho mùa vụ canh tác (gắn mã mùa vụ)*, *Xuất bán*, *Xuất hủy*.
  3. Chọn mặt hàng và nhập số lượng cần xuất.
  4. **Nguyên tắc FIFO tự động**: Hệ thống sẽ tự động chỉ định xuất từ lô hàng nhập trước nhất hoặc có hạn sử dụng gần nhất.
  5. **Quy tắc chặn xuất âm**: Nếu số lượng yêu cầu vượt quá số lượng tồn thực tế trong kho, hệ thống sẽ hiện cảnh báo đỏ và khóa nút xác nhận. Bạn phải điều chỉnh lại số lượng hợp lệ.
  6. Nhấn **Xác nhận xuất kho**.

#### 3. Lập Phiếu Điều chuyển kho (Transfer)
- **Mục đích**: Vận chuyển vật tư từ Kho trung tâm ra các kho tạm tại từng phân khu ruộng hoặc chuồng trại.
- **Thao tác**:
  1. Chọn Kho nguồn (kho xuất) và Kho đích (kho nhận).
  2. Chọn các mặt hàng và số lượng chuyển.
  3. Nhấn **Xác nhận điều chuyển**. Số lượng sẽ được trừ ở kho nguồn và cộng vào kho đích ngay lập tức.

#### 4. Lập Phiếu Kiểm kê kho (Stock Count)
- **Mục đích**: Đối chiếu định kỳ giữa số lượng thực tế đếm được trong kho và số liệu trên phần mềm.
- **Thao tác**:
  1. Chọn Kho cần kiểm kê.
  2. Hệ thống tải ra danh sách tồn sổ sách hiện tại.
  3. Thủ kho đếm thực tế ngoài kho và điền con số thực đếm vào cột **Số lượng thực tế**.
  4. Hệ thống sẽ tự động tính toán số lượng Chênh lệch (Thừa hoặc Thiếu).
  5. Nhấn **Cân đối kiểm kê**. Hệ thống tự động sinh các bút toán điều chỉnh tồn kho về đúng con số thực tế đếm được.

---

### Bước 4: Quy trình Quản lý Đơn mua hàng (Purchase Orders - PO)

Truy cập mục **Mua hàng** (`/admin/purchase-orders`) trên menu chính.

```
[1. Tạo Đơn mua hàng (DRAFT)] 
        ↓ 
[2. Duyệt & Gửi đặt hàng (ORDERED)] 
        ↓ 
[3. Nhận hàng thực tế tại kho (RECEIVE)]
        ↓
[4. Đã nhận đủ (RECEIVED) / Nhận một phần (PARTIAL)]
```

**Các bước thực hiện chi tiết:**

1. **Tạo Đơn mua hàng mới**:
   - Tại trang Mua hàng, nhấn nút màu xanh **Tạo đơn mua hàng**.
   - Chọn **Nhà cung cấp**.
   - Chọn **Ngày đặt hàng** và **Ngày dự kiến giao hàng**.
   - Thêm các dòng hàng cần mua: Chọn tên vật tư, số lượng dự kiến mua, đơn giá thỏa thuận. Hệ thống tự động tính tổng tiền đơn hàng.
   - Điền ghi chú (ví dụ: *Giao hàng tại cổng số 2, liên hệ thủ kho trước 30 phút*).
   - Nhấn **Tạo đơn hàng**. Trạng thái đơn lúc này là **Nháp (DRAFT)**.

2. **Duyệt và Gửi đặt hàng**:
   - Kế toán hoặc Quản lý kiểm tra lại đơn mua hàng nháp.
   - Nhấn nút **Gửi đặt hàng**. Trạng thái chuyển sang **Đã đặt hàng (ORDERED)**. Đơn hàng chính thức có hiệu lực theo dõi tiến độ giao hàng.

3. **Nhận hàng vào kho**:
   - Khi nhà cung cấp chở hàng đến nông trại, Quản lý hoặc Thủ kho mở đơn mua hàng tương ứng.
   - Nhấn nút **Nhận kho** (biểu tượng Hộp hàng).
   - Trong hộp thoại Nhận hàng:
     - Chọn Kho nhập hàng vào.
     - Kiểm tra số lượng thực giao của từng mặt hàng (có thể nhận đủ hoặc nhận một phần nếu nhà cung cấp giao thiếu).
     - Điền số lô và hạn sử dụng của hàng nhận.
     - Nhấn nút **Xác nhận nhận hàng**.
   - **Tự động hóa**: Hệ thống sẽ **tự động sinh ra một Phiếu Nhập kho** tương ứng và tăng số lượng tồn kho. Nếu nhận đủ 100%, đơn chuyển sang trạng thái **Đã nhận đủ (RECEIVED)**. Nếu mới giao một phần, trạng thái là **Nhận một phần (PARTIAL)** để chờ đợt giao tiếp theo.

4. **Hủy đơn mua hàng**:
   - Nếu đơn hàng ở trạng thái `DRAFT` hoặc `ORDERED` nhưng nhà cung cấp hết hàng hoặc hai bên hủy giao dịch, bạn nhấn nút **Hủy đơn** để đóng đơn hàng với trạng thái **Đã hủy (CANCELLED)**.

---

## 4. Lưu ý và Lỗi thường gặp

- **Lỗi 422 - Không thể xuất kho âm**: XFarm kiên quyết bảo vệ tính đúng đắn của dữ liệu kho. Bạn không bao giờ có thể xuất kho một mặt hàng khi số lượng tồn sổ sách bằng 0. Nếu thực tế ngoài kho vẫn còn hàng mà hệ thống báo hết, thủ kho cần thực hiện phiếu Nhập kho hoặc Kiểm kê kho trước.
- **Xuất kho theo lô FIFO**: Khi xuất kho, hệ thống tự động ưu tiên chọn lô hàng nhập trước nhất để giảm thiểu rủi ro hết hạn vật tư. Bạn không cần tự tính toán thủ công.
- **Bảo mật giá tiền đối với Công nhân**: Khi tài khoản công nhân (`WORKER`) xem danh mục vật tư hoặc tồn kho trên ứng dụng, các trường giá vốn (`unitCost`, `totalCost`) được ẩn hoàn toàn để bảo vệ bí mật kinh doanh của nông trại.
- **Đơn mua hàng đã nhận kho không được xóa**: Khi đơn mua hàng đã phát sinh một hoặc nhiều đợt nhận hàng vào kho, bạn không thể xóa hoặc hủy đơn này nhằm bảo vệ lịch sử thẻ kho.
