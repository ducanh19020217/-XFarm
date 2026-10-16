import { execFileSync } from 'child_process';
import path from 'path';
import * as dotenv from 'dotenv';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  const databaseUrl =
    process.env.DATABASE_URL_TEST ||
    'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
  execFileSync(
    'pnpm',
    // migrate deploy chỉ áp migration còn thiếu (tạo DB nếu chưa có) và không xóa dữ liệu;
    // mỗi spec tự dọn dữ liệu của mình. Không dùng `migrate reset` (phá hủy DB, Prisma chặn khi chạy dưới AI agent).
    ['--filter', '@xfarm/db', 'exec', 'prisma', 'migrate', 'deploy'],
    {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    },
  );
}
