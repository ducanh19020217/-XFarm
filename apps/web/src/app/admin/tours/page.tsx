import * as React from 'react';
import { PageHeader } from '@xfarm/ui';

export default function AdminToursPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Tour Du lịch"
        description="Danh sách và thông tin các tour trải nghiệm sinh thái tại XFarm"
      />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm text-slate-500">
          Chức năng quản lý tour du lịch và suất trải nghiệm đang được phát triển.
        </p>
      </div>
    </div>
  );
}
