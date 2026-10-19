# Hướng Dẫn Sử Dụng Phân Hệ: Thu Hoạch & Truy Xuất Nguồn Gốc QR

Phân hệ **Thu hoạch & Truy xuất** (`/admin/harvest-lots`) là cầu nối quan trọng đưa giá trị nông sản sạch của XFarm đến tận tay người tiêu dùng. Hệ thống tự động sinh mã QR truy xuất nguồn gốc độc bản cho từng lô nông sản thu hoạch, hỗ trợ in tem nhãn dán bao bì và cung cấp trang tra cứu hành trình nông sản minh bạch từ nông trại đến bàn ăn.

---

## 1. Mục đích sử dụng

- **Quản lý sản lượng thu hoạch**: Ghi nhận chính xác số lượng nông sản thu được sau từng đợt cắt hái, thu hoạch từ các mùa vụ.
- **Minh bạch chuỗi giá trị (Traceability)**: Tự động kết nối lô nông sản với lịch sử nhật ký canh tác của mùa vụ tương ứng (giống cây, phân bón sinh học, ngày thu hoạch, chứng nhận chất lượng).
- **In tem nhãn dán bao bì chuyên nghiệp**: Cung cấp mẫu tem QR chuẩn hóa để dán lên túi, hộp đựng nông sản bán ra thị trường hoặc giao cho siêu thị, cửa hàng thực phẩm sạch.
- **Xây dựng niềm tin với khách hàng**: Người tiêu dùng chỉ cần dùng camera điện thoại hoặc ứng dụng Zalo quét mã QR là xem được đầy đủ hành trình sản xuất an toàn.

---

## 2. Quy trình từ Thu hoạch đến Bàn ăn

```
[1. Mùa vụ thu hoạch] 
        ↓ 
[2. Tạo Lô thu hoạch (Mã lô & Mã TraceCode)] 
        ↓ 
[3. Bật "Công khai truy xuất" (isPublic)] 
        ↓ 
[4. In tem nhãn QR dán lên bao bì sản phẩm] 
        ↓ 
[5. Khách hàng quét mã QR xem trang tra cứu công khai]
```

---

## 3. Các bước thao tác chính

### Bước 1: Xem danh sách các Lô thu hoạch

1. Nhấp chọn mục **Thu hoạch & Truy xuất** trên thanh menu bên trái (`/admin/harvest-lots`).
2. Màn hình danh sách hiển thị các lô nông sản đã thu hoạch:
   - **Mã lô (Lot Code)**: Mã nội bộ quản lý kho (ví dụ: `LOT-DUALUOI-01`).
   - **Mã truy xuất (Trace Code)**: Mã định danh công khai độc nhất in trên mã QR (ví dụ: `TRC-2026-XF88`).
   - **Sản phẩm & Mùa vụ**: Tên mặt hàng nông sản và mùa vụ xuất xứ.
   - **Ngày thu hoạch & Hạn dùng**: Thời điểm thu hái và hạn sử dụng khuyến nghị.
   - **Số lượng & Đơn vị tính**: Sản lượng thu được (ví dụ: `500 kg`, `1,200 quả`).
   - **Chất lượng & Chứng nhận**: Phân loại phẩm cấp (*Loại 1, Loại 2, Xuất khẩu*) và chứng nhận an toàn (*Hữu cơ Organic, VietGAP, GlobalGAP*).
   - **Trạng thái công khai**: Huy hiệu *Đã công khai (màu xanh)* hoặc *Nội bộ (màu xám)*.

---

### Bước 2: Xem chi tiết Lô thu hoạch

1. Trong bảng danh sách, nhấp vào nút **Chi tiết** hoặc biểu tượng Con mắt tại dòng lô hàng muốn xem (hoặc truy cập `/admin/harvest-lots/[id]`).
2. Màn hình chi tiết hiển thị:
   - Thẻ thông tin nông sản: Mã lô, mã truy xuất, kho nhập lưu trữ, số lượng, quy cách đóng gói.
   - Khung hình ảnh **Mã QR truy xuất nguồn gốc** độ phân giải cao kèm đường link tra cứu công khai.
   - Danh sách **Nhật ký canh tác công khai gắn kèm**: Hiển thị tất cả các công việc chăm sóc trong vụ mùa đã được đánh dấu công khai (như gieo hạt, bón phân hữu cơ, bắt sâu sinh học, kiểm định chất lượng...).

---

### Bước 3: Bật hoặc Tắt trạng thái Công khai truy xuất

*(Dành cho Chủ trang trại và Quản lý)*

Mặc định khi mới tạo, lô hàng có thể ở chế độ nội bộ. Để người tiêu dùng có thể tra cứu thông tin khi quét tem:
1. Tại trang chi tiết lô thu hoạch, nhìn lên góc trên bên phải.
2. Nhấn nút **Công khai truy xuất** (biểu tượng Quả địa cầu màu xanh lá).
3. Hộp thoại xác nhận hiện ra hỏi: *"Bạn có chắc chắn muốn công khai thông tin lô thu hoạch này ra ngoài Internet để khách hàng tra cứu?"*.
4. Nhấn **Đồng ý công khai**.
   - Trạng thái lô hàng sẽ chuyển thành **Đã công khai**.
   - Trong trường hợp phát hiện lô hàng bị lỗi chất lượng và muốn tạm thu hồi thông tin tra cứu, bạn nhấn nút **Thu hồi công khai** (biểu tượng Mắt gạch chéo).

---

### Bước 4: Lấy mã QR và sao chép đường link tra cứu

Tại khung hiển thị mã QR trên trang chi tiết:
1. **Sao chép đường link**: Nhấn nút **Sao chép link** (biểu tượng Copy). Đường link tra cứu dạng `https://xfarm.vn/trace/TRC-xxxx` sẽ được lưu vào bộ nhớ tạm của bạn để gửi cho đối tác hoặc chèn vào bài viết giới thiệu.
2. **Xem trước trang công khai**: Nhấn nút **Xem trang công khai** (biểu tượng Mũi tên mở tab mới) để trải nghiệm giao diện tra cứu đúng như góc nhìn của một khách hàng khi quét mã.

---

### Bước 5: In tem nhãn QR dán bao bì sản phẩm

1. Tại trang chi tiết lô thu hoạch, nhấn nút **In tem QR** (biểu tượng Máy in).
2. Hệ thống sẽ mở trang in tem nhãn chuyên dụng (`/admin/harvest-lots/[id]/print`):
   - Mẫu tem nhãn được thiết kế chuẩn mực:
     - Logo thương hiệu **XFarm Nông trại sinh thái**.
     - Tên sản phẩm nổi bật (ví dụ: *Dưa lưới ruột cam hữu cơ*).
     - Mã lô sản xuất và Mã truy xuất nguồn gốc.
     - Ngày thu hoạch và Hạn sử dụng.
     - Tiêu chuẩn chứng nhận (VietGAP/Organic).
     - Hình ảnh **Mã QR to, rõ nét, dễ quét**.
     - Dòng hướng dẫn: *"Quét mã bằng Camera hoặc Zalo để xem nhật ký nguồn gốc"*.
3. Nhấn nút **In tem ngay** ở góc trang (hoặc bấm phím tắt `Ctrl + P` trên Windows / `Cmd + P` trên Mac).
4. **Mẹo thiết lập máy in**:
   - Chọn đúng máy in tem nhãn nhiệt (như Xprinter, Zebra, Bixolon) hoặc máy in laser thông thường.
   - Trong phần cài đặt in của trình duyệt: Mục **Headers and footers (Tiêu đề và chân trang)** nên **bỏ tích chọn** để tem in ra không bị dính đường dẫn URL của trình duyệt.
   - Nhấn **Print** để hoàn tất in hàng loạt.

---

### Bước 6: Trải nghiệm Trang tra cứu công khai dành cho Khách hàng

Khi người tiêu dùng dùng điện thoại quét mã QR trên bao bì, họ sẽ được dẫn đến trang công khai `/trace/[traceCode]`:
- **Giao diện thân thiện di động**: Không cần tải ứng dụng, không cần đăng nhập tài khoản.
- **Huy hiệu chứng thực an toàn (Verified Badge)**: Khẳng định sản phẩm chính gốc từ nông trại XFarm.
- **Thông tin nguồn gốc**: Vị trí nông trại, thửa đất canh tác, loại giống cây trồng, ngày cắt hái.
- **Dòng thời gian nông vụ**: Khách hàng có thể cuộn xem từng mốc nhật ký canh tác thực tế kèm hình ảnh chụp thật ngoài đồng ruộng, tạo dựng niềm tin tuyệt đối vào chất lượng sản phẩm sạch.

---

## 4. Lưu ý và Lỗi thường gặp

- **Khách hàng quét mã báo lỗi "Chưa công khai"**: Nếu khách hàng quét mã QR và thấy thông báo *Lô hàng đang ở chế độ nội bộ*, nguyên nhân là do Quản lý **chưa bấm nút "Công khai truy xuất"** tại Bước 3. Hãy vào trang chi tiết lô và kích hoạt trạng thái công khai.
- **Nhật ký canh tác bị trống trên trang tra cứu**: Khách hàng chỉ xem được các hoạt động nhật ký nào được tích chọn ô **Công khai truy xuất** khi kỹ sư/công nhân ghi chép ở phân hệ Nhật ký. Nếu không có nhật ký nào được đánh dấu công khai, trang tra cứu sẽ chỉ hiển thị thông tin chung của lô hàng.
- **Mã QR bị mờ khi in**: Khi in tem dán, hãy đảm bảo đầu in nhiệt sạch sẽ và kích thước tem in tối thiểu từ 3x3 cm trở lên để camera điện thoại của người tiêu dùng dễ dàng bắt nét và quét mã nhanh chóng.
