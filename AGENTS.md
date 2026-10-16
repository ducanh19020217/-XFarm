# Hướng dẫn cho AI agent làm việc trong repo XFarm

Repo này do hai agent cùng làm:
- **Antigravity** viết code.
- **Claude Code** giao việc và review.

Hai bên chỉ trao đổi qua file trong repo, nên hãy tuân thủ đúng giao thức dưới đây.

## Tài liệu bắt buộc đọc
- `docs/PLAN.md`: kế hoạch tổng thể (stack, mô hình dữ liệu, các giai đoạn). Làm đúng theo đây.
- `docs/tasks/<task>.md`: đề bài cụ thể của từng lượt việc.

## Giao thức nhận và trả việc
1. Khi được yêu cầu làm `docs/tasks/<task>.md`, đọc kỹ file đó và `docs/PLAN.md`.
2. Làm hết các việc trong file task. Commit theo Conventional Commits trên đúng nhánh mà task chỉ định.
3. Khi **xong**, tạo file `docs/tasks/<task>.DONE`, nội dung gồm:
   - Tóm tắt việc đã làm.
   - Kết quả các lệnh kiểm tra (lint / typecheck / test).
   - Những việc chưa làm được và lý do.
4. Nếu **bị chặn** (thiếu quyền, lỗi môi trường, yêu cầu mâu thuẫn), tạo file `docs/tasks/<task>.BLOCKED` ghi rõ vấn đề, rồi dừng lại.
5. Chỉ tạo file `.DONE` hoặc `.BLOCKED` **ở bước cuối cùng**, sau khi đã commit xong. Claude theo dõi hai file này để bắt đầu review.
6. Không sửa `docs/PLAN.md` và các file task. Nếu thấy cần làm khác kế hoạch, ghi lý do vào `docs/DECISIONS.md`.

## Môi trường
- Node 22 LTS: chạy `source ~/.nvm/nvm.sh && nvm install 22 && nvm use 22`. Máy đang mặc định Node 18, không dùng bản này.
- pnpm 9: dùng `corepack enable && corepack prepare pnpm@9 --activate`.
- Docker đã có sẵn.
