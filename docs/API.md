# XFarm API – Giai đoạn 4

API dùng prefix `/api/v1`, xác thực bằng cookie HttpOnly hoặc `Authorization: Bearer`. Response danh sách dùng `{ data, total, page, pageSize }`; lỗi dùng `{ statusCode, message, errors? }`.

## Bán hàng và khách hàng

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/customers` `/customers/:id` | OWNER, MANAGER, ACCOUNTANT, SALES | Xem khách hàng và công nợ tổng hợp |
| POST/PATCH | `/customers` `/customers/:id` | OWNER, MANAGER, SALES | Tạo/cập nhật khách hàng |
| GET | `/sales-orders` `/sales-orders/:id` `/sales-orders/:id/print` | OWNER, MANAGER, ACCOUNTANT, SALES | Xem đơn, hóa đơn/phiếu giao |
| POST/PATCH | `/sales-orders` `/sales-orders/:id` | OWNER, MANAGER, SALES | Tạo/cập nhật đơn admin |
| POST | `/sales-orders/:id/confirm` `/sales-orders/:id/cancel` | OWNER, MANAGER, SALES | Xuất kho FIFO hoặc hoàn kho |
| PATCH | `/sales-orders/:id/status` | OWNER, MANAGER, SALES | Chuyển trạng thái giao hàng |

Khi xác nhận đơn, hệ thống khóa và xuất tồn theo FIFO trong transaction. Hủy đơn tạo StockMove hoàn kho về đúng lô đã xuất.

## Webshop public

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| POST | `/public/orders` | Public | Tạo đơn vãng lai `WEBSHOP/PENDING` bằng COD hoặc BANK_TRANSFER |
| GET | `/public/orders/lookup?code=&phone=` | Public | Tra cứu đơn khi biết cả mã và số điện thoại |

Các endpoint public CMS nằm dưới `/public/*`. Dữ liệu sản phẩm chỉ gồm tên, mô tả, giá bán, đơn vị, ảnh và `inStock`; không trả giá vốn, tồn kho chi tiết, kho, nhân viên hoặc khách hàng khác. Tra cứu đơn chỉ trả dữ liệu của đúng cặp mã đơn + số điện thoại.

## Thanh toán và tài chính

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/payments` `/payments/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Xem phiếu thu |
| POST | `/sales-orders/:id/payments` | OWNER, MANAGER, SALES, ACCOUNTANT | Ghi thu tiền, cập nhật trạng thái thanh toán |
| GET | `/finance/receivables` | OWNER, MANAGER, ACCOUNTANT | Công nợ phải thu |
| GET | `/finance-categories` và CRUD | OWNER, MANAGER, ACCOUNTANT | Danh mục thu/chi |
| GET | `/transactions` `/transactions/:id` | OWNER, MANAGER, ACCOUNTANT | Danh sách/chi tiết giao dịch |
| POST/PATCH/DELETE | `/transactions` `/transactions/:id` | OWNER, MANAGER, ACCOUNTANT | Giao dịch thủ công; giao dịch tự động không sửa/xóa |
| GET | `/reports/cashflow?year=` | OWNER, MANAGER, ACCOUNTANT | Thu chi theo tháng |
| GET | `/reports/cycles`, `/reports/cycles/:id/cost` | OWNER, MANAGER, ACCOUNTANT | Giá thành và lãi/lỗ mùa vụ |
| GET | `/reports/products?from=&to=` | OWNER, MANAGER, ACCOUNTANT | Doanh thu theo sản phẩm |

Mỗi lần thu tiền tạo `Payment` và `Transaction INCOME` trong cùng transaction. Số tiền dùng Decimal, không cộng trừ bằng float nghiệp vụ.
