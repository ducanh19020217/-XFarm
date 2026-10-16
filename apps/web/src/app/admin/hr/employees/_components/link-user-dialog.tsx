'use client';

import * as React from 'react';
import {
  FormDialog,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@xfarm/ui';
import { Loader2, Link2, Unlink } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { EmployeeItem, UserOption } from '../../common/types';

interface LinkUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeItem | null;
  onSuccess: () => void;
}

export function LinkUserDialog({ open, onOpenChange, employee, onSuccess }: LinkUserDialogProps) {
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState<string>('none');
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && employee) {
      setError(null);
      setLoadingUsers(true);
      // Fetch users
      apiFetch<{ data: UserOption[] }>('/users?pageSize=100')
        .then((res) => {
          setUsers(res.data || []);
          // Currently linked user
          const currentUser = employee.users?.[0];
          setSelectedUserId(currentUser ? currentUser.id : 'none');
        })
        .catch(() => {
          setUsers([]);
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setSubmitting(true);
    setError(null);

    const userId = selectedUserId === 'none' ? null : selectedUserId;
    try {
      await apiFetch(`/employees/${employee.id}/user`, {
        method: 'PATCH',
        body: JSON.stringify({ userId }),
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể liên kết tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  if (!employee) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Liên kết tài khoản người dùng"
      description={`Chọn tài khoản đăng nhập để liên kết với nhân viên ${employee.fullName} (${employee.code}).`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="userSelect">Tài khoản người dùng</Label>
          {loadingUsers ? (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang tải danh sách người dùng...</span>
            </div>
          ) : (
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={submitting}>
              <SelectTrigger id="userSelect">
                <SelectValue placeholder="Chọn tài khoản..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-slate-500">(Không liên kết / Gỡ liên kết)</span>
                </SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName} ({u.email}) - {u.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Khi liên kết, công nhân đăng nhập sẽ thấy công việc và chấm công của chính mình.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={submitting || loadingUsers}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedUserId === 'none' ? (
              <>
                <Unlink className="mr-2 h-4 w-4" />
                Gỡ liên kết
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Lưu liên kết
              </>
            )}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
