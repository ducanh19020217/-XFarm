'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAnimalSchema, type CreateAnimalInput, type Paginated } from '@xfarm/shared';
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
import { Plus, Eye, Filter } from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '../../../lib/api';
import {
  AnimalItem,
  AnimalGroupItem,
  AnimalSex,
  AnimalStatus,
  ANIMAL_SEX_LABELS,
  ANIMAL_STATUS_LABELS,
  canManageAnimals,
} from './types';
import { AnimalStatusBadge } from './animal-status-badge';

interface AnimalsTabProps {
  userRole?: string | null;
  groups: AnimalGroupItem[];
}

export function AnimalsTab({ userRole, groups }: AnimalsTabProps) {
  const [animals, setAnimals] = React.useState<AnimalItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [groupFilter, setGroupFilter] = React.useState<string>('ALL');
  const [isLoading, setIsLoading] = React.useState(true);

  // Female animals for mother selection
  const [femaleAnimals, setFemaleAnimals] = React.useState<AnimalItem[]>([]);

  // Dialog state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CreateAnimalInput>({
    resolver: zodResolver(createAnimalSchema),
    defaultValues: {
      tag: '',
      species: '',
      breed: '',
      sex: AnimalSex.UNKNOWN,
      birthDate: undefined,
      status: AnimalStatus.ALIVE,
      groupId: '',
      motherId: '',
      notes: '',
    },
  });

  const fetchAnimals = React.useCallback(
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
        if (statusFilter !== 'ALL') {
          queryParams.set('status', statusFilter);
        }
        if (groupFilter !== 'ALL') {
          queryParams.set('groupId', groupFilter);
        }

        const res = await apiFetch<Paginated<AnimalItem>>(`/animals?${queryParams.toString()}`, {
          signal,
        });
        setAnimals(res.data || []);
        setTotal(res.total || 0);
      } catch (err) {
        if (!isAbortError(err)) console.error('Lỗi khi tải danh sách cá thể:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, search, statusFilter, groupFilter],
  );

  // Fetch female animals for the mother dropdown
  const fetchFemaleAnimals = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiFetch<Paginated<AnimalItem>>('/animals?pageSize=100', { signal });
      const allAnimals = res.data || [];
      // QUAN TRỌNG: Form tạo chỉ lọc con cái (sex === FEMALE)
      const females = allAnimals.filter((a) => a.sex === AnimalSex.FEMALE);
      setFemaleAnimals(females);
    } catch (err) {
      if (!isAbortError(err)) console.error('Lỗi khi tải danh sách con cái làm mẹ:', err);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchAnimals(controller.signal);
    return () => controller.abort();
  }, [fetchAnimals]);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchFemaleAnimals(controller.signal);
    return () => controller.abort();
  }, [fetchFemaleAnimals]);

  const handleOpenCreate = () => {
    setFormError(null);
    form.reset({
      tag: '',
      species: '',
      breed: '',
      sex: AnimalSex.UNKNOWN,
      birthDate: undefined,
      status: AnimalStatus.ALIVE,
      groupId: groups[0]?.id || '',
      motherId: '',
      notes: '',
    });
    fetchFemaleAnimals();
    setCreateOpen(true);
  };

  const handleSubmit = async (data: CreateAnimalInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        tag: data.tag.trim(),
        species: data.species.trim(),
        breed: data.breed?.trim() || undefined,
        sex: data.sex || AnimalSex.UNKNOWN,
        birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : undefined,
        status: data.status || AnimalStatus.ALIVE,
        groupId: data.groupId && data.groupId !== 'none' ? data.groupId : undefined,
        motherId: data.motherId && data.motherId !== 'none' ? data.motherId : undefined,
        notes: data.notes?.trim() || undefined,
      };

      await apiFetch('/animals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreateOpen(false);
      form.reset();
      fetchAnimals();
      fetchFemaleAnimals();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi tạo cá thể mới');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = canManageAnimals(userRole);

  const columns = React.useMemo<ColumnDef<AnimalItem>[]>(() => {
    return [
      {
        accessorKey: 'tag',
        header: 'Mã tai / Thẻ',
        cell: ({ row }) => (
          <a
            href={`/admin/animals/${row.original.id}`}
            className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-400"
          >
            {row.original.tag}
          </a>
        ),
      },
      {
        accessorKey: 'species',
        header: 'Loài',
      },
      {
        accessorKey: 'sex',
        header: 'Giới tính',
        cell: ({ row }) => ANIMAL_SEX_LABELS[row.original.sex] || row.original.sex,
      },
      {
        accessorKey: 'birthDate',
        header: 'Ngày sinh',
        cell: ({ row }) => {
          const bd = row.original.birthDate;
          if (!bd) return '—';
          return new Date(bd).toLocaleDateString('vi-VN');
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <AnimalStatusBadge status={row.original.status} />,
      },
      {
        id: 'group',
        header: 'Đàn',
        cell: ({ row }) => {
          const group = row.original.group;
          return group ? `${group.code} (${group.species})` : '—';
        },
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => (
          <a href={`/admin/animals/${row.original.id}`}>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-muted hover:text-fg">
              <Eye className="h-4 w-4 mr-1" /> Chi tiết
            </Button>
          </a>
        ),
      },
    ];
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-fg">Danh sách cá thể vật nuôi</h2>
          <p className="text-sm text-muted">
            Quản lý mã tai, giới tính, ngày sinh và phả hệ từng con
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm cá thể mới
          </Button>
        )}
      </div>

      {/* Thanh bộ lọc */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-sm font-medium text-fg">
          <Filter className="h-4 w-4 text-accent" />
          <span>Bộ lọc:</span>
        </div>

        <div className="w-44">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs border-line bg-surface text-fg">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value={AnimalStatus.ALIVE}>
                {ANIMAL_STATUS_LABELS[AnimalStatus.ALIVE]}
              </SelectItem>
              <SelectItem value={AnimalStatus.SOLD}>
                {ANIMAL_STATUS_LABELS[AnimalStatus.SOLD]}
              </SelectItem>
              <SelectItem value={AnimalStatus.DEAD}>
                {ANIMAL_STATUS_LABELS[AnimalStatus.DEAD]}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-52">
          <Select
            value={groupFilter}
            onValueChange={(val) => {
              setGroupFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs border-line bg-surface text-fg">
              <SelectValue placeholder="Đàn vật nuôi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả các đàn</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.code} ({g.species})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(statusFilter !== 'ALL' || groupFilter !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('ALL');
              setGroupFilter('ALL');
              setPage(1);
            }}
            className="h-8 text-xs text-muted hover:text-fg"
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={animals}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm theo mã tai/thẻ..."
        isLoading={isLoading}
      />

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Thêm cá thể vật nuôi mới"
        description="Đăng ký mã tai, phả hệ mẹ và thông tin sinh sản của cá thể"
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm text-crit bg-crit-bg border border-crit/20 rounded-md">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="animal-tag">Mã tai / Thẻ cá thể *</Label>
            <Input
              id="animal-tag"
              placeholder="VD: VN-BO-0012"
              disabled={isSubmitting}
              {...form.register('tag')}
            />
            {form.formState.errors.tag && (
              <p className="text-xs text-crit">{form.formState.errors.tag.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="animal-species">Loài *</Label>
              <Input
                id="animal-species"
                placeholder="VD: Bò, Lợn, Dê..."
                disabled={isSubmitting}
                {...form.register('species')}
              />
              {form.formState.errors.species && (
                <p className="text-xs text-crit">{form.formState.errors.species.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="animal-breed">Giống</Label>
              <Input
                id="animal-breed"
                placeholder="VD: Bò sữa Hà Lan..."
                disabled={isSubmitting}
                {...form.register('breed')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="animal-sex">Giới tính</Label>
              <Select
                value={form.watch('sex')}
                onValueChange={(val) => form.setValue('sex', val as AnimalSex)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="animal-sex">
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AnimalSex.MALE}>
                    {ANIMAL_SEX_LABELS[AnimalSex.MALE]}
                  </SelectItem>
                  <SelectItem value={AnimalSex.FEMALE}>
                    {ANIMAL_SEX_LABELS[AnimalSex.FEMALE]}
                  </SelectItem>
                  <SelectItem value={AnimalSex.UNKNOWN}>
                    {ANIMAL_SEX_LABELS[AnimalSex.UNKNOWN]}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="animal-birthDate">Ngày sinh</Label>
              <Input
                id="animal-birthDate"
                type="date"
                disabled={isSubmitting}
                {...form.register('birthDate')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="animal-group">Thuộc đàn</Label>
            <Select
              value={form.watch('groupId') || 'none'}
              onValueChange={(val) => form.setValue('groupId', val === 'none' ? null : val)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="animal-group">
                <SelectValue placeholder="Chọn đàn (không bắt buộc)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không thuộc đàn nào</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.code} ({g.species})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chọn mẹ - Yêu cầu chỉ lọc con cái */}
          <div className="space-y-1">
            <Label htmlFor="animal-mother">Mẹ (Chỉ hiển thị cá thể giống cái)</Label>
            <Select
              value={form.watch('motherId') || 'none'}
              onValueChange={(val) => form.setValue('motherId', val === 'none' ? null : val)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="animal-mother">
                <SelectValue placeholder="Chọn mẹ (nếu có)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không rõ / Gốc đàn</SelectItem>
                {femaleAnimals.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.tag} ({m.species}
                    {m.breed ? ` - ${m.breed}` : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted">
              * Hệ thống tự động lọc danh sách chỉ bao gồm cá thể mang giới tính Cái (FEMALE).
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="animal-notes">Ghi chú</Label>
            <Input
              id="animal-notes"
              placeholder="Đặc điểm nhận dạng, nguồn gốc..."
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : 'Thêm cá thể'}
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
