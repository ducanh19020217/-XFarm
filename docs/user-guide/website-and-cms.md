# Hướng Dẫn Sử Dụng Phân Hệ: Website & Quản Trị Nội Dung CMS

Phân hệ **Website & CMS** bao gồm 4 khu vực quản trị: **Sản phẩm** (`/admin/cms/products`), **Bài viết** (`/admin/cms/posts`), **Trang** (`/admin/cms/pages`) và **Cài đặt** (`/admin/cms/settings`). Phân hệ này cho phép nông trại tự xây dựng và vận hành trang web giới thiệu thương hiệu chuyên nghiệp, đăng tải nông sản sạch, chia sẻ câu chuyện nông nghiệp hữu cơ và tích hợp mã thanh toán ngân hàng VietQR tự động.

---

## 1. Mục đích sử dụng

- **Xây dựng thương hiệu nông sản sinh thái**: Đưa hình ảnh nông trại xanh, sạch, uy tín tiếp cận người tiêu dùng và đối tác khắp cả nước qua Internet.
- **Gian hàng giới thiệu sản phẩm trực tuyến**: Trưng bày danh mục nông sản mùa vụ, rau củ quả, con giống kèm hình ảnh thực tế, mô tả phẩm cấp và giá bán niêm yết.
- **Kênh truyền thông Blog & Tin tức**: Chia sẻ kỹ thuật làm nông hữu cơ, nhật ký đồng ruộng, các hoạt động tham quan trải nghiệm nhằm gia tăng giá trị thương hiệu.
- **Tự động hóa thanh toán VietQR**: Tích hợp mã VietQR chuẩn liên ngân hàng NAPAS247 ngay trên website, giúp khách hàng mua nông sản chuyển khoản nhanh chóng, chính xác tuyệt đối mà không cần nhập số tài khoản thủ công.

---

## 2. Các bước thao tác chính

### Bước 1: Quản lý Sản phẩm hiển thị trên Website (`/admin/cms/products`)

*(Dành cho Chủ trang trại, Quản lý và Nhân viên Bán hàng - SALES)*

1. Trên menu bên trái, nhấp chọn **Website · Sản phẩm**.
2. **Thêm sản phẩm mới**:
   - Nhấn nút màu xanh **Thêm sản phẩm mới**.
   - Điền các thông tin trong biểu mẫu:
     - **Tên sản phẩm**: Tên thương mại hấp dẫn (ví dụ: *Dưa lưới ruột cam Kim Long VietGAP*, *Bưởi da xanh hữu cơ loại 1*).
     - **Đường dẫn thân thiện (Slug)**: Hệ thống tự động tạo từ tên (ví dụ: `dua-luoi-ruot-cam-kim-long`), bạn có thể chỉnh sửa lại cho ngắn gọn.
     - **Danh mục**: Chọn nhóm sản phẩm (*Trái cây, Rau củ hữu cơ, Trứng gia cầm, Dược liệu, Thủy sản...*).
     - **Giá niêm yết (VNĐ)**: Giá bán lẻ đề xuất (ví dụ: `85000` cho 85.000 đ).
     - **Đơn vị tính**: kg, hộp, túi 500g, quả, thùng.
     - **Mô tả ngắn**: 1–2 câu tóm tắt nổi bật điểm ngon ngọt hoặc quy cách đóng gói.
     - **Mô tả chi tiết**: Thông tin chi tiết về vùng trồng, tiêu chuẩn an toàn, hướng dẫn bảo quản và chế biến.
     - **Ảnh đại diện sản phẩm**: Bấm nút tải ảnh lên để chọn hình ảnh chụp thật sắc nét của sản phẩm.
     - **Trạng thái**: Chọn *Xuất bản (PUBLISHED)* để hiển thị ngay ra ngoài web, hoặc *Nháp (DRAFT)* nếu đang chuẩn bị nội dung.
   - Nhấn **Lưu sản phẩm**.
3. **Chỉnh sửa / Ẩn sản phẩm**:
   - Khi hết mùa hoặc tạm ngưng bán, bạn có thể bấm nút **Sửa** và chuyển trạng thái về `Nháp` hoặc bấm nút **Xóa** để gỡ khỏi trang bán hàng.

---

### Bước 2: Quản lý Bài viết Tin tức & Blog (`/admin/cms/posts`)

*(Dành cho Chủ trang trại, Quản lý và Nhân viên Bán hàng - SALES)*

1. Trên menu bên trái, nhấp chọn **Website · Bài viết**.
2. **Đăng bài viết mới**:
   - Nhấn nút **Viết bài mới**.
   - Nhập **Tiêu đề bài viết** (ví dụ: *Hành trình hồi sinh đất bằng phân trùn quế tại XFarm*, *Cách nhận biết bưởi da xanh chín tự nhiên không hóa chất*).
   - Kiểm tra **Đường dẫn (Slug)** bài viết.
   - **Tóm tắt (Excerpt)**: Đoạn trích dẫn ngắn hiển thị trên thẻ bài viết ở trang chủ và mạng xã hội.
   - **Ảnh bìa đại diện**: Tải ảnh bìa khổ ngang đẹp mắt để thu hút người đọc.
   - **Nội dung bài viết**: Khung soạn thảo hỗ trợ định dạng văn bản chuyên nghiệp (tiêu đề in đậm, danh sách đầu dòng, chèn liên kết, trích dẫn).
   - Chọn **Danh mục** bài viết (*Câu chuyện nông trại, Kỹ thuật canh tác, Góc ẩm thực, Sự kiện*).
   - Đặt trạng thái: *Xuất bản (PUBLISHED)* hoặc *Bản nháp (DRAFT)*.
   - Nhấn **Đăng bài viết**.

---

### Bước 3: Quản lý Các trang thông tin tĩnh (`/admin/cms/pages`)

*(Dành cho Chủ trang trại và Quản lý)*

1. Trên menu bên trái, nhấp chọn **Website · Trang**.
2. Màn hình quản lý các trang nội dung cố định của website:
   - **Trang Giới thiệu (`/gioi-thieu`)**: Nêu lịch sử hình thành, tầm nhìn, sứ mệnh phát triển nông nghiệp hữu cơ bền vững và đội ngũ sáng lập nông trại.
   - **Trang Liên hệ (`/lien-he`)**: Hướng dẫn đường đi đến nông trại, sơ đồ chỉ dẫn, thông tin đón tiếp khách tham quan.
   - **Các trang Chính sách**: Chính sách giao hàng nông sản tươi, đổi trả khi hàng dập nát, cam kết chất lượng thực phẩm an toàn.
3. Nhấp nút **Sửa** tại trang tương ứng, cập nhật câu từ và bấm **Lưu thay đổi**.

---

### Bước 4: Cài đặt Nông trại & Cấu hình thanh toán VietQR (`/admin/cms/settings`)

*(Chức năng bảo mật: Chỉ dành riêng cho Chủ trang trại và Quản lý; Nhân viên SALES không có quyền truy cập)*

1. Trên menu bên trái, nhấp chọn **Website · Cài đặt**.
2. **Thông tin thương hiệu (Branding)**:
   - **Tên nông trại**: Tên hiển thị trên tiêu đề website (ví dụ: `XFarm - Nông trại sinh thái`).
   - **Khẩu hiệu (Slogan)**: Câu định vị thương hiệu (ví dụ: *Nông sản sạch từ tâm - Cho sức khỏe vững bền*).
   - **Đoạn giới thiệu ngắn**: Xuất hiện ở chân trang (Footer) của website.
3. **Thông tin liên hệ & Mạng xã hội**:
   - **Số điện thoại Hotline**: Tiếp nhận đặt hàng và tư vấn khách hàng.
   - **Email liên hệ**: Nhận thư liên hệ hợp tác, phân phối.
   - **Địa chỉ nông trại**: Địa chỉ chi tiết để khách hàng tìm đường đến trải nghiệm.
   - **Mạng xã hội**: Dán đường link Fanpage Facebook, Zalo Official Account, Kênh YouTube của trang trại.
4. **Banner quảng bá trang chủ**:
   - Thêm ảnh banner chất lượng cao xoay vòng trên đầu trang chủ web kèm tiêu đề nổi bật và đường dẫn nút kêu gọi hành động (CTA).
5. **Cấu hình thanh toán tự động VietQR**:
   - Khung cấu hình tài khoản ngân hàng của nông trại:
     - **Mã ngân hàng (Bank ID)**: Chọn ngân hàng bạn mở tài khoản (ví dụ: `VCB` - Vietcombank, `MB` - Ngân hàng Quân Đội, `BIDV`, `TCB` - Techcombank...).
     - **Số tài khoản**: Nhập chính xác số tài khoản ngân hàng thụ hưởng.
     - **Tên chủ tài khoản**: Tên cá nhân hoặc tên công ty viết hoa không dấu (ví dụ: `CONG TY CP NONG NGHIEP XFARM`).
     - **Mẫu mã QR (Template)**: Chọn mẫu tem VietQR hiển thị (*compact2* hoặc *standard*).
   - Khi cấu hình xong, hệ thống sẽ tự động tạo mã QR động đúng chuẩn NAPAS. Khách hàng chỉ cần mở ứng dụng ngân hàng quét mã là tiền chuyển đúng số tài khoản, không lo gõ nhầm số.
6. Nhấn nút **Lưu cài đặt** (biểu tượng Đĩa mềm) ở góc trang để áp dụng toàn bộ thay đổi.

---

### Bước 5: Xem trước website người tiêu dùng

1. Bạn có thể mở một tab trình duyệt mới và truy cập trực tiếp vào tên miền chính của nông trại (ví dụ: `https://xfarm.vn`).
2. Kiểm tra xem sản phẩm mới đăng, bài viết mới hoặc thông tin hotline vừa cập nhật đã hiển thị mượt mà và chuẩn xác hay chưa.

---

## 3. Lưu ý và Lỗi thường gặp

- **Nhân viên Bán hàng không vào được trang Cài đặt**: Đây là thiết kế bảo mật của hệ thống. Tài khoản vai trò `SALES` chỉ quản lý bài viết và sản phẩm, không được phép can thiệp vào tài khoản ngân hàng VietQR hay thông tin pháp lý của trang trại.
- **Lỗi trùng lặp đường dẫn (Slug)**: Hai sản phẩm hoặc hai bài viết không được có cùng một đường dẫn slug giống hệt nhau. Nếu hệ thống báo lỗi slug đã tồn tại, bạn chỉ cần thêm số hoặc năm vào cuối slug (ví dụ: `dua-luoi-kim-long-2026`).
- **Khách hàng quét mã VietQR báo sai tên chủ tài khoản**: Cần kiểm tra kỹ chữ viết hoa không dấu của tên chủ tài khoản tại Bước 4 (phải trùng khớp 100% với tên đăng ký tại ngân hàng, ví dụ: `NGUYEN VAN A`, không viết có dấu tiếng Việt `Nguyễn Văn A`).
- **Hình ảnh tải lên bị méo hoặc quá nặng**: Nên chọn ảnh có tỉ lệ 4:3 hoặc 1:1 cho sản phẩm, và tỉ lệ 16:9 cho bài viết/banner. Dung lượng ảnh tối ưu từ 500KB đến 2MB để website tải nhanh trên điện thoại của khách hàng.
