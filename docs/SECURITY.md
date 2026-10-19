# Bảo mật API

- Helmet được bật toàn cục, tắt `x-powered-by`, và giữ Swagger hoạt động tại `/docs`.
- CORS chỉ cho phép `WEB_URL` cùng các origin phân tách bằng dấu phẩy trong `CORS_ORIGINS`; request có credentials được hỗ trợ.
- Throttling mặc định là 300 request/phút/IP; riêng `auth/login` là 10 request/phút/IP.
- Access/refresh token dùng cookie `httpOnly`, `sameSite=lax`, bật `secure` ở production; logout xóa đầy đủ cookie.
- Presign media chỉ nhận JPEG, PNG, WebP, PDF; giới hạn mặc định 10 MB qua `MEDIA_MAX_MB` và dùng key ngẫu nhiên.
- Lỗi 500 ở production chỉ trả thông báo tổng quát; chi tiết stack trace chỉ ghi vào log server.
