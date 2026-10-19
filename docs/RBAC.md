# Ma trận phân quyền API

Phạm vi rà soát: toàn bộ controller dưới `apps/api/src/modules/**/*.controller.ts`. Tất cả đường dẫn bên dưới có tiền tố `/api/v1`; `PUBLIC` là route không cần đăng nhập. Quyền ở đây là quyền qua `@Roles`; riêng WORKER còn bị giới hạn bản ghi được giao trong service của `tasks` và `attendance`, hoặc chỉ được ghi nhật ký bằng user hiện tại trong `activities`.

| Module | Method và path | Quyền |
|---|---|---|
| auth | POST `/auth/login`, `/auth/refresh`, `/auth/logout` | PUBLIC |
| auth | GET `/auth/me` | mọi user đã đăng nhập |
| users | GET `/users`, GET `/users/:id`, POST `/users`, PATCH `/users/:id`, PATCH `/users/:id/status` | OWNER |
| media | POST `/media/presign`, POST `/media` | OWNER, MANAGER, WORKER |
| areas | GET `/areas`, GET `/areas/tree`, GET `/areas/:id` | OWNER, MANAGER, ACCOUNTANT, SALES |
| areas | POST `/areas`, PATCH `/areas/:id` | OWNER, MANAGER |
| cycles | GET `/cycles`, GET `/cycles/:id` | OWNER, MANAGER, ACCOUNTANT, SALES |
| cycles | GET `/cycles/:id/labor-cost` | OWNER, MANAGER, ACCOUNTANT |
| cycles | POST `/cycles`, PATCH `/cycles/:id`, POST `/cycles/:id/transition` | OWNER, MANAGER |
| activities | GET `/activities`, GET `/activities/:id`, GET `/cycles/:id/timeline` | OWNER, MANAGER, ACCOUNTANT, SALES, WORKER |
| activities | POST `/activities`, PATCH `/activities/:id` | OWNER, MANAGER, WORKER |
| activities | DELETE `/activities/:id` | OWNER, MANAGER |
| animal-groups | GET `/animal-groups`, GET `/animal-groups/:id` | OWNER, MANAGER, ACCOUNTANT, SALES |
| animal-groups | POST `/animal-groups`, PATCH `/animal-groups/:id` | OWNER, MANAGER |
| animals | GET `/animals`, GET `/animals/:id`, GET `/animals/:id/events` | OWNER, MANAGER, ACCOUNTANT, SALES |
| animals | POST `/animals`, PATCH `/animals/:id` | OWNER, MANAGER |
| animals | POST `/animals/:id/events` | OWNER, MANAGER, WORKER |
| calendar | GET `/calendar` | OWNER, MANAGER, ACCOUNTANT, SALES |
| items | GET `/items`, GET `/items/:id` | OWNER, MANAGER, ACCOUNTANT, SALES |
| items | POST `/items`, PATCH `/items/:id`, DELETE `/items/:id` | OWNER, MANAGER |
| warehouses | GET `/warehouses`, GET `/warehouses/:id` | OWNER, MANAGER, ACCOUNTANT, SALES |
| warehouses | POST `/warehouses`, PATCH `/warehouses/:id`, DELETE `/warehouses/:id` | OWNER, MANAGER |
| stock | GET `/stock/balances`, GET `/stock/moves`, GET `/stock/documents`, GET `/stock/documents/:code` | OWNER, MANAGER, ACCOUNTANT |
| stock | POST `/stock/receipts`, POST `/stock/issues`, POST `/stock/transfers`, POST `/stock/counts` | OWNER, MANAGER |
| suppliers | GET `/suppliers`, GET `/suppliers/:id` | OWNER, MANAGER, ACCOUNTANT, SALES |
| suppliers | POST `/suppliers`, PATCH `/suppliers/:id`, DELETE `/suppliers/:id` | OWNER, MANAGER, ACCOUNTANT |
| purchase-orders | GET `/purchase-orders`, GET `/purchase-orders/:id`, POST `/purchase-orders`, PATCH `/purchase-orders/:id`, DELETE `/purchase-orders/:id`, POST `/purchase-orders/:id/order`, POST `/purchase-orders/:id/cancel` | OWNER, MANAGER, ACCOUNTANT |
| purchase-orders | POST `/purchase-orders/:id/receive` | OWNER, MANAGER |
| harvest-lots | GET `/harvest-lots`, GET `/harvest-lots/:id` | OWNER, MANAGER, ACCOUNTANT, SALES |
| harvest-lots | PATCH `/harvest-lots/:id` | OWNER, MANAGER |
| alerts | GET `/alerts`, GET `/alerts/unread-count`, GET `/alerts/:id`, POST `/alerts/read-all`, PATCH `/alerts/:id/read`, POST `/alerts/run-inventory-check` | OWNER, MANAGER |
| tasks | GET `/tasks`, GET `/tasks/my`, GET `/tasks/:id` | OWNER, MANAGER, ACCOUNTANT, WORKER |
| tasks | POST `/tasks`, PATCH `/tasks/:id`, DELETE `/tasks/:id` | OWNER, MANAGER |
| tasks | POST `/tasks/:id/start`, POST `/tasks/:id/complete` | OWNER, MANAGER, WORKER |
| employees | GET `/employees`, GET `/employees/:id` | OWNER, MANAGER, ACCOUNTANT |
| employees | POST `/employees`, PATCH `/employees/:id`, DELETE `/employees/:id`, PATCH `/employees/:id/user` | OWNER, MANAGER |
| attendance | GET `/attendance`, GET `/attendance/:id` | OWNER, MANAGER, ACCOUNTANT, WORKER |
| attendance | POST `/attendance/check-in`, POST `/attendance/check-out` | OWNER, MANAGER, WORKER |
| attendance | POST `/attendance`, PATCH `/attendance/:id`, DELETE `/attendance/:id` | OWNER, MANAGER |
| payrolls | GET `/payrolls`, GET `/payrolls/:id`, POST `/payrolls`, PATCH `/payrolls/:id`, DELETE `/payrolls/:id`, POST `/payrolls/generate`, POST `/payrolls/:id/approve` | OWNER, ACCOUNTANT |
| payrolls | POST `/payrolls/:id/pay` | OWNER |
| sync | POST `/sync/batch` | OWNER, MANAGER, WORKER |
| pages | GET `/pages`, GET `/pages/:id` | OWNER, MANAGER, ACCOUNTANT, SALES |
| pages | POST `/pages`, PATCH `/pages/:id`, DELETE `/pages/:id` | OWNER, MANAGER |
| posts | GET `/posts`, GET `/posts/:id` | OWNER, MANAGER, ACCOUNTANT, SALES |
| posts | POST `/posts`, PATCH `/posts/:id`, DELETE `/posts/:id` | OWNER, MANAGER, SALES |
| products | GET `/products`, GET `/products/:id` | OWNER, MANAGER, ACCOUNTANT, SALES |
| products | POST `/products`, PATCH `/products/:id`, DELETE `/products/:id` | OWNER, MANAGER, SALES |
| site-settings | GET `/site-settings`, GET `/site-settings/:key`, PUT `/site-settings/:key`, POST `/site-settings`, DELETE `/site-settings/:key` | OWNER, MANAGER |
| public CMS | GET `/public/products`, `/public/products/:slug`, `/public/posts`, `/public/posts/:slug`, `/public/pages/:slug`, `/public/site-settings` | PUBLIC |
| public trace | GET `/public/trace/:traceCode` | PUBLIC |

## Nguyên tắc đối chiếu

- OWNER có toàn quyền; MANAGER vận hành và quản trị dữ liệu nghiệp vụ; ACCOUNTANT chỉ vào các phân hệ tài chính, mua hàng, tồn kho, bảng lương và dữ liệu đọc cần cho giá thành; SALES chỉ vào catalogue/CMS và dữ liệu đọc phục vụ bán hàng.
- WORKER chỉ đọc công việc của mình, đọc/ghi chấm công của mình và ghi nhật ký/sự kiện được giao. Không được đọc danh sách người dùng, danh mục nội bộ, kho, nhà cung cấp, mùa vụ, khu/lô, CMS admin hay cảnh báo.
- Endpoint public chỉ nằm dưới `/public/*` và service public chỉ trả dữ liệu đã publish; không dùng `@Public()` cho controller admin.
