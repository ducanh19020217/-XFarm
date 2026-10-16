import * as React from 'react';
import Link from 'next/link';
import { PageHeader, Button } from '@xfarm/ui';
import { Users, Sprout, ArrowRight } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Chào mừng đến với XFarm ERP"
        description="Hệ thống quản lý và vận hành tích hợp cho trang trại sinh thái thông minh"
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-4">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              Quản lý Người dùng
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Quản trị tài khoản nhân viên, gán vai trò quyền hạn và quản lý trạng thái tài khoản
              trong hệ thống.
            </p>
          </div>
          <div className="mt-6">
            <Link href="/admin/users">
              <Button variant="default" size="sm" className="w-full">
                Truy cập quản lý người dùng
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 mb-4">
            <Sprout className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
            Sản xuất nông nghiệp
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Quản lý khu/lô, mùa vụ cây trồng, đàn vật nuôi, ao thủy sản và nhật ký nông trại điện
            tử.
          </p>
          <div className="mt-6 text-xs text-slate-400 italic">
            Giai đoạn 1 – Đang chuẩn bị triển khai
          </div>
        </div>
      </div>
    </div>
  );
}
