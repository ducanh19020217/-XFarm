'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type Paginated,
  Role,
} from '@xfarm/shared';
import {
  DataTable,
  PageHeader,
  Button,
  StatusBadge,
  FormDialog,
  ConfirmDialog,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@xfarm/ui';
import {
  Plus,
  Edit2,
  Lock,
  Unlock,
  Loader2,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Shield,
} from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = React.useState<UserItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialogs state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<UserItem | null>(null);
  const [statusUser, setStatusUser] = React.useState<UserItem | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Forms
  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      phone: '',
      role: Role.WORKER,
    },
  });

  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      phone: '',
      role: Role.WORKER,
    },
  });

  const fetchUsers = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const res = await apiFetch<Paginated<UserItem>>(
          `/users?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
          { signal },
        );
        setUsers(res.data);
        setTotal(res.total);
      } catch (err) {
        if (!isAbortError(err)) console.error('Lỗi khi tải danh sách người dùng:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, search],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchUsers(controller.signal);
    return () => controller.abort();
  }, [fetchUsers]);

  // Handle Create Submit
  const handleCreateSubmit = async (data: CreateUserInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setCreateOpen(false);
      createForm.reset();
      fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi tạo người dùng');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (data: UpdateUserInput) => {
    if (!editUser) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const updatePayload: Record<string, unknown> = {
        fullName: data.fullName,
        phone: data.phone || undefined,
        role: data.role,
      };
      if (data.email && data.email !== editUser.email) {
        updatePayload.email = data.email;
      }
      if (data.password && data.password.trim() !== '') {
        updatePayload.password = data.password;
      }

      await apiFetch(`/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      });
      setEditUser(null);
      editForm.reset();
      fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi cập nhật thông tin');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Status Toggle
  const handleToggleStatus = async () => {
    if (!statusUser) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/users/${statusUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !statusUser.isActive }),
      });
      setStatusUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<UserItem>[] = [
    {
      accessorKey: 'fullName',
      header: 'Họ và tên',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-fg">{row.original.fullName}</span>
          <span className="block text-xs text-muted">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Số điện thoại',
      cell: ({ row }) => <span className="text-fg">{row.original.phone || '—'}</span>,
    },
    {
      accessorKey: 'role',
      header: 'Vai trò',
      cell: ({ row }) => <StatusBadge status={row.original.role} />,
    },
    {
      accessorKey: 'isActive',
      header: 'Trạng thái',
      cell: ({ row }) => <StatusBadge status={row.original.isActive} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ row }) => (
        <span className="text-muted text-xs">
          {new Date(row.original.createdAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditUser(u);
                setFormError(null);
                editForm.reset({
                  email: u.email,
                  fullName: u.fullName,
                  phone: u.phone || '',
                  role: u.role,
                  password: '',
                });
              }}
              className="border-line text-fg hover:bg-hover hover:text-accent"
              title="Chỉnh sửa người dùng"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={u.isActive ? 'outline' : 'default'}
              size="sm"
              className={
                u.isActive
                  ? 'border-line text-crit hover:bg-crit-bg/20'
                  : 'bg-accent hover:bg-accent-hover text-on-accent font-medium'
              }
              onClick={() => setStatusUser(u)}
              title={u.isActive ? 'Khóa người dùng' : 'Mở khóa người dùng'}
            >
              {u.isActive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </Button>
          </div>
        );
      },
    },
  ];

  const activeCount = users.filter((u) => u.isActive).length;
  const lockedCount = users.filter((u) => !u.isActive).length;
  const managerCount = users.filter((u) => u.role === Role.OWNER || u.role === Role.MANAGER).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Người dùng"
        description="Quản lý danh sách tài khoản, vai trò và trạng thái hoạt động của nhân sự trong nông trại"
      >
        <Button
          onClick={() => {
            setCreateOpen(true);
            setFormError(null);
            createForm.reset({
              email: '',
              password: '',
              fullName: '',
              phone: '',
              role: Role.WORKER,
            });
          }}
          className="bg-accent hover:bg-accent-hover text-on-accent font-medium"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Thêm người dùng mới
        </Button>
      </PageHeader>

      {/* Stat KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Tổng tài khoản
            </span>
            <UsersIcon className="h-4 w-4 text-muted" />
          </div>
          <p className="text-2xl font-bold mt-2 text-fg">{total}</p>
        </div>

        <div className="rounded-lg border border-ok/30 bg-ok-bg/20 p-4 shadow-xs text-ok">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">Đang hoạt động</span>
            <UserCheck className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{activeCount}</p>
        </div>

        <div className="rounded-lg border border-crit/30 bg-crit-bg/20 p-4 shadow-xs text-crit">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">Đã khóa</span>
            <UserX className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{lockedCount}</p>
        </div>

        <div className="rounded-lg border border-info/30 bg-info-bg/20 p-4 shadow-xs text-info">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Quản lý / Chủ trại
            </span>
            <Shield className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{managerCount}</p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={users}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="Tìm theo tên, email, số điện thoại..."
          isLoading={isLoading}
        />
      </div>

      {/* Form Dialog: Create User */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Thêm người dùng mới"
        description="Nhập thông tin để tạo tài khoản nhân sự mới cho hệ thống"
      >
        {formError && (
          <div className="mb-4 rounded-md border border-crit/30 bg-crit-bg/20 p-3 text-sm text-crit">
            {formError}
          </div>
        )}
        <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label htmlFor="create-email" className="text-fg">
                Email *
              </Label>
              <Input
                id="create-email"
                type="email"
                placeholder="nhanvien@xfarm.local"
                disabled={isSubmitting}
                className="bg-surface border-line text-fg"
                {...createForm.register('email')}
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-crit">{createForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-password" className="text-fg">
                Mật khẩu *
              </Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                disabled={isSubmitting}
                className="bg-surface border-line text-fg"
                {...createForm.register('password')}
              />
              {createForm.formState.errors.password && (
                <p className="text-xs text-crit">{createForm.formState.errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label htmlFor="create-fullname" className="text-fg">
                Họ và tên *
              </Label>
              <Input
                id="create-fullname"
                placeholder="Nguyễn Văn A"
                disabled={isSubmitting}
                className="bg-surface border-line text-fg"
                {...createForm.register('fullName')}
              />
              {createForm.formState.errors.fullName && (
                <p className="text-xs text-crit">{createForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-phone" className="text-fg">
                Số điện thoại
              </Label>
              <Input
                id="create-phone"
                placeholder="0912345678"
                disabled={isSubmitting}
                className="bg-surface border-line text-fg"
                {...createForm.register('phone')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-fg">Vai trò hệ thống *</Label>
            <Select
              defaultValue={createForm.getValues('role')}
              onValueChange={(val) => createForm.setValue('role', val as Role)}
            >
              <SelectTrigger className="bg-surface border-line text-fg">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-line text-fg">
                <SelectItem value={Role.OWNER}>Chủ trại (OWNER)</SelectItem>
                <SelectItem value={Role.MANAGER}>Quản lý (MANAGER)</SelectItem>
                <SelectItem value={Role.ACCOUNTANT}>Kế toán (ACCOUNTANT)</SelectItem>
                <SelectItem value={Role.SALES}>Bán hàng (SALES)</SelectItem>
                <SelectItem value={Role.WORKER}>Công nhân (WORKER)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={isSubmitting}
              className="border-line text-fg hover:bg-hover"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-accent hover:bg-accent-hover text-on-accent font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Tạo tài khoản'
              )}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Form Dialog: Edit User */}
      <FormDialog
        open={Boolean(editUser)}
        onOpenChange={(open) => !open && setEditUser(null)}
        title="Chỉnh sửa thông tin người dùng"
        description="Cập nhật thông tin nhân viên hoặc cấp lại mật khẩu"
      >
        {formError && (
          <div className="mb-4 rounded-md border border-crit/30 bg-crit-bg/20 p-3 text-sm text-crit">
            {formError}
          </div>
        )}
        <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label htmlFor="edit-email" className="text-fg">
                Địa chỉ Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                disabled={isSubmitting}
                className="bg-surface border-line text-fg"
                {...editForm.register('email')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-password" className="text-fg">
                Mật khẩu mới (để trống nếu không đổi)
              </Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="••••••••"
                disabled={isSubmitting}
                className="bg-surface border-line text-fg"
                {...editForm.register('password')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label htmlFor="edit-fullname" className="text-fg">
                Họ và tên *
              </Label>
              <Input
                id="edit-fullname"
                disabled={isSubmitting}
                className="bg-surface border-line text-fg"
                {...editForm.register('fullName')}
              />
              {editForm.formState.errors.fullName && (
                <p className="text-xs text-crit">{editForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-phone" className="text-fg">
                Số điện thoại
              </Label>
              <Input
                id="edit-phone"
                disabled={isSubmitting}
                className="bg-surface border-line text-fg"
                {...editForm.register('phone')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-fg">Vai trò hệ thống *</Label>
            <Select
              defaultValue={editUser?.role}
              onValueChange={(val) => editForm.setValue('role', val as Role)}
            >
              <SelectTrigger className="bg-surface border-line text-fg">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-line text-fg">
                <SelectItem value={Role.OWNER}>Chủ trại (OWNER)</SelectItem>
                <SelectItem value={Role.MANAGER}>Quản lý (MANAGER)</SelectItem>
                <SelectItem value={Role.ACCOUNTANT}>Kế toán (ACCOUNTANT)</SelectItem>
                <SelectItem value={Role.SALES}>Bán hàng (SALES)</SelectItem>
                <SelectItem value={Role.WORKER}>Công nhân (WORKER)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditUser(null)}
              disabled={isSubmitting}
              className="border-line text-fg hover:bg-hover"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-accent hover:bg-accent-hover text-on-accent font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Cập nhật thông tin'
              )}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Confirm Dialog: Lock/Unlock User */}
      <ConfirmDialog
        open={Boolean(statusUser)}
        onOpenChange={(open) => !open && setStatusUser(null)}
        title={statusUser?.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
        description={`Bạn có chắc chắn muốn ${
          statusUser?.isActive ? 'khóa' : 'mở khóa'
        } tài khoản của người dùng "${statusUser?.fullName}" (${statusUser?.email})? ${
          statusUser?.isActive
            ? 'Người dùng sẽ không thể đăng nhập vào hệ thống sau khi bị khóa.'
            : 'Người dùng sẽ có thể đăng nhập lại vào hệ thống.'
        }`}
        confirmText={statusUser?.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
        cancelText="Hủy bỏ"
        isDanger={statusUser?.isActive}
        isLoading={isSubmitting}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}
