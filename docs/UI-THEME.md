# Bảng ánh xạ Theme XFarm (Light / Dark)

Tài liệu hướng dẫn hệ thống màu và utility ngữ nghĩa của XFarm theo Tailwind CSS v4.

## 1. Nguyên tắc thiết kế
- **Không dùng màu cứng:** Tuyệt đối không dùng `bg-white`, `text-black`, `text-slate-*`, `bg-emerald-50`... cứng trong trang; luôn dùng utility ánh xạ token bên dưới.
- **Dịu mắt:** Light mode dùng `--t-bg: #f4f6f5` (không dùng trắng tinh) để bớt chói. Dark mode dùng `--t-bg: #1a1c23` và `--t-surface: #1e2029`, chữ `--t-text: #dcdfe8` (không dùng chữ trắng tinh trên nền đen tinh).
- **Hài hòa:** Tránh các mảng màu bão hòa mạnh trên diện rộng.

---

## 2. Bảng Token Màu (CSS Variables)

| Biến CSS | Ý nghĩa | Light Mode | Dark Mode (`html.dark`) |
| :--- | :--- | :--- | :--- |
| `--t-bg` | Nền trang tổng thể (app background) | `#f4f6f5` | `#1a1c23` |
| `--t-surface` | Nền thẻ, bảng, sidebar, modal (surface 1) | `#ffffff` | `#1e2029` |
| `--t-surface-2` | Nền phụ, header bảng, hàng zebra (surface 2) | `#f6f7f8` | `#23252f` |
| `--t-hover` | Nền khi hover item/hàng | `hsla(150, 15%, 40%, 8%)` | `hsla(229, 15%, 50%, 16%)` |
| `--t-selected` | Nền khi mục được chọn (active menu item) | `#e3f4ea` | `#0f2e1f` |
| `--t-border` | Đường viền thông thường (border line) | `hsla(229, 15%, 6%, 12%)` | `#2a2d39` |
| `--t-border-strong` | Đường viền nhấn mạnh | `#c4c7d4` | `#303341` |
| `--t-text` | Màu chữ chính | `#21232c` | `#dcdfe8` |
| `--t-text-2` | Màu chữ phụ | `#3a3d4a` | `#c4c7d4` |
| `--t-text-3` | Màu chữ nhạt / placeholder / icon phụ | `#6c7393` | `#8a8fa8` |
| `--t-accent` | Màu chủ đạo (nông nghiệp xanh lá) | `#15803d` | `#4ade80` |
| `--t-accent-hover` | Màu chủ đạo khi hover | `#166534` | `#22c55e` |
| `--t-accent-fade` | Màu nhấn nhạt | `#bbf7d0` | `#14532d` |
| `--t-accent-on-fade`| Chữ trên nền nhấn nhạt | `#14532d` | `#bbf7d0` |
| `--t-accent-bg` | Nền badge/card chủ đạo | `#ecfdf3` | `#0f2e1f` |
| `--t-crit` | Màu cảnh báo nguy cấp (Critical / Error) | `#c91a03` | `#e8705c` |
| `--t-crit-fill` | Màu điền đồ thị nguy cấp | `#fc4d36` | `#e8705c` |
| `--t-crit-bg` | Nền cảnh báo nguy cấp | `rgba(201, 26, 3, 0.10)` | `rgba(252, 77, 54, 0.16)` |
| `--t-warn` | Màu cảnh báo mức vừa (Warning) | `#a86b00` | `#e0a95e` |
| `--t-warn-fill` | Màu điền đồ thị cảnh báo | `#ffa100` | `#e0a95e` |
| `--t-warn-bg` | Nền cảnh báo mức vừa | `rgba(255, 161, 0, 0.14)`| `rgba(224, 169, 94, 0.16)`|
| `--t-ok` | Màu trạng thái tốt / thành công (Success) | `#367d1c` | `#50bc29` |
| `--t-ok-fill` | Màu điền đồ thị thành công | `#50bc29` | `#50bc29` |
| `--t-ok-bg` | Nền trạng thái thành công | `rgba(54, 125, 28, 0.12)`| `rgba(80, 188, 41, 0.16)`|
| `--t-info` | Màu thông tin (Info) | `#0052cc` | `#8fbbff` |
| `--t-info-bg` | Nền thông tin | `#edf3ff` | `#001f4d` |
| `--t-chip` | Nền tag / chip | `#dcfce7` | `#14532d` |
| `--t-chip-text` | Chữ tag / chip | `#166534` | `#bbf7d0` |

---

## 3. Bảng Ánh Xạ Utility Ngữ Nghĩa (Tailwind CSS v4 `@theme inline`)

| Utility Ngữ Nghĩa | Thuộc tính CSS tương ứng | Giá trị tham chiếu |
| :--- | :--- | :--- |
| `bg-app` | `background-color` | `var(--t-bg)` |
| `bg-surface` | `background-color` | `var(--t-surface)` |
| `bg-surface-2` | `background-color` | `var(--t-surface-2)` |
| `bg-hover` | `background-color` | `var(--t-hover)` |
| `bg-selected` | `background-color` | `var(--t-selected)` |
| `text-fg` | `color` | `var(--t-text)` |
| `text-fg-2` | `color` | `var(--t-text-2)` |
| `text-muted` | `color` | `var(--t-text-3)` |
| `border-line` | `border-color` | `var(--t-border)` |
| `border-line-strong`| `border-color` | `var(--t-border-strong)` |
| `text-accent` | `color` | `var(--t-accent)` |
| `bg-accent` | `background-color` | `var(--t-accent)` |
| `bg-accent-bg` | `background-color` | `var(--t-accent-bg)` |
| `text-accent-fade` | `color` | `var(--t-accent-fade)` |
| `bg-accent-fade` | `background-color` | `var(--t-accent-fade)` |
| `text-crit` | `color` | `var(--t-crit)` |
| `bg-crit-bg` | `background-color` | `var(--t-crit-bg)` |
| `text-warn` | `color` | `var(--t-warn)` |
| `bg-warn-bg` | `background-color` | `var(--t-warn-bg)` |
| `text-ok` | `color` | `var(--t-ok)` |
| `bg-ok-bg` | `background-color` | `var(--t-ok-bg)` |
| `text-info` | `color` | `var(--t-info)` |
| `bg-info-bg` | `background-color` | `var(--t-info-bg)` |
| `bg-chip` | `background-color` | `var(--t-chip)` |
| `text-chip-text` | `color` | `var(--t-chip-text)` |

---

## 4. Cách Sử Dụng Trong Component

- **Thẻ / Card / Modal:** `bg-surface border border-line rounded-lg shadow-xs text-fg`
- **Bảng:** `Table` với `TableHeader` có `bg-surface-2 sticky top-0`, `TableRow` có `even:bg-surface-2/40 hover:bg-hover`
- **Nút:** `Button` bo góc `rounded-lg` (8px), bóng nhẹ, hỗ trợ các biến thể `default`, `outline`, `secondary`, `destructive`, `ghost`
- **Huy hiệu:** `Badge` & `StatusBadge` kết hợp `bg-*-bg` và `text-*` tương ứng:
  - Thành công: `bg-ok-bg text-ok`
  - Cảnh báo: `bg-warn-bg text-warn`
  - Lỗi / Đã hủy: `bg-crit-bg text-crit`
  - Thông tin: `bg-info-bg text-info`
  - Mặc định / Chủ trại: `bg-accent-bg text-accent`
- **Biểu đồ (Recharts):** dùng hàm `chartColors()` từ `@/lib/chart-colors` để đọc giá trị CSS var động tương ứng cho grid, axis, tooltip:
  ```ts
  const colors = chartColors();
  <CartesianGrid stroke={colors.grid} />
  <XAxis stroke={colors.axis} tick={{ fill: colors.axis }} />
  ```
