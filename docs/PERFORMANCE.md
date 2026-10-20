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

Các endpoint chính đều dưới 300 ms trên DB hiện tại. `dashboard/summary` được gom từ 7 truy vấn aggregate thành 1 truy vấn SQL (2 truy vấn trong bảng gồm 1 truy vấn xác thực). Danh sách activities bỏ eager-load materials/media không dùng ở màn danh sách; bookings bỏ eager-load payments; transactions gom tra cứu Payment/PO thành một truy vấn join.

## Baseline quan sát được

Trước thay đổi, activities page 20/100 lần lượt phát sinh 10/10 query, bookings 6/6 query, và transactions 6/8 query. Dashboard summary có 7 truy vấn aggregate nghiệp vụ. Sau thay đổi, các số tương ứng là 6/6, 5/5, 6/7 và 1 truy vấn nghiệp vụ.

`stock/moves` vẫn còn 6 truy vấn nghiệp vụ do Prisma tách bốn quan hệ item, lot và hai kho; đây là việc còn thiếu để đạt tuyệt đối mục tiêu ≤5 query. `reports/cycles` cũng chưa đưa vào probe chính vì implementation hiện tại vẫn N+1 trên từng cycle (hơn 300 query với bộ demo); cần một lượt tối ưu batch riêng.

## Chạy lại

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm --filter @xfarm/api build
pnpm --filter @xfarm/api exec tsx scripts/perf-probe.ts
```

Migration `20261020130000_perf_indexes` chỉ thêm index cho truy vấn list/time-series thường dùng; không sửa index hay migration cũ.
