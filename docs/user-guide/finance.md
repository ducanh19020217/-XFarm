# Hướng Dẫn Sử Dụng Phân Hệ: Tài Chính, Sổ Quỹ & Phân Tích Lãi Lỗ

Phân hệ **Tài chính & Thu chi** (`/admin/finance`) là trung tâm quản lý dòng tiền và hạch toán kinh tế của trang trại sinh thái thông minh XFarm. Phân hệ giúp nông trại quản lý toàn diện sổ quỹ thu chi, kết nối tự động với các nghiệp vụ Bán hàng và Mua hàng, kiểm soát công nợ khách hàng, đồng thời cung cấp các báo cáo quản trị chuyên sâu như dòng tiền 12 tháng, doanh thu sản phẩm và **phân tích chi phí giá thành & lãi lỗ của từng vụ mùa**.

---

## 1. Mục đích sử dụng

- **Minh bạch hóa dòng tiền thực tế (Cashflow)**: Ghi chép chi tiết mọi biến động tiền mặt tại quỹ và tiền gửi tài khoản ngân hàng của nông trại.
- **Tự động hóa hạch toán liên phân hệ**: Tự động sinh phiếu Thu khi khách hàng thanh toán đơn bán hàng và tự động sinh phiếu Chi khi kế toán trả tiền đơn mua hàng (PO), không cần nhập liệu thủ công trùng lặp.
- **Quản lý danh mục thu chi khoa học**: Phân nhóm các khoản thu và chi theo cấu trúc hình cây nhiều cấp độ, bảo vệ các danh mục cốt lõi của hệ thống.
- **Kiểm soát công nợ chặt chẽ**: Cảnh báo tức thời các khoản nợ quá hạn trên 30 ngày, quản lý hạn mức nợ theo từng đối tác khách hàng và từng đơn hàng cụ thể.
- **Tính toán chính xác giá thành mùa vụ (Cycle Costing)**: Tổng hợp tự động 3 cấu phần chi phí: *Chi phí vật tư xuất dùng (FIFO)* + *Chi phí tiền mặt chi trực tiếp* + *Chi phí nhân công lao động (chấm công)* để tính ra giá thành đơn vị (đồng/kg, đồng/con, đồng/cây).
- **Đánh giá hiệu quả kinh doanh & lãi lỗ**: So sánh trực tiếp giữa giá thành sản xuất và doanh thu bán nông sản thực tế của từng mùa vụ, giúp chủ trại đưa ra quyết định canh tác chuẩn xác cho các vụ tiếp theo.

---

## 2. Cấu trúc phân hệ Tài chính

Phân hệ bao gồm 4 khu vực chức năng chính trên thanh menu:

1. **Giao dịch / Sổ quỹ (`/admin/finance/transactions`)**: Sổ ghi chép chi tiết từng lần thu, chi của nông trại; hỗ trợ lọc theo ngày, theo danh mục, theo mùa vụ và đính kèm ảnh hóa đơn chứng từ.
2. **Danh mục thu chi (`/admin/finance/categories`)**: Cây phân loại các khoản thu, chi theo mục đích phục vụ báo cáo.
3. **Quản lý Công nợ (`/admin/finance/receivables`)**: Bảng theo dõi nợ phải thu của khách hàng, phân tách theo khách hàng và theo đơn hàng, gắn cờ cảnh báo nợ quá hạn.
4. **Báo cáo tài chính (`/admin/finance/reports`)**: Trung tâm biểu đồ và số liệu phân tích: Báo cáo dòng tiền 12 tháng, Báo cáo giá thành & lãi lỗ mùa vụ, Báo cáo doanh thu theo sản phẩm.

---

## 3. Các bước thao tác chi tiết

### Bước 1: Quản lý Cây Danh mục Thu - Chi (`/admin/finance/categories`)

Cây danh mục chuẩn giúp nông trại phân loại chi phí và doanh thu một cách ngăn nắp:

1. Truy cập **Tài chính** → **Danh mục thu chi**.
2. **Cấu trúc cây phân cấp**:
   - Hai nhánh chính: **Thu tiền (INCOME)** và **Chi tiền (EXPENSE)**.
   - Nhấn vào biểu tượng thư mục hoặc mũi tên tam giác để đóng/mở các cấp danh mục con.
3. **Phân biệt Danh mục Hệ thống và Danh mục Tự tạo**:
   - **Danh mục hệ thống (có biểu tượng Ổ khóa)**: Các danh mục nghiệp vụ mặc định do hệ thống tạo (ví dụ: *Thu bán hàng nông sản*, *Chi mua vật tư hàng hóa*, *Chi trả lương nhân viên*). Các danh mục này **bị khóa**, không thể xóa hoặc sửa loại thu/chi để bảo đảm tính đúng đắn khi hệ thống tự động hạch toán.
   - **Danh mục tự tạo (không có khóa)**: Do người dùng tạo thêm để phục vụ quản lý nội bộ trang trại (ví dụ: *Chi phí điện bơm tưới*, *Chi xăng xe vận chuyển*, *Chi mua bao bì đóng gói*, *Thu phí du lịch dã ngoại*). Bạn có thể tự do chỉnh sửa hoặc xóa khi không còn sử dụng.
4. **Thêm mới một danh mục**:
   - Nhấn nút màu xanh **Thêm danh mục**.
   - Nhập **Tên danh mục** (ví dụ: *Chi bảo dưỡng máy cắt cỏ*).
   - Chọn **Loại danh mục**: `Khoản thu (INCOME)` hoặc `Khoản chi (EXPENSE)`.
   - Chọn **Danh mục cha** (nếu muốn xếp nó là danh mục con của một nhóm lớn hơn).
   - Nhấn **Lưu danh mục**.

---

### Bước 2: Quản lý Sổ quỹ & Giao dịch Thu Chi (`/admin/finance/transactions`)

Trang Giao dịch là sổ quỹ tài chính chi tiết nhất của nông trại:

#### 1. Phân biệt Giao dịch Thủ công và Giao dịch Tự động
- **Giao dịch tự động**: Phát sinh tự động khi nhân viên ghi thu tiền đơn bán hàng hoặc kế toán thanh toán đơn mua hàng PO. Cột *Nguồn chứng từ* hiển thị liên kết trực tiếp:
  - `Đơn bán (SO-2026-XXXX)`: Dẫn tới trang chi tiết đơn hàng bán.
  - `Đơn mua PO (PO-2026-XXXX)`: Dẫn tới trang đơn mua hàng.
  - *Bảo mật*: Các giao dịch tự động này **không có nút Sửa hoặc Xóa** trên sổ quỹ. Nếu muốn điều chỉnh, bạn phải thao tác tại đơn hàng gốc nhằm tránh sai lệch số liệu kép.
- **Giao dịch thủ công**: Được kế toán hoặc chủ trại chủ động lập cho các khoản chi phí hoặc thu nhập phát sinh ngoài luồng mua bán vật tư chính thức. Giao dịch này có nút **Chỉnh sửa** và nút **Xóa**.

#### 2. Lập Phiếu Thu / Phiếu Chi thủ công
1. Nhấn nút màu xanh **Tạo giao dịch**.
2. Trong biểu mẫu:
   - **Loại giao dịch**: Chọn `Khoản thu (INCOME)` hoặc `Khoản chi (EXPENSE)`.
   - **Danh mục**: Chọn danh mục tương ứng từ danh sách đã khai báo.
   - **Số tiền (₫)**: Nhập số tiền giao dịch (dùng ô nhập tiền thông minh, có định dạng dấu phẩy tiếng Việt).
   - **Ngày giao dịch**: Mặc định là ngày hôm nay, có thể chọn lại ngày thực tế phát sinh.
   - **Hình thức thanh toán**: Chọn *Chuyển khoản*, *Tiền mặt*, *Thu hộ (COD)* hoặc *VNPay*.
   - **Gắn với Mùa vụ (tùy chọn nhưng rất quan trọng)**: Nếu khoản chi này phục vụ riêng cho một mùa vụ cụ thể (ví dụ: *Chi mua bạt che sương cho Vụ Cà chua Đông Xuân 2026*), hãy chọn tên mùa vụ tại đây. Số tiền này sẽ **tự động được tính vào Giá thành của mùa vụ đó**.
   - **Ghi chú**: Diễn giải chi tiết nội dung giao dịch.
   - **Ảnh chứng từ đính kèm**: Bấm tải lên ảnh chụp hóa đơn VAT, biên lai chuyển tiền hoặc phiếu thu/chi có chữ ký để lưu trữ bằng chứng.
3. Nhấn **Tạo giao dịch**. Hệ thống sinh mã giao dịch định dạng `TX-2026-XXXX`.

#### 3. Bộ lọc và Tra cứu sổ quỹ
- Xem nhanh 3 thẻ tổng hợp trên đầu trang: **Tổng thu**, **Tổng chi** và **Dòng tiền ròng (Tổng thu - Tổng chi)** tương ứng theo bộ lọc hiện tại.
- Hỗ trợ lọc theo: Loại giao dịch (Tất cả / Thu / Chi), Danh mục, Mùa vụ canh tác, và khoảng thời gian (Từ ngày - Đến ngày).
- Nhấn vào nút **[X ảnh]** tại cột Chứng từ để mở hộp thoại xem lại toàn bộ hóa đơn/biên lai đã tải lên.

---

### Bước 3: Quy trình Trả tiền Đơn mua hàng (PO Payment)

Khi nhập vật tư, phân bón, thức ăn từ nhà cung cấp theo đơn mua hàng (`/admin/purchase-orders`), quy trình thanh toán được thực hiện như sau:

1. Mở trang chi tiết Đơn mua hàng (`/admin/purchase-orders/[id]`).
2. Nhấn nút **Trả tiền** (biểu tượng Thẻ thanh toán).
3. Hộp thoại **Thanh toán đơn mua hàng** hiển thị:
   - Tổng giá trị đơn hàng, số tiền đã trả trước đó và số tiền còn thiếu cần trả.
   - **Số tiền thanh toán (₫)**: Mặc định hiển thị số tiền còn nợ. Kế toán có thể chỉnh sửa nếu chỉ trả trước một phần (thanh toán từng đợt).
   - **Phương thức thanh toán**: Chọn *Chuyển khoản* hoặc *Tiền mặt*.
   - **Ghi chú**: Điền ủy nhiệm chi hoặc số tài khoản chuyển tiền.
4. Nhấn **Xác nhận thanh toán**:
   - Số tiền đã trả trên đơn mua hàng (`paidAmount`) được cập nhật ngay lập tức.
   - **Tự động đồng bộ**: Hệ thống **tự động sinh một Phiếu Chi (`Transaction EXPENSE`)** trong Sổ quỹ giao dịch với danh mục Chi mua hàng và liên kết tham chiếu tới đơn mua hàng này.

---

### Bước 4: Quản lý Công nợ Phải thu Khách hàng (`/admin/finance/receivables`)

Giúp kế toán nông trại theo dõi chặt chẽ các khoản tiền khách hàng còn nợ sau khi mua nông sản:

1. Truy cập **Tài chính** → **Công nợ**.
2. **Bảng chỉ số tổng quan**:
   - **Tổng nợ phải thu**: Tổng số tiền tất cả các khách hàng còn nợ nông trại.
   - **Nợ quá hạn (> 30 ngày)**: Các khoản nợ tồn đọng trên 30 ngày kể từ ngày đặt hàng (hiển thị màu đỏ cảnh báo rủi ro).
   - **Khách hàng đang nợ**: Số lượng đối tác/khách hàng đang có số dư nợ > 0.
   - **Đơn hàng chưa thu đủ**: Số lượng đơn bán hàng chưa thanh toán xong 100%.
3. **Tab 1: Công nợ theo khách hàng (`byCustomer`)**:
   - Bảng tổng hợp từng khách hàng: Mã khách, Tên khách, Số điện thoại.
   - Tổng tiền mua lũy kế, Số tiền đã thanh toán, Số tiền còn nợ (`debt`), và Số lượng đơn hàng.
   - Nhấn vào tên khách hàng để xem chi tiết lịch sử mua sắm hoặc bấm nút **Lọc đơn** để chuyển sang xem các đơn cụ thể của khách đó.
4. **Tab 2: Công nợ theo đơn hàng (`byOrder`)**:
   - Danh sách chi tiết từng đơn hàng còn nợ tiền: Mã đơn (`SO-2026-XXXX`), Khách hàng, Trạng thái đơn, Ngày đặt hàng.
   - Giá trị đơn hàng, Số tiền đã trả, Số tiền còn nợ.
   - **Cột Trạng thái quá hạn**: Đơn hàng quá 30 ngày chưa thanh toán sẽ xuất hiện huy hiệu đỏ **Quá hạn X ngày** kèm biểu tượng cảnh báo tam giác.
   - Nhấn vào biểu tượng **Mũi tên liên kết (Xem đơn hàng)** để chuyển thẳng tới đơn hàng và thực hiện ghi thu tiền ngay khi khách chuyển trả nợ.

---

### Bước 5: Báo cáo Phân tích Tài chính Quản trị (`/admin/finance/reports`)

> **Quy định phân quyền**: Để bảo vệ bí mật kinh doanh, phân hệ Báo cáo tài chính chỉ mở quyền truy cập cho **Chủ trang trại (OWNER)**, **Quản lý (MANAGER)** và **Kế toán (ACCOUNTANT)**. Tài khoản Bán hàng (`SALES`) và Công nhân (`WORKER`) sẽ bị hệ thống từ chối truy cập.

#### 1. Báo cáo Dòng tiền 12 tháng (Cashflow)
- Chọn **Năm xem báo cáo** (ví dụ: `2026`).
- **Biểu đồ kết hợp thông minh (Composed Chart)**:
  - Cột màu xanh lá cây: Tổng thu nhập từng tháng.
  - Cột màu đỏ cam: Tổng chi phí từng tháng.
  - Đường kẻ màu xanh dương: Dòng tiền ròng (Net = Thu - Chi) của tháng đó.
- **Thẻ tóm tắt cả năm**: Tổng thu cả năm, Tổng chi cả năm và Dòng tiền tích lũy ròng.
- **Bảng số liệu chi tiết**: Liệt kê chuẩn xác số tiền Thu, Chi và Dòng tiền ròng của từng tháng từ Tháng 1 đến Tháng 12.

#### 2. Báo cáo Giá thành & Lãi lỗ Mùa vụ (Cycles P&L)
Đây là công cụ quản trị cốt lõi giúp nông trại biết chính xác vụ mùa nào mang lại hiệu quả kinh tế cao nhất:

- **Công thức tính giá thành vụ mùa chuẩn xác**:
  $$\text{Tổng giá thành} = \text{Chi phí vật tư} + \text{Chi phí tiền mặt trực tiếp} + \text{Chi phí nhân công}$$
  - **Chi phí vật tư (Material Cost)**: Tính tự động từ các nhật ký hoạt động xuất kho vật tư (phân bón, hạt giống, thuốc sinh học) cho mùa vụ theo nguyên tắc FIFO (`ActivityMaterial.quantity × unitCost`).
  - **Chi phí trực tiếp (Expense Cost)**: Tổng các giao dịch Chi tiền (`Transaction EXPENSE`) trên sổ quỹ có gắn mã mùa vụ (`cycleId`).
  - **Chi phí nhân công (Labor Cost)**: Tính tự động từ dữ liệu chấm công (`Attendance`) của công nhân lao động trực tiếp có gắn mã mùa vụ.
- **Các chỉ số trên bảng báo cáo mùa vụ**:
  - Mã và tên mùa vụ, Khu/lô đất canh tác, Trạng thái vụ mùa.
  - **Sản lượng thu hoạch**: Tổng số lượng nông sản thu hoạch được (ví dụ: *10.000 kg*).
  - Chi tiết từng cấu phần chi phí: Vật tư + Chi phí ngoài + Tiền công.
  - **Tổng chi phí**: Toàn bộ chi phí sản xuất của vụ mùa.
  - **Giá thành đơn vị (Cost / Unit)**: Chi phí sản xuất trên 1 đơn vị sản phẩm (Tổng chi phí ÷ Sản lượng thu hoạch). *Ví dụ: 12.500 ₫ / kg bưởi.*
  - **Doanh thu bán hàng (Revenue)**: Tổng tiền thực thu từ các đơn hàng bán nông sản xuất từ các lô thu hoạch của mùa vụ này.
  - **Lãi / Lỗ ròng (Profit)**: Doanh thu − Tổng chi phí (hiển thị màu xanh nếu có lãi, màu đỏ nếu bị lỗ).
  - **Tỷ suất lợi nhuận (%)**: Tỷ lệ phần trăm lợi nhuận trên tổng doanh thu.
- **Xem chi tiết chi phí và doanh thu**: Nhấn nút **Xem chi tiết** tại mỗi dòng mùa vụ để mở hộp thoại kiểm tra tường tận từng lần xuất vật tư, từng phiếu chi tiền và từng đơn bán nông sản liên quan.

#### 3. Báo cáo Doanh thu theo Sản phẩm (Top Products)
- Chọn khoảng thời gian cần phân tích: **Từ ngày** - **Đến ngày**.
- Hệ thống hiển thị bảng xếp hạng các mặt hàng nông sản bán chạy nhất:
  - Biểu tượng Cúp vàng cho sản phẩm quán quân doanh số.
  - Tên sản phẩm và đơn vị tính (kg, quả, hộp, bó).
  - **Số lượng đã tiêu thụ**: Tổng sản lượng bán được trong kỳ.
  - **Tổng doanh thu mang lại (₫)**: Lũy kế doanh số bán hàng của sản phẩm.
  - **Tỷ trọng doanh thu (%)**: Phần trăm đóng góp của sản phẩm vào tổng doanh thu toàn trang trại.

---

## 4. Những nguyên tắc và lưu ý tài chính quan trọng

- **Tính toàn vẹn của sổ quỹ tự động**: Tuyệt đối không xóa đơn hàng bán hoặc đơn mua hàng một cách tùy tiện sau khi đã phát sinh các giao dịch thanh toán. Khi cần hoàn tiền cho khách, hãy lập phiếu chi tương ứng với lý do rõ ràng.
- **Gắn mã mùa vụ khi chi tiền**: Khi nhân viên hoặc quản lý chi tiền mua sắm các loại công cụ, màng phủ, phân bón dùng riêng cho một khu vực hoặc một mùa vụ cụ thể, **bắt buộc phải chọn đúng Mùa vụ liên quan** trong biểu mẫu tạo giao dịch. Nếu bỏ trống trường này, chi phí sẽ bị tính vào chi phí chung và làm sai lệch báo cáo giá thành mùa vụ.
- **Đính kèm chứng từ hợp lệ**: Khuyến khích nhân viên luôn chụp ảnh hóa đơn, biên nhận và tải lên trường *Ảnh chứng từ* khi tạo giao dịch chi tiền để phục vụ công tác kiểm toán nội bộ cuối năm của Chủ trang trại.
- **Rà soát công nợ định kỳ**: Kế toán nên kiểm tra tab *Công nợ theo đơn hàng* vào mỗi thứ Hai đầu tuần, lọc các đơn nợ quá hạn > 30 ngày để phối hợp với nhân viên kinh doanh đôn đốc khách hàng thanh toán đúng hạn.
