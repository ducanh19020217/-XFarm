# Hướng Dẫn Sử Dụng Phân Hệ: Bán Hàng & Quản Lý Khách Hàng

Phân hệ **Bán hàng & Khách hàng** (`/admin/sales`) giúp nông trại tổ chức chuyên nghiệp toàn bộ quy trình tiêu thụ nông sản: từ quản lý hồ sơ đối tác, lên đơn bán hàng tại quầy/bán sỉ, xuất kho tự động theo nguyên tắc nhập trước xuất trước (FIFO), theo dõi vận chuyển, ghi nhận thu tiền kết nối sổ quỹ tài chính đến in ấn hóa đơn và phiếu giao hàng.

---

## 1. Mục đích sử dụng

- **Quản lý tập trung tệp khách hàng (CRM)**: Lưu trữ đầy đủ thông tin khách lẻ, khách mua sỉ và đại lý bao tiêu; theo dõi lịch sử mua sắm và hạn mức công nợ tức thời.
- **Tạo và xử lý đơn bán hàng nhanh chóng**: Hỗ trợ nhân viên lên đơn bán tại quầy hoặc bán buôn với bảng giá niêm yết, tính toán tự động chiết khấu, phí vận chuyển và số tiền phải thu.
- **Khấu trừ tồn kho chuẩn xác theo FIFO**: Khi đơn hàng được xác nhận, hệ thống tự động tìm và trừ các lô nông sản có hạn dùng gần nhất hoặc ngày thu hoạch cũ nhất trong kho thành phẩm, đồng thời **chặn tuyệt đối xuất âm**.
- **Tự động hoàn kho khi hủy đơn**: Trường hợp khách đổi ý hoặc đơn bị hoàn trả, hệ thống tự động sinh bút toán nhập kho hoàn trả đúng vào các lô ban đầu, đảm bảo số liệu thẻ kho luôn khớp đúng với thực tế.
- **Theo dõi dòng tiền thu bán hàng**: Ghi nhận các đợt thanh toán (toàn bộ hoặc từng phần) và **tự động sinh giao dịch Thu (Transaction INCOME)** liên kết sang sổ quỹ tài chính.
- **In ấn chứng từ bán hàng chuyên nghiệp**: Xuất hóa đơn bán lẻ hoặc phiếu giao hàng kèm thông tin nông trại và mã thanh toán VietQR động in trực tiếp trên giấy để khách hàng quét chuyển khoản.

---

## 2. Cấu trúc phân hệ Bán hàng

Trên thanh menu quản trị, mục **Bán hàng** bao gồm 2 phân khu chính:

1. **Đơn hàng (`/admin/sales/orders`)**:
   - Danh sách đơn hàng bán tại quầy (`ADMIN`) và đơn đặt trực tuyến từ website (`WEBSHOP`).
   - Lọc theo trạng thái xử lý đơn hàng, trạng thái thanh toán và kênh bán.
   - Nút **Tạo đơn hàng** (`/admin/sales/orders/new`).
   - Chi tiết đơn hàng (`/admin/sales/orders/[id]`): Xác nhận xuất kho, chuyển trạng thái giao hàng, ghi nhận thanh toán, hủy đơn.
   - Trang in chứng từ (`/admin/sales/orders/[id]/print`): In hóa đơn và in phiếu giao hàng.

2. **Khách hàng (`/admin/sales/customers`)**:
   - Danh sách khách hàng với số điện thoại, phân loại nhóm, trạng thái hoạt động.
   - Thêm mới, chỉnh sửa thông tin hoặc khóa/mở khóa tài khoản khách hàng.
   - Chi tiết khách hàng (`/admin/sales/customers/[id]`): Xem hồ sơ, tổng giá trị đã mua sắm, công nợ hiện tại và toàn bộ lịch sử các đơn hàng đã đặt.

---

## 3. Quy trình Vòng đời Đơn hàng Bán

```
[1. Tạo đơn hàng (PENDING)] 
         ↓
[2. Xác nhận xuất kho (CONFIRMED)] ──(Tự động trừ kho theo lô FIFO)
         ↓
[3. Đóng gói kiện hàng (PACKING)] 
         ↓
[4. Giao hàng vận chuyển (SHIPPING)] 
         ↓
[5. Hoàn tất đơn hàng (COMPLETED)] 
         
* Tại các bước PENDING/CONFIRMED/PACKING/SHIPPING, có thể [HỦY ĐƠN (CANCELLED)]:
  → Nếu đơn đã CONFIRMED, hệ thống tự động nhập hoàn kho lại đúng lô cũ.
```

---

## 4. Các bước thao tác chi tiết

### Bước 1: Quản lý Khách hàng (`/admin/sales/customers`)

#### 1. Thêm mới khách hàng
1. Truy cập **Bán hàng** → **Khách hàng** trên menu chính.
2. Nhấn nút màu xanh **Thêm khách hàng**.
3. Điền các trường thông tin trong hộp thoại:
   - **Tên khách hàng**: Họ và tên hoặc tên công ty/đại lý (ví dụ: *Nguyễn Văn An*, *Siêu thị Sinh thái Xanh*).
   - **Số điện thoại**: Số di động nhận hàng (bắt buộc, là mã định danh chống trùng lặp trong hệ thống).
   - **Email**: Địa chỉ email nhận thông báo hóa đơn điện tử (nếu có).
   - **Địa chỉ**: Địa chỉ giao nhận hàng mặc định (số nhà, đường, phường/xã, quận/huyện, tỉnh/thành).
   - **Loại khách hàng**: Chọn một trong 3 nhóm:
     - `Khách lẻ` (RETAIL): Khách mua tiêu dùng gia đình hoặc khách ghé thăm trang trại.
     - `Khách sỉ` (WHOLESALE): Nhà hàng, bếp ăn tập thể hoặc đối tác thu mua định kỳ.
     - `Đại lý` (AGENT): Các cửa hàng thực phẩm sạch, chuỗi đại lý phân phối bao tiêu sản phẩm.
4. Nhấn **Thêm mới** để lưu lại. Hệ thống sẽ tự động cấp mã khách hàng tăng dần định dạng `CU-0001`.

#### 2. Tra cứu công nợ và lịch sử mua sắm của khách
- Nhấp trực tiếp vào **Mã khách hàng** hoặc nhấn biểu tượng **Con mắt (Xem chi tiết)** trên bảng danh sách.
- Màn hình chi tiết hiển thị:
  - Thông tin liên hệ đầy đủ.
  - Thẻ **Tổng tiền đã mua**: Lũy kế doanh số khách đã mua tại nông trại.
  - Thẻ **Công nợ hiện tại**: Số tiền khách còn nợ nông trại (hiển thị màu đỏ nếu lớn hơn 0).
  - Bảng **Lịch sử đơn hàng**: Toàn bộ các đơn hàng của khách kèm trạng thái xử lý và trạng thái thanh toán.

#### 3. Khóa và mở khóa khách hàng
- Khi một khách hàng có dấu hiệu gian lận hoặc yêu cầu ngừng giao dịch, nhấn vào biểu tượng **Ổ khóa (Khóa khách hàng)**.
- Khi bị khóa (`isActive = false`), khách hàng này sẽ không xuất hiện trong danh sách gợi ý chọn khi nhân viên tạo đơn mới. Bạn có thể mở khóa lại bất kỳ lúc nào.

---

### Bước 2: Lập Đơn bán hàng mới (`/admin/sales/orders/new`)

1. Truy cập **Bán hàng** → **Đơn hàng**, nhấn nút **Tạo đơn hàng**.
2. **Chọn thông tin khách hàng**:
   - Gõ tên, số điện thoại hoặc mã khách vào ô tìm kiếm nhanh.
   - Chọn khách hàng từ danh sách kết quả. Hệ thống sẽ **tự động điền địa chỉ giao hàng** từ hồ sơ khách vào ô *Địa chỉ giao hàng*.
   - *Mẹo tạo nhanh*: Nếu khách hàng mới chưa có trong hệ thống, nhấn nút **Thêm khách hàng nhanh (biểu tượng Người dùng +)** để tạo hồ sơ khách ngay mà không cần rời khỏi màn hình lập đơn.
3. **Thêm các mặt hàng vào đơn**:
   - Chọn sản phẩm từ danh mục niêm yết (hệ thống tự động điền đơn giá bán mặc định và đơn vị tính).
   - Nhập **Số lượng** cần bán.
   - Có thể điều chỉnh lại **Đơn giá** theo thỏa thuận (ví dụ áp dụng giá chiết khấu cho khách sỉ).
   - Nhấn **Thêm dòng hàng** nếu đơn gồm nhiều mặt hàng khác nhau.
4. **Chiết khấu, phí vận chuyển và thanh toán**:
   - **Giảm giá / Chiết khấu (₫)**: Nhập số tiền giảm trực tiếp trên đơn (nếu có).
   - **Phí giao hàng (₫)**: Nhập phí ship thu thêm từ khách (nếu có).
   - **Phương thức thanh toán dự kiến**: Chọn *Thu hộ (COD)*, *Chuyển khoản ngân hàng*, *Tiền mặt*, hoặc *VNPay*.
   - **Ghi chú**: Ghi lại các yêu cầu đóng gói hoặc thời gian giao hàng đặc biệt (ví dụ: *Giao trước 10h sáng, đóng thùng xốp lót đá gel*).
5. Kiểm tra lại tổng tiền tạm tính, chiết khấu và tổng thanh toán. Nhấn **Tạo đơn hàng**. Đơn hàng được tạo thành công với mã định dạng `SO-2026-XXXX` ở trạng thái **Chờ xử lý (PENDING)**.

---

### Bước 3: Xác nhận Đơn hàng & Xuất kho FIFO

Đơn hàng ở trạng thái `PENDING` chưa làm giảm số lượng trong kho. Để kích hoạt xuất kho:

1. Mở trang chi tiết đơn hàng (`/admin/sales/orders/[id]`).
2. Nhấn nút màu xanh dương **Xác nhận đơn**.
3. Trong hộp thoại **Xác nhận đơn hàng**:
   - Chọn **Kho xuất hàng** (hệ thống ưu tiên gợi ý kho thành phẩm nông sản `WH-FINISHED`).
   - Nhấn **Xác nhận xuất kho**.
4. **Cơ chế xử lý tự động của hệ thống**:
   - Hệ thống quét danh sách các lô hàng (`StockLot`) của từng mặt hàng trong kho đã chọn, ưu tiên trừ từ các lô có hạn dùng gần nhất hoặc ngày nhập kho cũ nhất (**Thuật toán FIFO**).
   - Sinh các bút toán xuất kho (`StockMove OUT`) ghi nhận lý do xuất bán cho đơn hàng `SO-2026-XXXX`.
   - Chuyển trạng thái đơn sang **Đã xác nhận (CONFIRMED)**.
5. **Quy tắc chặn xuất âm (Validation)**:
   - Nếu số lượng tồn kho khả dụng không đủ để xuất, hệ thống sẽ chặn thao tác và hiển thị thông báo lỗi chi tiết dạng: `Không đủ tồn kho: [Tên sản phẩm] còn X kg, cần Y kg`.
   - Nhân viên phải kiểm tra lại tồn kho, nhập thêm hàng thu hoạch từ mùa vụ hoặc điều chỉnh lại số lượng đặt trên đơn trước khi xác nhận lại.

---

### Bước 4: Vận chuyển và Hoàn tất đơn hàng

Sau khi đã xuất kho thành công, nhân viên kinh doanh hoặc thủ kho lần lượt cập nhật tiến trình đơn hàng:

1. **Đóng gói kiện hàng**:
   - Khi bộ phận kho đã lấy hàng từ kệ và đóng gói bao bì/thùng xốp hoàn tất, nhấn nút màu tím **Đóng gói**.
   - Trạng thái chuyển sang **Đang đóng gói (PACKING)**.
2. **Giao hàng cho đơn vị vận chuyển**:
   - Khi bàn giao kiện hàng cho đối tác vận chuyển hoặc shipper của nông trại mang đi giao, nhấn nút màu xanh lơ **Giao hàng**.
   - Trạng thái chuyển sang **Đang giao hàng (SHIPPING)**.
3. **Hoàn tất đơn hàng**:
   - Khi khách hàng đã nhận được hàng nguyên vẹn, nhấn nút màu xanh lá **Hoàn tất**.
   - Trạng thái chuyển sang **Hoàn tất (COMPLETED)**. Đơn hàng kết thúc chu trình giao vận.

---

### Bước 5: Hủy đơn hàng và Tự động Hoàn kho

Trong trường hợp khách hàng hủy mua, hoặc hàng bị chuyển hoàn do không liên lạc được với người nhận:

1. Tại trang chi tiết đơn hàng (khi đơn đang ở trạng thái `PENDING`, `CONFIRMED`, `PACKING` hoặc `SHIPPING`), nhấn nút màu đỏ **Hủy đơn**.
2. Hộp thoại xác nhận sẽ xuất hiện cảnh báo:
   - Nếu đơn hàng **chưa xác nhận** (`PENDING`): Đơn được đánh dấu là **Đã hủy (CANCELLED)** mà không ảnh hưởng tới kho.
   - Nếu đơn hàng **đã xác nhận xuất kho** (`CONFIRMED`, `PACKING`, `SHIPPING`): Hệ thống sẽ **tự động sinh các phiếu nhập hoàn kho (`StockMove IN`)** trả lại chính xác số lượng hàng về các lô cũ (`stockLotId`) đã xuất trước đó.
3. Nhấn **Xác nhận hủy**. Tồn kho thực tế được phục hồi ngay lập tức, đảm bảo thủ kho không phải làm phiếu nhập điều chỉnh thủ công.

---

### Bước 6: Ghi nhận Thu tiền & Đồng bộ Sổ quỹ Tài chính

Khách hàng có thể thanh toán trước, thanh toán ngay khi nhận hàng (COD), hoặc đối với khách sỉ có thể thanh toán chia làm nhiều đợt.

1. Tại thẻ **Thanh toán & Thu tiền** trong trang chi tiết đơn hàng:
   - Cột tóm tắt hiển thị: Số tiền **Đã thu** và Số tiền **Còn lại** cần thu.
   - Nếu số tiền còn lại > 0, biểu mẫu **Ghi nhận thu tiền mới** sẽ hiển thị.
2. **Nhập thông tin thu tiền**:
   - **Số tiền thu (₫)**: Mặc định hiển thị toàn bộ số tiền còn thiếu. Nhân viên có thể chỉnh sửa thành số tiền thực tế khách trả đợt này (thanh toán từng phần).
   - **Phương thức**: Chọn phương thức thu tiền thực tế (*Tiền mặt*, *Chuyển khoản*, *COD*, *VNPay*).
   - **Ghi chú**: Điền mã giao dịch ngân hàng hoặc nội dung ghi chú (ví dụ: *Khách chuyển khoản VCB, GD 998811*).
3. Nhấn **Ghi nhận thanh toán**:
   - Hệ thống cập nhật bảng lịch sử các lần thu của đơn.
   - Trạng thái thanh toán của đơn tự động cập nhật: **Thanh toán 1 phần (PARTIAL)** hoặc **Đã thanh toán (PAID)**.
   - **Đồng bộ tự động**: Hệ thống **tự động sinh một Giao dịch Thu (`Transaction INCOME`)** trong phân hệ Tài chính (`/admin/finance/transactions`), gắn kèm mã chứng từ tham chiếu của đơn hàng.

---

### Bước 7: In Hóa đơn và Phiếu giao hàng

Hệ thống tích hợp sẵn mẫu in chuẩn A4/A5, tối ưu giao diện cho máy in nhiệt hoặc máy in văn phòng:

1. **In Hóa đơn bán hàng**:
   - Nhấn nút **In hóa đơn** ở đầu trang chi tiết đơn hàng (hoặc truy cập `/admin/sales/orders/[id]/print?type=invoice`).
   - Mẫu in hiển thị đầy đủ tên nông trại, logo, địa chỉ, số điện thoại hotline, thông tin khách hàng, bảng chi tiết từng sản phẩm, đơn giá, tổng tiền, chiết khấu và chữ ký người lập.
   - **Tính năng VietQR thông minh**: Nếu đơn hàng chưa thanh toán đủ (`UNPAID` hoặc `PARTIAL`) và phương thức là *Chuyển khoản*, hệ thống sẽ **in trực tiếp mã QR chuyển khoản VietQR** ngay trên hóa đơn. Khách hàng chỉ cần mở ứng dụng ngân hàng quét mã là có thể thanh toán ngay với đúng số tiền và cú pháp mã đơn.
2. **In Phiếu giao hàng (Phiếu xuất kho kiêm vận chuyển)**:
   - Nhấn nút **Phiếu giao hàng** (`/admin/sales/orders/[id]/print?type=delivery`).
   - Mẫu in tập trung vào thông tin giao nhận: Địa chỉ giao hàng, số điện thoại người nhận, ghi chú giao hàng, số lượng đóng gói và chữ ký của *Người lập phiếu*, *Người giao hàng* và *Người nhận hàng*.
3. Nhấn nút **In ngay (biểu tượng Máy in)** hoặc dùng phím tắt `Ctrl + P` (trên Windows) / `Cmd + P` (trên Mac) để in ra giấy hoặc lưu thành file PDF.

---

## 5. Những nguyên tắc và lưu ý quan trọng

- **Tuyệt đối không xuất âm**: Khi bấm xác nhận đơn hàng, nếu tổng tồn kho thực tế của mặt hàng tại kho được chọn nhỏ hơn số lượng bán, thao tác sẽ bị từ chối với mã lỗi 422. Không thể lách luật xuất âm trên hệ thống.
- **Bảo mật phân quyền**:
  - Nhân viên Bán hàng (`SALES`), Quản lý (`MANAGER`) và Chủ trại (`OWNER`) có toàn quyền lập đơn, xác nhận, chuyển trạng thái và ghi thu tiền.
  - Kế toán (`ACCOUNTANT`) có quyền xem đơn hàng, xem công nợ khách hàng và ghi nhận các khoản thu tiền.
  - Công nhân (`WORKER`) tuyệt đối không có quyền truy cập vào phân hệ Bán hàng để bảo vệ dữ liệu khách hàng và bí mật kinh doanh.
- **Bảo vệ toàn vẹn dữ liệu đơn hoàn tất**: Đơn hàng khi đã ở trạng thái **Hoàn tất (COMPLETED)** hoặc **Đã hủy (CANCELLED)** sẽ được khóa toàn bộ nút chuyển trạng thái tiếp theo nhằm đảm bảo tính toàn vẹn của số liệu thẻ kho và kế toán.
