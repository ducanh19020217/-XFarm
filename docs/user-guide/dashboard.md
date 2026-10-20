# Hướng Dẫn Sử Dụng Phân Hệ: Bảng Điều Khiển Tổng Quan

Trang **Tổng quan** (`/admin`) là màn hình tóm tắt để nắm nhanh tình hình vận hành trang trại. Dữ liệu được tải từ dashboard và các số tiền hiển thị theo định dạng Việt Nam, đơn vị đồng (`₫`). Nhấn vào từng thẻ KPI để đi tới màn hình chi tiết tương ứng.

## 1. Các chỉ số nhanh

Tùy vai trò, dashboard hiển thị các thẻ sau:

- **Mùa vụ đang chạy**: số mùa vụ hiện hoạt động; nhấn để mở `/admin/cycles`.
- **Doanh thu tháng này**: tổng doanh thu trong tháng hiện tại; nhấn để mở sổ giao dịch `/admin/finance/transactions`.
- **Booking 7 ngày tới**: số lượt đặt chỗ có lịch trong bảy ngày kế tiếp; nhấn để mở `/admin/tours/bookings`.
- **Mặt hàng dưới minStock**: số mặt hàng có tồn dưới mức tối thiểu; nhấn để kiểm tra `/admin/inventory`.
- **Lô sắp hết hạn**: số lô cần ưu tiên xử lý theo hạn dùng; nhấn để mở tồn kho.
- **Task quá hạn**: số công việc đã quá hạn; nhấn để mở `/admin/hr/tasks`.
- **Cảnh báo chưa đọc**: số cảnh báo chưa được đọc; nhấn để mở `/admin/alerts`.

Nhân viên SALES vẫn xem được doanh thu, booking và cảnh báo, nhưng không hiển thị các thẻ và biểu đồ liên quan đến sản xuất, tồn kho hoặc công việc nội bộ. Đây là giới hạn theo quyền, không phải dữ liệu bị mất.

## 2. Biểu đồ doanh thu và chi phí

Biểu đồ **Doanh thu và chi phí** hiển thị 12 tháng gần nhất, gồm hai đường:

- **Doanh thu**: dòng tiền thu được theo dữ liệu tài chính.
- **Chi phí**: các khoản chi đã ghi nhận trong cùng giai đoạn.

Di chuột lên một điểm để xem số tiền của tháng. Dùng biểu đồ để nhận biết tháng chi phí tăng bất thường hoặc doanh thu giảm, sau đó mở **Tài chính** để đối soát từng giao dịch. Biểu đồ là số liệu tổng hợp quản trị; khi cần kết luận sổ sách, luôn kiểm tra báo cáo tài chính chi tiết.

## 3. Biểu đồ sản lượng theo mùa vụ

Người có quyền xem dữ liệu sản xuất sẽ thấy **Sản lượng theo mùa vụ**. Biểu đồ cột tổng hợp sản lượng thu hoạch trong 12 tháng, theo mã mùa vụ; rê chuột lên cột để xem số lượng và đơn vị.

Nếu một mùa vụ chưa có lô thu hoạch, mùa vụ đó chưa tạo cột sản lượng. Để kiểm tra nguồn số liệu, mở mùa vụ tại `/admin/cycles` hoặc lô thu hoạch tại `/admin/harvest-lots`.

## 4. Cách sử dụng hằng ngày

1. Sau khi đăng nhập, mở `/admin` và kiểm tra các thẻ có số tăng cao hoặc màu cảnh báo.
2. Xử lý theo mức ưu tiên: cảnh báo chưa đọc, tồn dưới minStock/lô sắp hết hạn, task quá hạn, booking sắp diễn ra.
3. Mở màn hình chi tiết từ thẻ KPI, hoàn tất nghiệp vụ ở đó rồi quay lại dashboard để kiểm tra số liệu cập nhật.
4. Cuối ngày hoặc cuối tuần, xem đường doanh thu–chi phí và sản lượng mùa vụ để trao đổi với quản lý/kế toán.

Trong lúc tải, trang hiển thị **Đang tải dashboard...**. Nếu có lỗi kết nối, trang báo **Không thể tải dữ liệu tổng quan. Vui lòng thử lại.** Hãy tải lại trang sau khi kiểm tra kết nối API; không tự nhập số liệu thay thế vào dashboard.

## 5. Phân quyền và lưu ý

- Dashboard tuân theo quyền của tài khoản đăng nhập. Không chia sẻ ảnh chụp dashboard có doanh thu, chi phí hoặc số tồn cho người không có quyền.
- Số liệu phụ thuộc vào giao dịch, mùa vụ, booking và nhật ký đã ghi nhận. Nếu thẻ bằng 0, trước tiên kiểm tra dữ liệu nguồn và khoảng thời gian tổng hợp.
- Dashboard dùng để theo dõi nhanh, không thay thế việc đối soát sổ quỹ, tồn kho hoặc bảng công việc chi tiết.
