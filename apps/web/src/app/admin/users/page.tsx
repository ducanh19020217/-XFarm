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
import { Plus, Edit2, Lock, Unlock, Loader2 } from 'lucide-react';
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
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.fullName}
          </span>
          <span className="block text-xs text-slate-400">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Số điện thoại',
      cell: ({ row }) => row.original.phone || '—',
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
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('vi-VN'),
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
              title="Chỉnh sửa người dùng"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={u.isActive ? 'outline' : 'default'}
              size="sm"
              className={
                u.isActive
                  ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                  : 'bg-emerald-600 text-white'
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
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Thêm người dùng mới
        </Button>
      </PageHeader>

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

      {/* Form Dialog: Create User */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Thêm người dùng mới"
        description="Nhập thông tin để tạo tài khoản nhân sự mới cho hệ thống"
      >
        {formError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {formError}
          </div>
        )}
        <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="create-email">Địa chỉ Email *</Label>
            <Input
              id="create-email"
              type="email"
              placeholder="nhanvien@xfarm.local"
              disabled={isSubmitting}
              {...createForm.register('email')}
            />
            {createForm.formState.errors.email && (
              <p className="text-xs text-red-600">{createForm.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="create-password">Mật khẩu *</Label>
            <Input
              id="create-password"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              disabled={isSubmitting}
              {...createForm.register('password')}
            />
            {createForm.formState.errors.password && (
              <p className="text-xs text-red-600">{createForm.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="create-fullname">Họ và tên *</Label>
            <Input
              id="create-fullname"
              placeholder="Nguyễn Văn A"
              disabled={isSubmitting}
              {...createForm.register('fullName')}
            />
            {createForm.formState.errors.fullName && (
              <p className="text-xs text-red-600">{createForm.formState.errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="create-phone">Số điện thoại</Label>
            <Input
              id="create-phone"
              placeholder="0912345678"
              disabled={isSubmitting}
              {...createForm.register('phone')}
            />
          </div>

          <div className="space-y-1">
            <Label>Vai trò hệ thống *</Label>
            <Select
              defaultValue={createForm.getValues('role')}
              onValueChange={(val) => createForm.setValue('role', val as Role)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
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
            >
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {formError}
          </div>
        )}
        <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-email">Địa chỉ Email</Label>
            <Input
              id="edit-email"
              type="email"
              disabled={isSubmitting}
              {...editForm.register('email')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-password">Mật khẩu mới (để trống nếu không đổi)</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="••••••••"
              disabled={isSubmitting}
              {...editForm.register('password')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-fullname">Họ và tên *</Label>
            <Input id="edit-fullname" disabled={isSubmitting} {...editForm.register('fullName')} />
            {editForm.formState.errors.fullName && (
              <p className="text-xs text-red-600">{editForm.formState.errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-phone">Số điện thoại</Label>
            <Input id="edit-phone" disabled={isSubmitting} {...editForm.register('phone')} />
          </div>

          <div className="space-y-1">
            <Label>Vai trò hệ thống *</Label>
            <Select
              defaultValue={editUser?.role}
              onValueChange={(val) => editForm.setValue('role', val as Role)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
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
            >
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
