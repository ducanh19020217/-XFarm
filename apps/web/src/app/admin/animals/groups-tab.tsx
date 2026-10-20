'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createAnimalGroupSchema,
  type CreateAnimalGroupInput,
  type Paginated,
} from '@xfarm/shared';
import {
  DataTable,
  Button,
  FormDialog,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@xfarm/ui';
import { Plus, Edit2, Layers, PawPrint, MapPin, Calendar } from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '../../../lib/api';
import { AnimalGroupItem, AreaSummary, CycleSummary, canManageAnimals } from './types';

interface GroupsTabProps {
  userRole?: string | null;
  cycles: CycleSummary[];
  areas: AreaSummary[];
}

export function GroupsTab({ userRole, cycles, areas }: GroupsTabProps) {
  const [groups, setGroups] = React.useState<AnimalGroupItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Form Dialog state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<AnimalGroupItem | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Cycles filtered to LIVESTOCK and AQUA only
  const eligibleCycles = React.useMemo(() => {
    return cycles.filter((c) => c.kind === 'LIVESTOCK' || c.kind === 'AQUA');
  }, [cycles]);

  const form = useForm<CreateAnimalGroupInput>({
    resolver: zodResolver(createAnimalGroupSchema),
    defaultValues: {
      code: '',
      cycleId: '',
      species: '',
      breed: '',
      headCount: 0,
      areaId: '',
      notes: '',
    },
  });

  const fetchGroups = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search.trim()) {
          queryParams.set('search', search.trim());
        }
        const res = await apiFetch<Paginated<AnimalGroupItem>>(
          `/animal-groups?${queryParams.toString()}`,
          { signal },
        );
        setGroups(res.data || []);
        setTotal(res.total || 0);
      } catch (err) {
        if (!isAbortError(err)) console.error('Lỗi khi tải danh sách đàn:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, search],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchGroups(controller.signal);
    return () => controller.abort();
  }, [fetchGroups]);

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormError(null);
    form.reset({
      code: '',
      cycleId: eligibleCycles[0]?.id || '',
      species: '',
      breed: '',
      headCount: 0,
      areaId: areas[0]?.id || '',
      notes: '',
    });
    setCreateOpen(true);
  };

  const handleOpenEdit = (group: AnimalGroupItem) => {
    setEditingGroup(group);
    setFormError(null);
    form.reset({
      code: group.code,
      cycleId: group.cycleId,
      species: group.species,
      breed: group.breed || '',
      headCount: group.headCount,
      areaId: group.areaId,
      notes: group.notes || '',
    });
    setCreateOpen(true);
  };

  const handleSubmit = async (data: CreateAnimalGroupInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingGroup) {
        // Update
        const payload = {
          species: data.species,
          breed: data.breed || undefined,
          headCount: Number(data.headCount),
          areaId: data.areaId,
          notes: data.notes || undefined,
        };
        await apiFetch(`/animal-groups/${editingGroup.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        const payload: Record<string, unknown> = {
          cycleId: data.cycleId,
          species: data.species,
          breed: data.breed || undefined,
          headCount: Number(data.headCount) || 0,
          areaId: data.areaId,
          notes: data.notes || undefined,
        };
        if (data.code && data.code.trim()) {
          payload.code = data.code.trim();
        }
        await apiFetch('/animal-groups', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setCreateOpen(false);
      setEditingGroup(null);
      fetchGroups();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi lưu đàn vật nuôi');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = canManageAnimals(userRole);

  const columns = React.useMemo<ColumnDef<AnimalGroupItem>[]>(() => {
    const cols: ColumnDef<AnimalGroupItem>[] = [
      {
        accessorKey: 'code',
        header: 'Mã đàn',
        cell: ({ row }) => (
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: 'species',
        header: 'Loài',
      },
      {
        accessorKey: 'breed',
        header: 'Giống',
        cell: ({ row }) => row.original.breed || '—',
      },
      {
        accessorKey: 'headCount',
        header: 'Số con',
        cell: ({ row }) => (
          <span className="font-medium">
            {Number(row.original.headCount).toLocaleString('vi-VN')} con
          </span>
        ),
      },
      {
        id: 'area',
        header: 'Khu / Chuồng',
        cell: ({ row }) => {
          const area = row.original.area;
          return area ? `${area.name} (${area.code})` : '—';
        },
      },
      {
        id: 'cycle',
        header: 'Mùa vụ',
        cell: ({ row }) => {
          const cycle = row.original.cycle;
          return cycle ? `${cycle.name} (${cycle.code})` : '—';
        },
      },
    ];

    if (canEdit) {
      cols.push({
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row.original)}
            className="h-8 px-2 text-muted hover:text-fg"
          >
            <Edit2 className="h-4 w-4 mr-1" /> Sửa
          </Button>
        ),
      });
    }

    return cols;
  }, [canEdit]);

  const totalHeads = groups.reduce((acc, g) => acc + (Number(g.headCount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-fg">
            Danh sách đàn vật nuôi
          </h2>
          <p className="text-sm text-muted">
            Quản lý đàn gia súc, gia cầm và thủy sản theo mùa vụ
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm đàn mới
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Tổng số đàn</span>
            <Layers className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg">{total}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Số lượng con</span>
            <PawPrint className="h-4 w-4 text-ok" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg">{totalHeads.toLocaleString('vi-VN')}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Mùa vụ áp dụng</span>
            <Calendar className="h-4 w-4 text-info" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg">{eligibleCycles.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Khu / Chuồng</span>
            <MapPin className="h-4 w-4 text-warn" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg">{areas.length}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={groups}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm theo mã đàn, loài, giống..."
        isLoading={isLoading}
      />

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={editingGroup ? `Cập nhật đàn ${editingGroup.code}` : 'Thêm đàn vật nuôi mới'}
        description={
          editingGroup
            ? 'Chỉnh sửa thông tin số lượng con và khu chuồng'
            : 'Tạo mới đàn vật nuôi gắn với mùa vụ chăn nuôi hoặc thủy sản'
        }
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm text-crit bg-crit-bg border border-crit/20 rounded-md">
              {formError}
            </div>
          )}

          {!editingGroup && (
            <div className="space-y-1">
              <Label htmlFor="group-code">Mã đàn (Tùy chọn, để trống sẽ tự sinh)</Label>
              <Input
                id="group-code"
                placeholder="VD: AG-0001"
                disabled={isSubmitting}
                {...form.register('code')}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="group-cycle">Mùa vụ (LIVESTOCK / AQUA) *</Label>
            {editingGroup ? (
              <Input disabled value={editingGroup.cycle?.name || editingGroup.cycleId} />
            ) : (
              <Select
                value={form.watch('cycleId')}
                onValueChange={(val) => form.setValue('cycleId', val)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="group-cycle">
                  <SelectValue placeholder="Chọn mùa vụ chăn nuôi / thủy sản" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleCycles.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Không có mùa vụ chăn nuôi/thủy sản nào
                    </SelectItem>
                  ) : (
                    eligibleCycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code} - {c.kind})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.cycleId && (
              <p className="text-xs text-crit">{form.formState.errors.cycleId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-area">Khu / Chuồng / Ao *</Label>
            <Select
              value={form.watch('areaId')}
              onValueChange={(val) => form.setValue('areaId', val)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="group-area">
                <SelectValue placeholder="Chọn khu / chuồng nuôi" />
              </SelectTrigger>
              <SelectContent>
                {areas.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Chưa có khu/chuồng nào
                  </SelectItem>
                ) : (
                  areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.areaId && (
              <p className="text-xs text-crit">{form.formState.errors.areaId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="group-species">Loài vật nuôi *</Label>
              <Input
                id="group-species"
                placeholder="VD: Bò, Lợn, Gà, Tôm..."
                disabled={isSubmitting}
                {...form.register('species')}
              />
              {form.formState.errors.species && (
                <p className="text-xs text-crit">{form.formState.errors.species.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="group-breed">Giống</Label>
              <Input
                id="group-breed"
                placeholder="VD: Bò 3B, Gà ri..."
                disabled={isSubmitting}
                {...form.register('breed')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-headCount">Số lượng con *</Label>
            <Input
              id="group-headCount"
              type="number"
              min={0}
              placeholder="VD: 50"
              disabled={isSubmitting}
              {...form.register('headCount', { valueAsNumber: true })}
            />
            {form.formState.errors.headCount && (
              <p className="text-xs text-crit">{form.formState.errors.headCount.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-notes">Ghi chú</Label>
            <Input
              id="group-notes"
              placeholder="Ghi chú thêm về đàn..."
              disabled={isSubmitting}
              {...form.register('notes')}
            />
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
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : editingGroup ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
