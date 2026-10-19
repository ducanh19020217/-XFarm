# Hướng Dẫn Sử Dụng Phân Hệ: Quản Lý Đàn & Cá Thể Vật Nuôi

Phân hệ **Vật nuôi** (`/admin/animals`) hỗ trợ các trang trại chăn nuôi gia súc, gia cầm và thủy sản quản lý toàn diện từ quy mô tổng đàn cho đến từng cá thể riêng biệt. Hệ thống hỗ trợ gắn mã thẻ tai (Ear Tag), truy xuất nguồn gốc phả hệ giống nòi và lưu trữ bệnh án, tiêm chủng suốt vòng đời vật nuôi.

---

## 1. Mục đích sử dụng

- **Quản lý phân tầng linh hoạt**: Phù hợp cho cả chăn nuôi quy mô bầy đàn (gà, vịt, bồ câu, cá) và chăn nuôi cá thể giá trị cao (bò thịt, bò sữa, dê, cừu, heo nái giống).
- **Định danh điện tử từng cá thể**: Mỗi vật nuôi được cấp một mã thẻ tai duy nhất, giúp phân biệt chính xác từng con trong chuồng.
- **Theo dõi phả hệ nòi giống**: Ghi nhận quan hệ mẹ - con, đánh giá năng suất sinh sản và phòng ngừa nguy cơ cận huyết khi phối giống.
- **Bệnh án điện tử & Sức khỏe đàn**: Lưu trữ toàn bộ lịch sử tiêm phòng vaccine, phác đồ điều trị kháng sinh/dược liệu, và biểu đồ tăng trọng qua các lần cân mẫu.

---

## 2. Các bước thao tác chính

### Bước 1: Điều hướng giữa Đàn và Cá thể

Truy cập mục **Vật nuôi** trên thanh menu bên trái. Màn hình được chia làm 2 tab rõ ràng:
1. **Tab "Đàn vật nuôi"**: Dùng để quản lý các nhóm/lô vật nuôi nuôi tập trung theo số lượng đầu con (ví dụ: *Đàn gà thịt chuồng 01*, *Đàn dê hậu bị Lô B*).
2. **Tab "Cá thể vật nuôi"**: Dùng để quản lý chi tiết từng cá thể được bấm mã thẻ tai riêng biệt.

---

### Bước 2: Tạo mới Đàn vật nuôi (Tab Đàn vật nuôi)

*(Dành cho Chủ trang trại và Quản lý)*

1. Chuyển sang tab **Đàn vật nuôi**, nhấn nút **Thêm đàn vật nuôi** ở góc phải.
2. Điền các thông tin trong biểu mẫu:
   - **Mã đàn**: Mã định danh viết hoa (ví dụ: `DAN-DE-01`, `DAN-BO-2026`).
   - **Mùa vụ chăn nuôi**: Chọn mùa vụ chăn nuôi tương ứng đang hoạt động (đã tạo ở phân hệ Mùa vụ).
   - **Khu/lô chuồng trại**: Chọn vị trí chuồng trại hoặc bãi chăn thả vật nuôi sinh sống.
   - **Loài vật nuôi**: Điền loài (ví dụ: *Bò, Dê, Heo, Gà, Vịt, Cừu*).
   - **Giống**: Tên giống cụ thể (ví dụ: *Bò 3B, Bò Wagyu, Dê Boer, Heo rừng lai*).
   - **Số lượng đầu con ban đầu**: Nhập tổng số lượng con khi nhập đàn (ví dụ: `50`).
   - **Ghi chú**: Nguồn gốc nhập giống, thể trạng ban đầu, độ tuổi trung bình.
3. Nhấn nút **Lưu đàn**. Đàn vật nuôi sẽ xuất hiện trên danh sách với số lượng kiểm soát.

---

### Bước 3: Thêm mới Cá thể vật nuôi và gán thẻ tai (Tab Cá thể vật nuôi)

1. Chuyển sang tab **Cá thể vật nuôi**, nhấn nút **Thêm cá thể vật nuôi**.
2. Điền thông tin chi tiết:
   - **Mã thẻ tai (Tag)**: Mã số in trên thẻ bấm vào tai con vật (ví dụ: `TAG-BO-0102`, `DE-2026-088`). Mã này bắt buộc phải là duy nhất.
   - **Thuộc đàn**: Chọn đàn vật nuôi mà cá thể này thuộc về (nếu có).
   - **Loài & Giống**: Nhập loài và giống thuần chủng/lai.
   - **Giới tính**: Chọn *Đực (MALE)*, *Cái (FEMALE)* hoặc *Chưa rõ (UNKNOWN)*.
   - **Ngày sinh**: Chọn ngày con vật sinh ra (để hệ thống tự động tính ngày tuổi).
   - **Cá thể mẹ (Phả hệ)**: Nếu cá thể này sinh ra tại nông trại từ một con mẹ đã có mã thẻ tai trong hệ thống, hãy chọn mã thẻ tai của con mẹ để thiết lập cây phả hệ gia đình.
   - **Ghi chú**: Đặc điểm nhận dạng riêng biệt (ví dụ: *Đốm trắng ở trán, sừng cong, cụt đuôi*).
3. Nhấn **Lưu cá thể**. Trạng thái ban đầu của con vật sẽ là **Còn sống (ALIVE)**.

---

### Bước 4: Ghi nhận sự kiện vòng đời cho vật nuôi

Trong quá trình chăm sóc, mỗi khi có hoạt động y tế, biến động đàn hoặc đo đạc, bạn ghi nhận sự kiện như sau:
1. Tại bảng danh sách cá thể (hoặc trang chi tiết cá thể), nhấn nút **Ghi sự kiện** (biểu tượng Dấu cộng hoặc Cuốn sổ).
2. Hộp thoại **Ghi sự kiện vật nuôi** hiện ra.
3. **Phân quyền sự kiện theo vai trò**:
   - **Công nhân (WORKER)** được phép ghi 3 sự kiện chăm sóc hàng ngày:
     - 💉 **Tiêm phòng (VACCINATION)**: Tên loại vaccine, liều lượng (ml), bệnh phòng ngừa.
     - 🩺 **Điều trị / Dùng thuốc (TREATMENT)**: Tên thuốc, triệu chứng bệnh, liều dùng, ngày tái khám.
     - ⚖️ **Cân trọng lượng (WEIGHING)**: Trọng lượng đo được thực tế (kg) để theo dõi tốc độ tăng trọng.
   - **Quản lý & Chủ trại** có quyền ghi thêm 4 sự kiện quan trọng:
     - 🧬 **Phối giống (BREEDING)**: Ngày phối giống, mã cá thể đực phối giống hoặc nguồn tinh.
     - 🍼 **Sinh sản (BIRTH)**: Ngày sinh đẻ, số lượng con sơ sinh còn sống/chết.
     - 💰 **Xuất bán (SALE)**: Ngày xuất bán, trọng lượng xuất, giá bán hoặc tên người mua. Sau khi lưu, trạng thái cá thể sẽ tự động chuyển thành **Đã bán (SOLD)**.
     - ⚠️ **Khai tử (DEATH)**: Ngày chết, nguyên nhân chết (do bệnh, tai nạn, già yếu...). Sau khi lưu, trạng thái cá thể sẽ chuyển thành **Đã chết (DEAD)**.
4. Điền đầy đủ ngày diễn ra sự kiện, các chỉ số và ghi chú, sau đó bấm nút **Lưu sự kiện**.

---

### Bước 5: Xem hồ sơ chi tiết cá thể và Cây phả hệ

1. Bấm vào mã thẻ tai hoặc biểu tượng **Con mắt** tại danh sách để vào trang chi tiết cá thể (`/admin/animals/[id]`).
2. Màn hình chi tiết gồm các phần:
   - **Thẻ thông tin cá thể**: Mã thẻ tai, đàn trực thuộc, giống loài, giới tính, ngày sinh, ngày tuổi hiện tại và trạng thái sinh tồn (*Còn sống / Đã bán / Đã chết*).
   - **Cây phả hệ (Gia đình vật nuôi)**: 
     - Xem thông tin cá thể mẹ (bấm vào để mở hồ sơ con mẹ).
     - Danh sách các thế hệ con cái mà cá thể này đã sinh ra tại trại kèm ngày sinh và mã thẻ tai tương ứng.
   - **Lịch sử sự kiện & Biến động thể trạng**: Toàn bộ dòng thời gian các mũi tiêm vaccine, đợt điều trị bệnh và biểu đồ biến động cân nặng qua từng tháng tuổi.

---

## 3. Lưu ý và Lỗi thường gặp

- **Trùng lặp mã thẻ tai**: Mỗi con vật chỉ có một mã thẻ tai duy nhất trong trang trại. Nếu nhập trùng mã đã dùng trước đó, hệ thống sẽ từ chối lưu.
- **Thao tác trên con vật đã bán hoặc đã chết**: Khi một cá thể đã được ghi nhận sự kiện `Xuất bán` hoặc `Khai tử`, trạng thái của nó sẽ khóa lại thành `SOLD` hoặc `DEAD`. Bạn sẽ không thể tiếp tục ghi các sự kiện như tiêm phòng, cân nặng hay phối giống cho cá thể này nữa.
- **Phân quyền công nhân**: Nếu công nhân đăng nhập trên ứng dụng và cố gắng thao tác các sự kiện lớn như khai tử hay bán gia súc, hệ thống sẽ ẩn các tùy chọn này theo đúng quy định phân quyền an toàn.
- **Chọn sai mẹ trong phả hệ**: Lưu ý chỉ chọn con mẹ cùng loài và đã ở độ tuổi sinh sản để đảm bảo tính logic cho cây gia phả.
