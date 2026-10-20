# Sổ Tay Hướng Dẫn Sử Dụng Hệ Thống XFarm ERP

Chào mừng bạn đến với hệ thống quản lý và vận hành tích hợp cho trang trại sinh thái thông minh **XFarm ERP**. 

Tài liệu này được biên soạn dành cho người dùng cuối tại nông trại — bao gồm Chủ trang trại, Quản lý vận hành, Kế toán, Nhân viên kinh doanh và Công nhân lao động trực tiếp. Mọi hướng dẫn đều sử dụng ngôn ngữ trực quan, bám sát các màn hình thực tế của hệ thống, giúp bạn dễ dàng nắm bắt và thao tác nhanh chóng trong công việc hằng ngày.

---

## 1. Mục lục tài liệu hướng dẫn

Hệ thống tài liệu hướng dẫn sử dụng bao gồm các phân hệ sau:

1. **[Khu/lô & Bản đồ số nông trại](./areas-and-map.md)**: Hướng dẫn quản lý phân vùng đất đai, chuồng trại, diện tích canh tác, vẽ ranh giới trên bản đồ số và in mã QR định danh khu/lô.
2. **[Mùa vụ & Nhật ký canh tác điện tử](./cycles-and-activities.md)**: Quản lý vòng đời mùa vụ cây trồng, vật nuôi, thủy sản; ghi chép nhật ký nông vụ và theo dõi tiến độ sản xuất.
3. **[Quản lý Đàn & Cá thể vật nuôi](./animals.md)**: Theo dõi quy mô tổng đàn, quản lý chi tiết từng cá thể theo mã thẻ tai, theo dõi phả hệ gia đình và lịch sử sự kiện (tiêm phòng, dùng thuốc, cân nặng).
4. **[Lịch nông vụ](./calendar.md)**: Trực quan hóa kế hoạch mùa vụ và công việc chăm sóc theo dạng lịch tháng, hỗ trợ lọc theo khu vực và loại mùa vụ.
5. **[Quản lý Kho & Mua hàng](./inventory-and-purchasing.md)**: Quản lý danh mục vật tư, thẻ kho, theo dõi tồn kho theo hạn dùng (FIFO), lập các phiếu nhập/xuất/chuyển/kiểm kê kho và quy trình đặt mua hàng.
6. **[Hệ thống Cảnh báo thông minh](./alerts.md)**: Theo dõi chuông thông báo, quản lý cảnh báo tồn kho thấp dưới ngưỡng, cảnh báo lô vật tư/nông sản sắp hết hạn hoặc đã quá hạn.
7. **[Thu hoạch & Truy xuất nguồn gốc QR](./harvest-and-traceability.md)**: Quản lý lô nông sản thu hoạch, cấp mã truy xuất nguồn gốc, in tem nhãn QR dán bao bì và trang tra cứu thông tin dành cho khách hàng.
8. **[Website giới thiệu & Quản trị nội dung CMS](./website-and-cms.md)**: Quản lý thông tin giới thiệu nông trại, danh mục nông sản, viết bài chia sẻ kinh nghiệm trên blog và cấu hình mã thanh toán VietQR tự động.
9. **[Nhân sự, Chấm công & Bảng lương](./human-resources.md)**: Quản lý hồ sơ người lao động, giao việc hằng ngày, theo dõi chấm công vào/ra ca, tính lương tự động và quy trình xét duyệt chi trả lương.
10. **[Ứng dụng di động cho Công nhân (PWA & Dùng ngoại tuyến)](./worker-pwa.md)**: Hướng dẫn sử dụng giao diện di động trên điện thoại, nhận việc trong ngày, chấm công, ghi nhanh nhật ký ngoài đồng ruộng ngay cả khi mất sóng điện thoại (Offline).
11. **[Bán hàng & Quản lý Khách hàng](./sales-and-customers.md)**: Quản lý thông tin khách hàng, phân loại đại lý/khách sỉ, lập đơn bán hàng, xác nhận xuất kho FIFO tự động, quản lý vận chuyển, hủy hoàn kho, ghi nhận thu tiền và in hóa đơn/phiếu giao hàng kèm VietQR.
12. **[Cửa hàng trực tuyến (Webshop) & Bán hàng Online](./webshop.md)**: Hướng dẫn trải nghiệm mua sắm cho khách hàng (giỏ hàng, đặt hàng vãng lai, quét mã chuyển khoản VietQR, tra cứu đơn công khai) và quy trình xử lý đơn WEBSHOP nổi bật cho nhân viên bán hàng.
13. **[Tài chính, Sổ quỹ & Phân tích Lãi lỗ](./finance.md)**: Quản lý cây danh mục thu chi, sổ quỹ giao dịch thủ công & tự động, thanh toán đơn mua hàng PO, quản lý công nợ khách hàng và báo cáo tài chính quản trị (dòng tiền 12 tháng, giá thành & lãi lỗ mùa vụ, doanh thu sản phẩm).

> **Lưu ý về các phân hệ trong lộ trình phát triển**:
> Các phân hệ sau trên thanh menu đang được đánh dấu **"Sắp có"** và sẽ được bổ sung, cập nhật tài liệu trong các giai đoạn tiếp theo của dự án:
> - **Du lịch trải nghiệm** (`/admin/tours`): Đặt vé tour tham quan, trải nghiệm nông trại, quản lý lịch đoàn khách.
> - **Thiết bị & IoT** (`/admin/iot`): Kết nối trạm quan trắc thời tiết, cảm biến độ ẩm đất, thiết bị tưới tự động.
> - **Bảng tin tổng quan (Dashboard nâng cao)** (`/admin`): Trung tâm phân tích báo cáo đồ thị thông minh toàn diện.

---

## 2. Hướng dẫn Đăng nhập và Đăng xuất

### 2.1. Đăng nhập hệ thống

- **Bước 1**: Mở trình duyệt web (Google Chrome, Safari, Firefox hoặc Cốc Cốc) và truy cập vào địa chỉ đường dẫn của hệ thống (ví dụ: `https://erp.xfarm.vn/login` hoặc theo địa chỉ nội bộ do quản trị viên cấp).
- **Bước 2**: Tại màn hình **Đăng nhập XFarm**:
  1. Nhập **Địa chỉ Email** đã được cấp tài khoản (ví dụ: `admin@xfarm.local`, `quanly@xfarm.local`, hoặc email của bạn).
  2. Nhập **Mật khẩu** tương ứng.
- **Bước 3**: Nhấn nút **Đăng nhập**.
  - Nếu thông tin chính xác, hệ thống sẽ tự động chuyển hướng bạn vào giao diện làm việc chính (`/admin`).
  - Nếu sai thông tin hoặc tài khoản bị khóa, hệ thống sẽ hiển thị thông báo lỗi màu đỏ (ví dụ: *Email hoặc mật khẩu không chính xác* hoặc *Tài khoản đã bị tạm khóa*). Khi gặp lỗi này, vui lòng kiểm tra lại bàn phím (tắt Caps Lock/bộ gõ tiếng Việt) hoặc liên hệ Chủ trang trại để được hỗ trợ cấp lại mật khẩu.

### 2.2. Đăng xuất an toàn

Sau khi kết thúc ca làm việc hoặc khi sử dụng trên máy tính dùng chung:
- **Trên máy tính**: Nhìn lên góc trên cùng bên phải thanh công cụ (Header), cạnh tên của bạn, nhấn vào nút **Đăng xuất** (có biểu tượng cửa và mũi tên màu đỏ).
- **Trên ứng dụng di động công nhân**: Nhấn vào nút biểu tượng **Đăng xuất** ở góc trên bên phải thanh tiêu đề màn hình.
- Hệ thống sẽ xóa phiên đăng nhập trên thiết bị và đưa bạn trở về màn hình đăng nhập ban đầu.

---

## 3. Các vai trò người dùng và Ma trận phân quyền (RBAC)

Trong nông trại XFarm, mỗi thành viên đảm nhận một vị trí công việc riêng biệt. Hệ thống phân chia thành 5 vai trò chính với quyền hạn rõ ràng, đảm bảo tính bảo mật và chuyên môn hóa:

### 3.1. Ý nghĩa từng vai trò

1. **Chủ trang trại (OWNER)**:
   - Người đứng đầu nông trại, nắm toàn quyền quyết định trên hệ thống.
   - Quản trị toàn bộ danh mục tài khoản người dùng, cấp quyền, khóa tài khoản.
   - Xem toàn bộ báo cáo, duyệt và là người **duy nhất có quyền bấm "Xác nhận chi trả"** các bảng lương.
   - Có quyền kích hoạt các lệnh kiểm tra kho toàn diện.

2. **Quản lý vận hành (MANAGER)**:
   - Trực tiếp điều hành sản xuất nông vụ và công việc hằng ngày tại trang trại.
   - Thêm mới, chỉnh sửa, khóa/mở khóa khu/lô đất, vẽ ranh giới bản đồ.
   - Tạo mùa vụ, chuyển đổi trạng thái mùa vụ, ghi và duyệt nhật ký sản xuất.
   - Quản lý đàn gia súc, ghi nhận các biến động lớn (phối giống, sinh sản, xuất bán, khai tử).
   - Lập các phiếu nhập, xuất, chuyển, kiểm kê kho; duyệt nhận hàng từ nhà cung cấp.
   - Giao việc cho công nhân, quản lý chấm công, xem cảnh báo kho bãi.
   - Quản lý bán hàng, xác nhận xuất kho đơn hàng, tiếp nhận đơn webshop.
   - Không có quyền quản trị tài khoản người dùng và không có quyền bấm chi trả lương.

3. **Kế toán trang trại (ACCOUNTANT)**:
   - Theo dõi số liệu kho, chi phí sản xuất, giá vốn và tiền lương.
   - Xem danh mục khu/lô, mùa vụ, nhật ký sản xuất để phục vụ tính giá thành (nhưng không chỉnh sửa quy trình canh tác).
   - Quản lý danh mục nhà cung cấp, lập và gửi đơn đặt hàng (PO), thực hiện **Trả tiền đơn mua hàng (PO)**.
   - Quản lý phân hệ Tài chính: cây danh mục thu chi, sổ quỹ giao dịch tiền mặt/ngân hàng, theo dõi và đối soát công nợ khách hàng.
   - Xem và phân tích các báo cáo tài chính: Dòng tiền 12 tháng, Báo cáo giá thành & lãi lỗ từng vụ mùa, Báo cáo doanh thu sản phẩm.
   - Xem tồn kho, thẻ kho, xem giá vốn (`unitCost`, `totalCost`).
   - Lập bảng tính lương tháng cho toàn bộ nhân viên, thực hiện **Duyệt bảng lương** gửi Chủ trại thanh toán.
   - Không được thao tác trực tiếp các phiếu xuất nhập kho thực tế (nhập kho phải do Quản lý/Thủ kho thực hiện).

4. **Nhân viên Bán hàng & Tiếp thị (SALES)**:
   - Phụ trách truyền thông hình ảnh nông trại và phân phối sản phẩm ra thị trường.
   - Quản lý hồ sơ khách hàng, phân loại khách lẻ, khách sỉ, đại lý và theo dõi công nợ của khách.
   - Lập và xử lý đơn bán hàng tại quầy (`ADMIN`), tiếp nhận và xử lý đơn hàng trực tuyến (`WEBSHOP`).
   - Thực hiện quy trình đơn hàng: xác nhận xuất kho theo FIFO, chuyển đóng gói, giao hàng, hoàn tất và ghi nhận thu tiền.
   - In ấn hóa đơn bán lẻ và phiếu giao hàng kèm mã VietQR cho khách.
   - Quản trị nội dung website: Đăng sản phẩm mới lên website giới thiệu, viết bài chia sẻ quy trình canh tác hữu cơ trên blog.
   - Tra cứu danh mục mùa vụ, sản phẩm thu hoạch và mã QR truy xuất nguồn gốc để gửi thông tin cho khách hàng.
   - **Bảo mật**: Không được phép truy cập vào sổ quỹ kế toán chi tiết, không xem báo cáo tài chính quản trị/giá thành mùa vụ, bảng lương nhân viên hay phiếu điều chỉnh kho.

5. **Công nhân nông trại (WORKER)**:
   - Lực lượng lao động trực tiếp ngoài đồng ruộng, chuồng trại và ao nuôi.
   - Sử dụng giao diện di động rút gọn (`/admin/m`).
   - Xem danh sách công việc hôm nay được giao, bấm "Bắt đầu làm" và "Hoàn thành" kèm ảnh chụp kết quả.
   - Tự chấm công vào ca và hết ca hằng ngày, ghi nhận sản lượng khoán (nếu có).
   - Ghi nhanh nhật ký canh tác (tưới nước, bón phân, làm cỏ, cho ăn...) theo đúng khu vực mình làm việc.
   - Được phép ghi 3 loại sự kiện cơ bản cho vật nuôi: Tiêm phòng, Dùng thuốc điều trị, Cân trọng lượng.
   - **Bảo mật**: Công nhân chỉ nhìn thấy số lượng tồn kho thực tế để lấy dùng, tuyệt đối không nhìn thấy giá vốn/tiền bạc, không thấy người dùng khác và không thể can thiệp dữ liệu kế toán/hành chính.

---

### 3.2. Bảng ma trận phân quyền tóm tắt theo phân hệ

| Phân hệ / Tính năng | Chủ trại (OWNER) | Quản lý (MANAGER) | Kế toán (ACCOUNTANT) | Bán hàng (SALES) | Công nhân (WORKER) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Quản trị người dùng** (`/admin/users`) | Toàn quyền | Không | Không | Không | Không |
| **Khu/lô & Bản đồ** (`/admin/areas`) | Toàn quyền | Toàn quyền | Chỉ xem | Chỉ xem | Chỉ xem (để làm việc) |
| **Mùa vụ** (`/admin/cycles`) | Toàn quyền | Toàn quyền | Xem & Xem chi phí công | Chỉ xem | Chỉ xem (để ghi nhật ký) |
| **Nhật ký canh tác** (`/admin/activities`) | Toàn quyền | Toàn quyền | Chỉ xem | Chỉ xem | Ghi & sửa của mình |
| **Đàn & Cá thể vật nuôi** (`/admin/animals`) | Toàn quyền | Toàn quyền | Chỉ xem | Chỉ xem | Chỉ ghi Tiêm/Thuốc/Cân |
| **Lịch nông vụ** (`/admin/calendar`) | Xem | Xem | Xem | Xem | Xem |
| **Danh mục kho & Tồn kho** (`/admin/inventory`) | Toàn quyền | Toàn quyền | Xem (gồm giá vốn) | Chỉ xem vật tư | Chỉ xem số lượng tồn |
| **Phiếu kho (Nhập/Xuất/Kiểm)** | Toàn quyền | Toàn quyền | Chỉ xem phiếu | Không | Không |
| **Nhà cung cấp & Đơn mua hàng (PO)** | Toàn quyền | Toàn quyền | Lập & Duyệt đặt hàng | Không | Không |
| **Trả tiền đơn mua hàng (PO Pay)** | Toàn quyền | Toàn quyền | Duyệt & Chi trả | Không | Không |
| **Thu hoạch & Tem QR** (`/admin/harvest-lots`) | Toàn quyền | Toàn quyền | Chỉ xem | Chỉ xem & Lấy link | Không |
| **Cảnh báo thông minh** (`/admin/alerts`) | Toàn quyền | Toàn quyền | Không | Không | Không |
| **Website: Sản phẩm & Bài viết** | Toàn quyền | Toàn quyền | Chỉ xem | Đăng & Sửa | Không |
| **Website: Cài đặt nông trại & VietQR** | Toàn quyền | Toàn quyền | Không | Không | Không |
| **Khách hàng** (`/admin/sales/customers`) | Toàn quyền | Toàn quyền | Xem & Quản lý nợ | Toàn quyền | Không |
| **Đơn bán hàng** (`/admin/sales/orders`) | Toàn quyền | Toàn quyền | Xem & Thu tiền | Toàn quyền | Không |
| **In hóa đơn & Phiếu giao hàng** | Toàn quyền | Toàn quyền | In được | In được | Không |
| **Cửa hàng Webshop (Khách đặt)** | Toàn quyền | Toàn quyền | Xem đơn | Tiếp nhận đơn | Khách công khai |
| **Danh mục thu chi** (`/admin/finance/categories`) | Toàn quyền | Xem & Tạo | Toàn quyền | Không | Không |
| **Sổ quỹ & Giao dịch** (`/admin/finance/transactions`) | Toàn quyền | Xem & Chi ngoài | Toàn quyền | Không | Không |
| **Công nợ phải thu** (`/admin/finance/receivables`) | Toàn quyền | Xem | Toàn quyền | Xem khách nợ | Không |
| **Báo cáo tài chính & Giá thành** (`/admin/finance/reports`) | Toàn quyền | Toàn quyền | Toàn quyền | **Bị chặn** | **Bị chặn** |
| **Hồ sơ nhân viên & Giao việc** | Toàn quyền | Toàn quyền | Chỉ xem hồ sơ | Không | Nhận việc của mình |
| **Chấm công** (`/admin/hr/attendance`) | Toàn quyền | Toàn quyền | Xem & Tính lương | Không | Tự chấm công của mình |
| **Bảng lương: Lập & Duyệt** | Duyệt & Chi | Không | Lập & Trình duyệt | Không | Không |
| **Bảng lương: Xác nhận chi trả** | **Duy nhất** | Không | Không | Không | Không |
| **Ứng dụng di động PWA** (`/admin/m`) | Dùng được | Dùng được | Không cần | Không cần | **Giao diện chính** |

---

## 4. Giao diện làm việc chung

Khi đăng nhập thành công vào hệ thống, màn hình làm việc được bố trí khoa học gồm 3 khu vực chính:

1. **Thanh menu bên trái (Sidebar)**:
   - Chứa danh sách các phân hệ nghiệp vụ chính của nông trại.
   - Hiển thị thông tin người dùng đang đăng nhập và nhãn vai trò ở góc dưới.
   - Trên thiết bị di động hoặc máy tính bảng, thanh menu này được thu gọn vào nút biểu tượng **3 dấu gạch ngang (Menu)** ở góc trên bên trái.

2. **Thanh công cụ phía trên (Top Header)**:
   - **Nút Menu di động**: Bật/tắt thanh điều hướng khi dùng màn hình nhỏ.
   - **Chuông thông báo (Notification Bell)**: Hiển thị chấm đỏ kèm số lượng cảnh báo tồn kho hoặc lô hàng cần chú ý chưa đọc. Nhấn vào chuông để xem danh sách tóm tắt hoặc chuyển tới trang Cảnh báo.
   - **Lời chào & Thông tin tài khoản**: Hiển thị họ tên và huy hiệu vai trò của bạn.
   - **Nút Đăng xuất**: Thoát khỏi tài khoản làm việc hiện tại.

3. **Vùng nội dung chính (Main Content)**:
   - Khu vực hiển thị bảng dữ liệu, biểu mẫu thao tác, bản đồ số hoặc lịch nông nghiệp.
   - Hầu hết các bảng dữ liệu đều hỗ trợ **ô tìm kiếm nhanh**, **bộ lọc theo trạng thái**, và **phân trang** (Trang trước/Trang sau) ở cuối bảng.

---

## 5. Những nguyên tắc và lưu ý quan trọng

- **Bảo mật tài khoản**: Không chia sẻ mật khẩu của bạn cho người khác. Khi công nhân dùng chung máy tính bảng của đội, cần đăng xuất tài khoản khi bàn giao ca.
- **Tính toàn vẹn của dữ liệu kho**: Hệ thống vận hành theo nguyên tắc tự động xuất kho theo lô hạn dùng trước (FIFO) và **tuyệt đối chặn tồn kho âm**. Nếu số lượng trong kho không đủ, phiếu xuất kho sẽ bị hệ thống từ chối.
- **Truy xuất nguồn gốc minh bạch**: Dữ liệu nhật ký canh tác và lô thu hoạch khi đã bật "Công khai truy xuất" sẽ hiển thị trực tiếp cho người tiêu dùng tra cứu qua mã QR. Do đó, các kỹ sư và công nhân cần ghi chép trung thực, chính xác các loại phân bón và thời gian cách ly.
- **Kỷ luật sổ quỹ tài chính**: Mọi giao dịch thu chi phát sinh tự động từ Bán hàng và Mua hàng đều có tính toàn vẹn cao, không được sửa/xóa thủ công để đảm bảo số liệu báo cáo luôn phản ánh trung thực thực trạng tài chính của nông trại.
