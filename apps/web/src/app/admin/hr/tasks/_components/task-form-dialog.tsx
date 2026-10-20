'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, TaskStatus, type CreateTaskInput } from '@xfarm/shared';
import {
  FormDialog,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@xfarm/ui';
import { Loader2 } from 'lucide-react';
import type { TaskItem, EmployeeItem, AreaOption, CycleOption } from '../../common/types';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskItem | null;
  employees: EmployeeItem[];
  areas: AreaOption[];
  cycles: CycleOption[];
  onSubmit: (data: CreateTaskInput) => Promise<void>;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  employees,
  areas,
  cycles,
  onSubmit,
}: TaskFormDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      assigneeId: '',
      areaId: undefined,
      cycleId: undefined,
      dueDate: new Date(),
      status: TaskStatus.TODO,
    },
  });

  React.useEffect(() => {
    if (open) {
      setFormError(null);
      if (task) {
        reset({
          title: task.title,
          description: task.description || '',
          assigneeId: task.assigneeId,
          areaId: task.areaId || undefined,
          cycleId: task.cycleId || undefined,
          dueDate: new Date(task.dueDate),
          status: task.status,
        });
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(17, 0, 0, 0);

        reset({
          title: '',
          description: '',
          assigneeId: employees[0]?.id || '',
          areaId: undefined,
          cycleId: undefined,
          dueDate: tomorrow,
          status: TaskStatus.TODO,
        });
      }
    }
  }, [open, task, employees, reset]);

  const handleFormSubmit = async (values: CreateTaskInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu công việc';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = Boolean(task);

  // Format date for datetime-local input
  const toDateTimeLocal = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Chỉnh sửa công việc' : 'Giao việc mới'}
      description="Chỉ định nhân viên thực hiện, khu/lô, mùa vụ và thời hạn hoàn thành."
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {formError && (
          <div className="rounded-md border border-crit/20 bg-crit-bg p-3 text-sm text-crit">
            {formError}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="title">
            Tiêu đề công việc <span className="text-crit">*</span>
          </Label>
          <Input
            id="title"
            placeholder="Tưới nước và kiểm tra luống rau..."
            disabled={submitting}
            {...register('title')}
          />
          {errors.title && <p className="text-xs text-crit">{errors.title.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Mô tả chi tiết</Label>
          <textarea
            id="description"
            rows={3}
            placeholder="Mô tả công việc, lưu ý an toàn, vật tư cần dùng..."
            disabled={submitting}
            className="flex w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg shadow-xs transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs text-crit">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="assigneeId">
              Nhân viên thực hiện <span className="text-crit">*</span>
            </Label>
            <Controller
              name="assigneeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                  <SelectTrigger id="assigneeId">
                    <SelectValue placeholder="Chọn nhân viên" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.code} - {emp.fullName} ({emp.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.assigneeId && (
              <p className="text-xs text-crit">{errors.assigneeId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="dueDate">
              Hạn hoàn thành <span className="text-crit">*</span>
            </Label>
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <Input
                  id="dueDate"
                  type="datetime-local"
                  disabled={submitting}
                  value={toDateTimeLocal(field.value)}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val ? new Date(val) : new Date());
                  }}
                />
              )}
            />
            {errors.dueDate && <p className="text-xs text-crit">{errors.dueDate.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="areaId">Khu/lô nông trại (nếu có)</Label>
            <Controller
              name="areaId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={(val) => field.onChange(val === 'none' ? undefined : val)}
                  disabled={submitting}
                >
                  <SelectTrigger id="areaId">
                    <SelectValue placeholder="Chọn khu/lô..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted">(Không gắn khu/lô)</span>
                    </SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cycleId">Mùa vụ (nếu có)</Label>
            <Controller
              name="cycleId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={(val) => field.onChange(val === 'none' ? undefined : val)}
                  disabled={submitting}
                >
                  <SelectTrigger id="cycleId">
                    <SelectValue placeholder="Chọn mùa vụ..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted">(Không gắn mùa vụ)</span>
                    </SelectItem>
                    {cycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {isEdit && (
          <div className="space-y-1">
            <Label htmlFor="status">Trạng thái công việc</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TaskStatus.TODO}>Chưa thực hiện</SelectItem>
                    <SelectItem value={TaskStatus.IN_PROGRESS}>Đang thực hiện</SelectItem>
                    <SelectItem value={TaskStatus.DONE}>Hoàn thành</SelectItem>
                    <SelectItem value={TaskStatus.CANCELLED}>Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Giao việc'}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
