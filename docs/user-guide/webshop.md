# Hướng Dẫn Sử Dụng Phân Hệ: Cửa Hàng Trực Tuyến (Webshop) & Bán Hàng Online

Phân hệ **Cửa hàng trực tuyến (Webshop)** là kênh bán lẻ nông sản tự động được tích hợp trực tiếp trên cổng thông tin website của nông trại XFarm. Phân hệ kết nối liền mạch hai đầu trải nghiệm: giúp người tiêu dùng dễ dàng đặt mua nông sản hữu cơ tươi sạch từ mọi nơi, đồng thời cung cấp cho đội ngũ vận hành nông trại quy trình tiếp nhận, xác nhận xuất kho và giao vận đơn hàng trực tuyến chuyên nghiệp.

---

## 1. Mục đích sử dụng

- **Mở rộng kênh tiêu thụ trực tiếp (D2C - Direct to Consumer)**: Giúp nông trại bán trực tiếp nông sản tới tay người tiêu dùng cuối mà không qua khâu trung gian, gia tăng giá trị thương hiệu và biên lợi nhuận.
- **Trải nghiệm mua sắm tiện lợi 24/7**: Khách hàng vãng lai có thể chọn mua nông sản, kiểm tra giỏ hàng và đặt hàng mọi lúc mà không cần tạo tài khoản rườm rà.
- **Thanh toán VietQR động tiện lợi và chính xác**: Tự động sinh mã QR chuyển khoản chuẩn Napas/VietQR với đúng số tài khoản trang trại, số tiền đơn hàng và cú pháp nội dung là mã đơn; giảm thiểu 100% rủi ro chuyển khoản sai thông tin.
- **Tra cứu hành trình đơn hàng minh bạch và bảo mật**: Khách hàng chủ động theo dõi tình trạng đơn (chờ duyệt, đã xuất kho, đang giao hàng, hoàn tất) chỉ với mã đơn và số điện thoại.
- **Tự động đồng bộ với hệ thống ERP lõi**: Toàn bộ đơn hàng online đổ về hệ thống quản trị nội bộ (`SalesOrder` kênh `WEBSHOP`), tích hợp cơ chế cảnh báo đơn mới nổi bật, trừ kho theo lô hạn dùng (FIFO) và đồng bộ sổ quỹ tài chính khi thu tiền.

---

## 2. Quy trình Bán hàng Trực tuyến Tổng thể

```
[Khách duyệt sản phẩm] 
         ↓
[Thêm vào Giỏ hàng (/gio-hang)] 
         ↓
[Điền thông tin & Đặt hàng (/thanh-toan)] 
         ↓
[Đặt hàng thành công (/dat-hang-thanh-cong/[code])] ──(Quét mã VietQR chuyển khoản)
         ↓
[Hệ thống ERP: Xuất hiện đơn WEBSHOP MỚI (PENDING)]
         ↓
[Nhân viên gọi xác nhận & bấm Xác nhận xuất kho (FIFO)]
         ↓
[Đóng gói (PACKING) → Giao hàng (SHIPPING) → Hoàn tất (COMPLETED)]
         ↓
[Khách chủ động theo dõi tiến độ tại /tra-cuu-don]
```

---

## 3. Trải nghiệm Mua sắm Dành cho Khách hàng

### 3.1. Chọn mua nông sản & Thêm vào giỏ hàng
1. Khách hàng truy cập trang chủ hoặc trang **Sản phẩm** (`/san-pham`) trên website nông trại.
2. Tại từng sản phẩm (ví dụ: *Gạo ST25 hữu cơ*, *Cam sành sinh thái*, *Rau cải kale*):
   - Xem hình ảnh thực tế, mô tả quy trình canh tác và giá bán niêm yết.
   - Nhấn nút **Thêm vào giỏ hàng**.
3. Biểu tượng Giỏ hàng trên thanh tiêu đề website sẽ tự động cập nhật số lượng món hàng đã chọn. Toàn bộ giỏ hàng được lưu trữ an toàn trong bộ nhớ trình duyệt của khách (`localStorage`), giúp giỏ hàng không bị mất khi tải lại trang.

### 3.2. Quản lý Giỏ hàng (`/gio-hang`)
1. Nhấp vào biểu tượng **Giỏ hàng** trên góc phải website hoặc truy cập đường dẫn `/gio-hang`.
2. Màn hình giỏ hàng hiển thị:
   - Danh sách các mặt hàng đã chọn kèm hình ảnh, tên sản phẩm và đơn giá hiện hành (được đồng bộ trực tiếp theo thời gian thực từ hệ thống ERP).
   - Ô điều chỉnh số lượng: Khách có thể nhấn **+ (Tăng)**, **- (Giảm)** hoặc nhập số lượng mong muốn.
   - Nút **Xóa (biểu tượng Thùng rác)** để bỏ mặt hàng khỏi giỏ.
   - Cột **Tạm tính**: Tự động tính lại thành tiền của từng dòng và tổng số tiền của cả giỏ hàng.
3. Khi đã chọn đủ các món hàng mong muốn, nhấn nút màu xanh lá **Tiến hành đặt hàng** để chuyển sang bước thanh toán.

### 3.3. Điền thông tin giao nhận & Đặt hàng (`/thanh-toan`)
1. Tại trang **Thông tin thanh toán** (`/thanh-toan`), khách hàng điền các trường bắt buộc:
   - **Họ và tên người nhận**: Tên người nhận hàng (ví dụ: *Trần Thị Mai*).
   - **Số điện thoại**: Số di động đang hoạt động để shipper liên hệ khi giao hàng (ví dụ: *0912 345 678*).
   - **Địa chỉ giao hàng**: Địa chỉ cụ thể nhận hàng (ví dụ: *Số 15 ngõ 82 phố Kim Mã, Ba Đình, Hà Nội*).
   - **Ghi chú đơn hàng**: Lời dặn dò thêm (ví dụ: *Giao vào buổi chiều sau 15h, gọi trước khi đến 15 phút*).
2. **Chọn hình thức thanh toán**:
   - `Thanh toán khi nhận hàng (COD)`: Khách hàng thanh toán tiền mặt trực tiếp cho nhân viên giao hàng khi nhận kiện nông sản.
   - `Chuyển khoản ngân hàng (VietQR)`: Thanh toán quét mã QR qua ứng dụng ngân hàng ngay sau khi tạo đơn.
3. Kiểm tra lại bảng tóm tắt đơn hàng (danh sách sản phẩm, số lượng, tổng tiền thanh toán).
4. Nhấn nút **Xác nhận đặt hàng**. Hệ thống tiến hành khởi tạo đơn hàng, làm sạch giỏ hàng và điều hướng tới trang thông báo kết quả.

### 3.4. Đặt hàng thành công & Quét mã thanh toán VietQR (`/dat-hang-thanh-cong/[code]`)
1. Màn hình chúc mừng hiển thị mã đơn hàng chính thức vừa sinh ra (ví dụ: `SO-2026-0042`).
2. **Nếu chọn phương thức Chuyển khoản ngân hàng (VietQR)**:
   - Hệ thống tự động vẽ một **mã VietQR động chuẩn** trên màn hình.
   - Khách hàng chỉ cần mở bất kỳ ứng dụng ngân hàng di động (Vietcombank, MB Bank, Techcombank, BIDV, Agribank...) hoặc ví điện tử và chọn tính năng **Quét mã QR**.
   - **Ưu điểm vượt trội**: Ứng dụng ngân hàng sẽ tự động điền sẵn chính xác 100% các trường:
     - Số tài khoản nông trại.
     - Tên ngân hàng thụ hưởng.
     - Số tiền cần chuyển (khớp từng đồng với tổng giá trị đơn hàng).
     - Nội dung chuyển khoản: Đúng mã đơn hàng `SO-2026-0042`.
   - Hệ thống cũng cung cấp các nút **Sao chép (Copy)** nhanh một chạm cho Số tài khoản, Tên chủ tài khoản và Nội dung chuyển khoản để khách hàng dễ dàng dán vào ứng dụng nếu thao tác trên cùng một điện thoại.
3. Khách hàng có thể nhấn nút **Theo dõi đơn hàng** để chuyển sang trang tra cứu tiến độ vận chuyển.

### 3.5. Tra cứu tiến độ đơn hàng công khai & bảo mật (`/tra-cuu-don`)
Khách hàng không cần đăng nhập tài khoản hệ thống nhưng vẫn có thể theo dõi đơn hàng của mình bất kỳ lúc nào:

1. Truy cập trang **Tra cứu đơn hàng** (`/tra-cuu-don`) trên thanh điều hướng website.
2. Nhập 2 thông tin xác thực an toàn:
   - **Mã đơn hàng**: Mã đơn được cấp khi đặt hàng (ví dụ: `SO-2026-0042`).
   - **Số điện thoại người nhận**: Đúng số điện thoại đã nhập lúc thanh toán.
   - *Lưu ý bảo mật*: Bắt buộc phải khớp cả 2 trường thông tin này hệ thống mới hiển thị dữ liệu, ngăn chặn việc người lạ dò xem đơn của người khác.
3. Nhấn **Tra cứu đơn hàng**.
4. Kết quả tra cứu trực quan hiển thị:
   - **Tiến trình xử lý**: Huy hiệu trạng thái đơn hàng:
     - `Chờ xác nhận (PENDING)`: Nông trại đã tiếp nhận đơn và đang kiểm tra hàng trong kho.
     - `Đã xác nhận (CONFIRMED)`: Nông trại đã xuất kho nông sản và đang chuẩn bị đóng gói.
     - `Hoàn thành (COMPLETED)`: Kiện hàng đã được giao tận tay người nhận thành công.
     - `Đã hủy (CANCELLED)`: Đơn hàng bị hủy do hết hàng hoặc theo yêu cầu của khách.
   - **Tình trạng thanh toán**: `Chưa thanh toán (UNPAID)` hoặc `Đã thanh toán (PAID)`.
   - Danh sách chi tiết các mặt hàng, số lượng, đơn giá và tổng số tiền thanh toán.

---

## 4. Quy trình Xử lý Đơn WEBSHOP Dành cho Nhân viên Nông trại

Tất cả các đơn hàng phát sinh từ Webshop sẽ đổ về phân hệ quản trị nội bộ tại trang **Đơn hàng** (`/admin/sales/orders`).

### 4.1. Nhận diện đơn mới với Huy hiệu "WEBSHOP MỚI"
- Trong danh sách đơn hàng, các đơn từ website sẽ có nhãn kênh là **Webshop**.
- Đặc biệt, đối với các đơn hàng mới phát sinh đang ở trạng thái **Chờ xử lý (PENDING)**, hệ thống sẽ tự động hiển thị huy hiệu nhấp nháy màu cam nổi bật:
  ```
  [● WEBSHOP MỚI] (hiệu ứng nhấp nháy phát sáng)
  ```
- Tính năng này giúp nhân viên trực bán hàng nhanh chóng nhận biết đơn hàng mới phát sinh từ khách online mà không bỏ sót hoặc để khách chờ đợi lâu.

### 4.2. Liên hệ xác nhận với khách hàng
1. Nhân viên nhấn vào mã đơn hàng để mở trang chi tiết (`/admin/sales/orders/[id]`).
2. Xem thông tin người nhận (Họ tên, Số điện thoại, Địa chỉ giao nhận, Ghi chú đơn).
3. Gọi điện thoại cho khách theo số điện thoại ghi trên đơn:
   - Xác nhận lại danh sách sản phẩm và số lượng.
   - Xác nhận địa chỉ nhận hàng và thời gian giao thuận tiện cho khách.
   - Nếu khách chọn chuyển khoản, kiểm tra thông báo biến động số dư tài khoản ngân hàng xem tiền đã về hay chưa.

### 4.3. Xuất kho nông sản (Nguyên tắc FIFO)
1. Sau khi đã xác nhận với khách, nhấn nút **Xác nhận đơn**.
2. Chọn **Kho xuất hàng** (ví dụ: *Kho lạnh bảo quản nông sản* hoặc *Kho thành phẩm đóng gói*).
3. Nhấn **Xác nhận xuất kho**.
4. Hệ thống sẽ tự động tìm các lô nông sản thu hoạch gần nhất theo nguyên tắc FIFO để trừ tồn kho. Nếu kho hết hàng, hệ thống báo lỗi không đủ tồn kho để nhân viên kịp thời báo khách đổi mặt hàng khác hoặc hẹn ngày giao sau đợt thu hoạch kế tiếp.

### 4.4. Đóng gói, Giao hàng và Ghi nhận tiền
1. **Đóng gói**: Khi đóng thùng xốp, dán nhãn địa chỉ xong, nhân viên nhấn **Đóng gói** (`PACKING`). Có thể bấm **In phiếu giao hàng** dán lên mặt thùng hàng.
2. **Giao hàng**: Khi bàn giao cho bưu tá hoặc shipper mang đi, nhấn **Giao hàng** (`SHIPPING`).
3. **Thu tiền**:
   - Nếu khách đã chuyển khoản trước: Nhân viên vào thẻ *Thanh toán & Thu tiền*, chọn hình thức *Chuyển khoản*, nhập mã giao dịch ngân hàng và bấm **Ghi nhận thanh toán**.
   - Nếu đơn chọn COD: Khi shipper giao hàng thành công và nộp lại tiền mặt, nhân viên chọn hình thức *Thu hộ (COD)* hoặc *Tiền mặt* và bấm **Ghi nhận thanh toán**.
   - Hệ thống tự động sinh một giao dịch Thu (`Transaction INCOME`) vào sổ quỹ kế toán của trang trại.
4. **Hoàn tất đơn**: Nhấn nút **Hoàn tất** (`COMPLETED`) để kết thúc quy trình đơn hàng.

---

## 5. Cấu hình Tài khoản Ngân hàng VietQR Nông trại

Để mã QR chuyển khoản VietQR trên trang đặt hàng thành công hoạt động chính xác với tài khoản ngân hàng của nông trại:

1. Quản trị viên (`OWNER` hoặc `MANAGER`) truy cập **Cài đặt hệ thống / Website**.
2. Tìm đến mục **Cấu hình thanh toán VietQR (`bank.vietqr`)**.
3. Điền các tham số tài khoản ngân hàng chính thức của nông trại:
   - **Mã ngân hàng (Bank Code)**: Mã viết tắt chuẩn theo Napas (ví dụ: `VCB` cho Vietcombank, `TCB` cho Techcombank, `MB` cho Ngân hàng Quân Đội, `ICB` cho VietinBank, `BIDV` cho BIDV...).
   - **Số tài khoản (Account Number)**: Số tài khoản ngân hàng thụ hưởng của trang trại.
   - **Tên chủ tài khoản (Account Name)**: Tên đầy đủ in hoa không dấu của chủ tài khoản (ví dụ: `CONG TY CO PHAN NONG NGHIEP XFARM` hoặc `NGUYEN VAN CHU`).
4. Nhấn **Lưu cấu hình**.
5. Kể từ thời điểm này, mọi đơn hàng mới trên Webshop và mã QR in trên hóa đơn bán hàng sẽ tự động sử dụng thông tin ngân hàng mới này để phát sinh mã QR chuyển khoản.

---

## 6. Lưu ý Vận hành & Xử lý Tình huống

- **Khách đặt hàng nhưng chuyển khoản chậm**: Đơn hàng vẫn được giữ ở trạng thái `PENDING`. Nhân viên có thể gọi điện nhắc khách quét mã VietQR trên trang đặt hàng thành công. Sau 24 giờ nếu khách không chuyển khoản và không phản hồi, nhân viên có quyền bấm **Hủy đơn**.
- **Khách chuyển khoản thừa hoặc thiếu tiền**: Nhân viên ghi nhận đúng số tiền thực nhận vào thẻ thanh toán. Hệ thống sẽ ghi nhận trạng thái **Thanh toán 1 phần (PARTIAL)** và hiển thị rõ số tiền còn thiếu để shipper thu nốt khi giao hàng.
- **Bảo mật tuyệt đối thông tin khách hàng**: Trang tra cứu công khai `/tra-cuu-don` chỉ trả về thông tin khi người dùng nhập chính xác cả mã đơn và số điện thoại; tuyệt đối không để lộ danh tính khách hàng khác hoặc giá vốn nội bộ của trang trại.
