# Hướng Dẫn Sử Dụng Phân Hệ: Ứng Dụng Công Nhân (PWA & Dùng Ngoại Tuyến)

Phân hệ **Ứng dụng công nhân** (`/admin/m`) là giao diện di động được thiết kế riêng cho người lao động trực tiếp ngoài đồng ruộng, nhà màng, chuồng trại và ao nuôi. Ứng dụng ứng dụng công nghệ PWA (Progressive Web App) hiện đại: giao diện nút bấm to, dễ thao tác dưới trời nắng, hỗ trợ chụp ảnh nghiệm thu và **hoạt động bình thường ngay cả khi mất sóng điện thoại (Offline)**.

---

## 1. Mục đích sử dụng

- **Tối ưu trải nghiệm trên điện thoại thông minh**: Bố cục đơn giản, loại bỏ các bảng biểu phức tạp của máy tính, tập trung vào 4 thao tác chính: Nhận việc, Chấm công, Ghi nhật ký và Quét mã QR.
- **Không lo mất sóng 4G/Wifi ngoài đồng**: Khi làm việc ở các phân khu xa không có sóng điện thoại, ứng dụng vẫn cho phép chấm công, ghi nhật ký và chụp ảnh. Toàn bộ dữ liệu được lưu an toàn trong máy và **tự động đồng bộ lên hệ thống ngay khi có mạng trở lại**.
- **Cài đặt tiện lợi như một App thông thường**: Không cần mất thời gian tìm kiếm trên App Store hay Google Play, cài đặt trực tiếp từ trình duyệt trong 5 giây.

---

## 2. Hướng dẫn Cài đặt Ứng dụng lên Màn hình chính Điện thoại

Để sử dụng thuận tiện mỗi ngày mà không cần gõ lại địa chỉ web:

### Đối với điện thoại Android (dùng trình duyệt Google Chrome hoặc Cốc Cốc):
1. Mở trình duyệt Chrome, truy cập vào đường dẫn hệ thống XFarm của nông trại (ví dụ: `https://erp.xfarm.vn/admin/m`).
2. Nhấn vào biểu tượng **3 dấu chấm (⋮)** ở góc trên bên phải trình duyệt.
3. Chọn dòng **Cài đặt ứng dụng** (hoặc **Thêm vào Màn hình chính / Install App**).
4. Nhấn **Cài đặt**. Biểu tượng mầm cây **XFarm Công nhân** sẽ xuất hiện ngay trên màn hình chính của điện thoại giống như ứng dụng Zalo, Facebook.

### Đối với điện thoại iPhone (dùng trình duyệt Safari):
1. Mở trình duyệt Safari và truy cập vào đường dẫn `https://erp.xfarm.vn/admin/m`.
2. Nhấn vào biểu tượng **Chia sẻ** (hình vuông có mũi tên hướng lên ở thanh đáy trình duyệt).
3. Cuộn xuống và chọn dòng **Thêm vào MH chính (Add to Home Screen)**.
4. Nhấn **Thêm (Add)** ở góc trên bên phải để hoàn tất.

---

## 3. Các bước thao tác chính hằng ngày

Thanh điều hướng dưới đáy màn hình (Bottom Navigation) gồm 4 mục chính:
- 📋 **Hôm nay**: Danh sách việc được giao trong ngày.
- ✍️ **Ghi nhanh**: Ghi nhật ký công việc tại hiện trường.
- ⏰ **Chấm công**: Bấm vào ca và hết ca làm việc.
- 📷 **Quét QR**: Quét mã định danh khu/lô nhanh chóng.

---

### Bước 1: Màn hình "Hôm nay" – Nhận việc và Hoàn thành công việc (`/admin/m`)

1. Mỗi buổi sáng khi bắt đầu làm việc, mở ứng dụng và vào mục **Hôm nay**.
2. Danh sách các công việc quản lý đã giao cho bạn sẽ hiển thị với các thông tin:
   - Tên công việc (ví dụ: *Tưới nước nhỏ giọt Nhà màng 01*).
   - Vị trí khu/lô và Mùa vụ cần làm.
   - Hạn chót hoàn thành.
   - Thẻ trạng thái: *Cần làm (Màu xám)*, *Đang làm (Màu xanh dương)*, *Đã xong (Màu xanh lá)*.
3. **Bắt đầu làm việc**:
   - Khi chuẩn bị tiến hành công việc nào, nhấn nút **Bắt đầu làm** (biểu tượng Tam giác Play).
   - Trạng thái công việc chuyển sang **Đang làm**. Quản lý ở văn phòng sẽ thấy bạn đã bắt tay vào việc.
4. **Báo cáo Hoàn thành công việc**:
   - Khi làm xong, nhấn nút **Hoàn thành** (biểu tượng Dấu tích tròn).
   - Hộp thoại nghiệm thu hiện lên:
     - **Tích chọn "Ghi kèm nhật ký mùa vụ"**: Hệ thống sẽ tự động tạo một bản ghi nhật ký tương ứng cho mùa vụ này.
     - **Ghi chú**: Ghi lại tình hình thực tế (ví dụ: *Đã tưới đủ 30 phút, kiểm tra đường ống không bị rò rỉ*).
     - **Chụp ảnh kết quả**: Bấm vào biểu tượng **Máy ảnh (Camera)** để chụp ảnh luống cây hoặc công việc vừa hoàn thành.
     - Nhấn nút **Xác nhận hoàn thành**.
   - Công việc sẽ chuyển thành **Đã xong**, ảnh và nhật ký tự động được gửi lên cho quản lý nghiệm thu.

---

### Bước 2: Màn hình "Ghi nhanh" Nhật ký tại hiện trường (`/admin/m/quick-log`)

Khi thực hiện các công việc phát sinh không nằm trong kế hoạch giao trước:
1. Nhấp chọn mục **Ghi nhanh** ở thanh đáy.
2. Biểu mẫu tinh gọn hiện ra:
   - **Mùa vụ & Khu/lô**: Chọn mùa vụ và khu đất bạn đang đứng làm việc (hoặc bấm biểu tượng quét QR để máy tự nhận diện).
   - **Loại công việc**: Bấm chọn loại việc phù hợp (*Tưới nước, Bón phân, Làm cỏ, Phun thuốc, Cho ăn, Tiêm phòng, Thu hoạch...*).
   - **Thông số kỹ thuật**: Điền định lượng (ví dụ: số lít nước, số kg thức ăn, liều lượng pha...).
   - **Chụp ảnh**: Bấm chụp 1 bức ảnh thực tế ngoài đồng.
3. Nhấn nút màu xanh **Lưu nhật ký**.

---

### Bước 3: Màn hình "Chấm công" vào ca và hết ca (`/admin/m/attendance`)

1. Nhấp chọn mục **Chấm công** ở thanh đáy.
2. **Đầu ca làm việc (Buổi sáng)**:
   - Mở màn hình Chấm công, nhấn nút to màu xanh **Vào ca (Check-in)**.
   - Hệ thống ghi nhận chính xác thời gian bắt đầu làm việc của bạn.
3. **Cuối ca làm việc (Buổi chiều)**:
   - Trước khi ra về, mở lại mục Chấm công, nhấn nút **Hết ca (Check-out)**.
   - **Nếu làm khoán theo sản lượng**: Điền con số sản lượng thu hoạch hoặc diện tích bạn đã làm được vào ô *Sản lượng khoán* (ví dụ: `80` kg bưởi).
   - Điền ghi chú (nếu có, ví dụ: *Tăng ca thêm 1 tiếng hỗ trợ dọn mương thoát nước*).
   - Nhấn **Xác nhận hết ca**. Hệ thống tự động tính tổng số giờ làm việc trong ngày của bạn.

---

### Bước 4: Màn hình "Quét QR" định danh khu/lô (`/admin/m/scan`)

1. Khi đi đến một khu đất, nhà màng hoặc chuồng nuôi có dán tem QR trên biển hiệu/cọc mốc:
2. Nhấp chọn mục **Quét QR** ở thanh đáy.
3. Hướng camera điện thoại về phía mã QR.
4. Hệ thống sẽ lập tức quét mã và tự động mở ra màn hình Ghi nhanh nhật ký với **Khu/lô và Mùa vụ đã được điền sẵn chính xác 100%**. Bạn không cần mất công lục tìm trong danh sách tên khu.

---

### Bước 5: Cơ chế Ngoại tuyến (Offline) & Hộp thư chờ đồng bộ (Outbox)

Đây là tính năng đặc biệt ưu việt của XFarm dành riêng cho điều kiện nông nghiệp thực tế:

1. **Nhận biết trạng thái mạng**:
   - Khi có sóng điện thoại/Wifi: Góc trên màn hình hiển thị huy hiệu màu xanh **Online**.
   - Khi mất sóng điện thoại hoàn toàn: Góc trên màn hình tự động chuyển sang huy hiệu màu vàng **Offline**.
2. **Làm việc bình thường khi Offline**:
   - Bạn vẫn bấm **Bắt đầu**, **Hoàn thành**, **Chấm công** hoặc **Ghi nhật ký** như bình thường.
   - Khi bấm Lưu, ứng dụng sẽ hiện thông báo nhẹ nhàng: *"Đã lưu vào bộ nhớ máy (Chế độ ngoại tuyến)"*.
3. **Hộp thư chờ đồng bộ (Outbox - `/admin/m/outbox`)**:
   - Thanh trạng thái `SyncStatusBar` trên đầu màn hình sẽ hiển thị số lượng bản ghi đang chờ (ví dụ: *Còn 2 bản ghi chờ gửi lên máy chủ*).
   - Bạn có thể bấm vào thanh này để xem danh sách các công việc hoặc lượt chấm công đang nằm trong hàng đợi của máy.
4. **Tự động đồng bộ khi có mạng**:
   - Khi bạn di chuyển về khu nhà điều hành hoặc nơi có sóng 4G/Wifi: Hệ thống sẽ **tự động đẩy toàn bộ dữ liệu lên máy chủ ngầm** trong tích tắc.
   - Thanh trạng thái sẽ chuyển thành *Đã đồng bộ tất cả dữ liệu* với dấu tích xanh.
   - Bạn cũng có thể chủ động bấm nút **Đồng bộ ngay** để ép gửi dữ liệu tức thì.

---

## 4. Lưu ý và Lỗi thường gặp

- **TUYỆT ĐỐI KHÔNG xóa dữ liệu trình duyệt khi đang Offline**: Nếu điện thoại đang mất mạng và vẫn còn bản ghi trong Hộp thư chờ đồng bộ (`Outbox`), bạn tuyệt đối không bấm nút "Xóa lịch sử duyệt web" hay "Xóa bộ nhớ ứng dụng" của trình duyệt, vì sẽ làm mất dữ liệu chấm công chưa kịp gửi lên máy chủ.
- **Cấp quyền sử dụng Máy ảnh (Camera)**: Lần đầu tiên bấm chụp ảnh hoặc quét mã QR, điện thoại sẽ hiện bảng hỏi: *"Cho phép XFarm sử dụng camera của bạn?"*. Hãy nhấn nút **Cho phép (Allow)**. Nếu lỡ bấm chặn, hãy vào Cài đặt trình duyệt trên điện thoại để mở lại quyền camera.
- **Nên mở ứng dụng trước khi ra đồng**: Buổi sáng trước khi rời khu nhà điều hành ra các khu vực xa không có mạng, bạn nên mở ứng dụng XFarm một lần để máy tự động tải danh sách công việc và khu/lô mới nhất vào bộ nhớ đệm.
- **Dùng chung điện thoại giữa các ca**: Nếu một tổ công nhân dùng chung một máy tính bảng, sau khi hết ca làm việc, hãy bấm biểu tượng **Đăng xuất** ở góc trên bên phải để người ca sau đăng nhập tài khoản của họ, tránh bị nhầm lẫn dữ liệu chấm công.
