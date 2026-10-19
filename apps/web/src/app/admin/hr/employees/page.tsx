'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  DataTable,
  PageHeader,
  Button,
  StatusBadge,
  ConfirmDialog,
  Toast,
  useToast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@xfarm/ui';
import { Plus, Edit2, Lock, Unlock, Link2, UserCheck } from 'lucide-react';
import { PayType, PAY_TYPE_LABELS, type CreateEmployeeInput, type Paginated } from '@xfarm/shared';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { formatCurrency, canManageHR } from '../common/format';
import type { EmployeeItem } from '../common/types';
import { EmployeeFormDialog } from './_components/employee-form-dialog';
import { LinkUserDialog } from './_components/link-user-dialog';

export default function EmployeesPage() {
  const user = useAdminUser();
  const canManage = canManageHR(user?.role);
  const { message, showToast, closeToast } = useToast();

  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [payTypeFilter, setPayTypeFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [loading, setLoading] = React.useState(true);

  // Dialogs
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<EmployeeItem | null>(null);
  const [linkEmployee, setLinkEmployee] = React.useState<EmployeeItem | null>(null);
  const [lockEmployee, setLockEmployee] = React.useState<EmployeeItem | null>(null);
  const [isLocking, setIsLocking] = React.useState(false);

  const pageSize = 10;

  const fetchEmployees = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) params.set('search', search.trim());
      if (payTypeFilter !== 'ALL') params.set('payType', payTypeFilter);
      if (statusFilter !== 'ALL')
        params.set('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');

      try {
        const res = await apiFetch<Paginated<EmployeeItem>>(`/employees?${params}`, { signal });
        setEmployees(res.data || []);
        setTotal(res.total || 0);
      } catch (err) {
        if (!isAbortError(err)) {
          if (err instanceof ApiError && err.statusCode === 404) {
            // Fallback if backend API is not yet running
            setEmployees([]);
            setTotal(0);
          } else {
            showToast(err instanceof ApiError ? err.message : 'Không thể tải danh sách nhân viên');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, payTypeFilter, search, showToast, statusFilter],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchEmployees(controller.signal);
    return () => controller.abort();
  }, [fetchEmployees]);

  const handleCreateOrUpdate = async (data: CreateEmployeeInput) => {
    if (editingEmployee) {
      await apiFetch(`/employees/${editingEmployee.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      showToast('Cập nhật nhân viên thành công');
    } else {
      await apiFetch('/employees', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showToast('Thêm nhân viên thành công');
    }
    await fetchEmployees();
  };

  const handleToggleLock = async () => {
    if (!lockEmployee) return;
    setIsLocking(true);
    try {
      await apiFetch(`/employees/${lockEmployee.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !lockEmployee.isActive }),
      });
      showToast(
        lockEmployee.isActive ? 'Đã khóa tài khoản nhân viên' : 'Đã mở khóa nhân viên thành công',
      );
      setLockEmployee(null);
      await fetchEmployees();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không thể thay đổi trạng thái nhân viên');
    } finally {
      setIsLocking(false);
    }
  };

  const columns: ColumnDef<EmployeeItem>[] = React.useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã NV',
        cell: ({ row }) => (
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: 'fullName',
        header: 'Họ và tên',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.fullName}
            </div>
            {row.original.phone && (
              <div className="text-xs text-slate-500">{row.original.phone}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'position',
        header: 'Vị trí',
        cell: ({ row }) => row.original.position,
      },
      {
        accessorKey: 'payType',
        header: 'Hình thức lương',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {PAY_TYPE_LABELS[row.original.payType] || row.original.payType}
          </Badge>
        ),
      },
      {
        accessorKey: 'baseRate',
        header: 'Lương cơ bản',
        cell: ({ row }) => (
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {formatCurrency(row.original.baseRate)}
          </span>
        ),
      },
      {
        id: 'linkedUser',
        header: 'Tài khoản',
        cell: ({ row }) => {
          const linked = row.original.users?.[0];
          if (!linked) {
            return <span className="text-xs text-slate-400">Chưa liên kết</span>;
          }
          return (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
              <UserCheck className="h-3.5 w-3.5" />
              <span>{linked.email}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} />,
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: 'Thao tác',
              cell: ({ row }: { row: { original: EmployeeItem } }) => {
                const emp = row.original;
                return (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingEmployee(emp);
                        setFormOpen(true);
                      }}
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLinkEmployee(emp)}
                      title="Liên kết tài khoản người dùng"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLockEmployee(emp)}
                      title={emp.isActive ? 'Khóa nhân viên' : 'Mở khóa nhân viên'}
                      className={emp.isActive ? 'text-amber-600' : 'text-emerald-600'}
                    >
                      {emp.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [canManage],
  );

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Quản lý nhân viên"
        description="Danh sách nhân viên, mức lương và liên kết tài khoản công nhân"
      >
        {canManage && (
          <Button
            onClick={() => {
              setEditingEmployee(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm nhân viên
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select
            value={payTypeFilter}
            onValueChange={(val) => {
              setPayTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Hình thức lương" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả hình thức</SelectItem>
              <SelectItem value={PayType.DAILY}>{PAY_TYPE_LABELS[PayType.DAILY]}</SelectItem>
              <SelectItem value={PayType.MONTHLY}>{PAY_TYPE_LABELS[PayType.MONTHLY]}</SelectItem>
              <SelectItem value={PayType.PIECE}>{PAY_TYPE_LABELS[PayType.PIECE]}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
              <SelectItem value="INACTIVE">Đã khóa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={employees}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm theo mã hoặc họ tên nhân viên..."
        isLoading={loading}
      />

      {/* Dialog tạo / sửa nhân viên */}
      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSubmit={handleCreateOrUpdate}
      />

      {/* Dialog liên kết User */}
      <LinkUserDialog
        open={Boolean(linkEmployee)}
        onOpenChange={(open) => {
          if (!open) setLinkEmployee(null);
        }}
        employee={linkEmployee}
        onSuccess={() => void fetchEmployees()}
      />

      {/* Confirm khóa / mở khóa */}
      <ConfirmDialog
        open={Boolean(lockEmployee)}
        onOpenChange={(open) => {
          if (!open) setLockEmployee(null);
        }}
        title={lockEmployee?.isActive ? 'Khóa nhân viên' : 'Mở khóa nhân viên'}
        description={
          lockEmployee?.isActive
            ? `Bạn có chắc muốn khóa nhân viên ${lockEmployee?.fullName} (${lockEmployee?.code})? Nhân viên này sẽ không thể nhận việc mới.`
            : `Mở khóa nhân viên ${lockEmployee?.fullName} (${lockEmployee?.code}) để tiếp tục làm việc.`
        }
        confirmText={lockEmployee?.isActive ? 'Khóa nhân viên' : 'Mở khóa'}
        isDanger={Boolean(lockEmployee?.isActive)}
        isLoading={isLocking}
        onConfirm={handleToggleLock}
      />
    </div>
  );
}
