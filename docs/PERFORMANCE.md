# API performance audit

Đo bằng `apps/api/scripts/perf-probe.ts` trên DB `xfarm_t_perf_audit`, Node 22, dữ liệu demo hiện có. Probe khởi động Nest trong cùng process, đăng nhập OWNER, bật Prisma query log và đo từng request tuần tự. Query count gồm cả truy vấn xác thực JWT của request.

## Kết quả sau tối ưu

| Endpoint | pageSize | HTTP | Queries | ms |
|---|---:|---:|---:|---:|
| activities | 20 | 200 | 6 | 23 |
| activities | 100 | 200 | 6 | 17 |
| stock/balances | 20 | 200 | 3 | 15 |
| stock/balances | 100 | 200 | 3 | 11 |
| stock/moves | 20 | 200 | 7 | 9 |
| stock/moves | 100 | 200 | 7 | 15 |
| sales-orders | 20 | 200 | 4 | 20 |
| sales-orders | 100 | 200 | 4 | 23 |
| transactions | 20 | 200 | 6 | 8 |
| transactions | 100 | 200 | 7 | 14 |
| bookings | 20 | 200 | 5 | 8 |
| bookings | 100 | 200 | 5 | 13 |
| iot/series | - | 200 | 2 | 6 |
| dashboard/summary | - | 200 | 2 | 13 |
| dashboard/charts | - | 200 | 3 | 8 |
| reports/cycles | - | 200 | 6 | 35 |

Các endpoint chính đều dưới 300 ms trên DB hiện tại. `reports/cycles` được gom từ N+1 truy vấn theo từng cycle thành một truy vấn lấy cycle/production và bốn aggregate SQL (6 truy vấn trong bảng gồm 1 truy vấn xác thực). `dashboard/summary` được gom từ 7 truy vấn aggregate thành 1 truy vấn SQL. Danh sách activities bỏ eager-load materials/media không dùng ở màn danh sách; bookings bỏ eager-load payments; transactions gom tra cứu Payment/PO thành một truy vấn join.

## Baseline quan sát được

Trước thay đổi, activities page 20/100 lần lượt phát sinh 10/10 query, bookings 6/6 query, và transactions 6/8 query. Dashboard summary có 7 truy vấn aggregate nghiệp vụ. Sau thay đổi, các số tương ứng là 6/6, 5/5, 6/7 và 1 truy vấn nghiệp vụ.

`stock/moves` vẫn còn 6 truy vấn nghiệp vụ (7 gồm xác thực) do Prisma tách bốn quan hệ item, lot và hai kho; chấp nhận được vì các quan hệ này cần được làm giàu cho từng dòng và thời gian vẫn dưới 300 ms. `reports/cycles` đạt 6 truy vấn gồm xác thực, không còn truy vấn theo từng cycle.

## Đo bổ sung sau tối ưu báo cáo cycle

Đo ngày 20/10/2026 trên DB riêng `xfarm_t_perf_audit` sau `db:seed`, `db:seed:demo` (4.057 đơn, 82.080 readings), Node 22:

| Endpoint | Queries | ms |
|---|---:|---:|
| reports/cycles | 6 | 35 |

Trước tối ưu, `reports/cycles` phát sinh hơn 300 truy vấn và khoảng 824 ms trên dữ liệu demo. E2E reports đối chiếu các trường material/expense/labor/total/revenue/profit/output của danh sách với endpoint `/reports/cycles/:id/cost`, đồng thời kiểm tra loại trừ đơn đã hủy.

## Chạy lại

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm --filter @xfarm/api build
pnpm --filter @xfarm/api exec tsx scripts/perf-probe.ts
```

Migration `20261020130000_perf_indexes` chỉ thêm index cho truy vấn list/time-series thường dùng; không sửa index hay migration cũ.
