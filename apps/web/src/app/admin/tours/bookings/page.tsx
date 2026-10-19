import * as React from 'react';
import { PageHeader } from '@xfarm/ui';

export default function AdminTourBookingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Đặt chỗ Tour"
        description="Danh sách đặt chỗ và thông tin khách tham quan trải nghiệm"
      />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm text-slate-500">
          Chức năng quản lý đặt chỗ tour đang được phát triển.
        </p>
      </div>
    </div>
  );
}
