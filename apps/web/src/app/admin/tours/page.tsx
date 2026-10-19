'use client';

import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTourSchema,
  type CreateTourInput,
  type Paginated,
  Role,
  slugify,
} from '@xfarm/shared';
import {
  DataTable,
  PageHeader,
  Button,
  FormDialog,
  ConfirmDialog,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from '@xfarm/ui';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Image as ImageIcon,
  CheckCircle,
  EyeOff,
} from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../admin-user-context';
import { RichTextEditor } from '@/components/editor';
import { MoneyInput } from '@/components/ui/money-input';
import { MultiImageUpload } from '@/components/ui/image-upload';

export interface TourItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceAdult: number | string;
  priceChild: number | string;
  capacity: number;
  mediaIds: string[];
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 ₫';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

export default function AdminToursPage() {
  const user = useAdminUser();
  const canEdit = user?.role === Role.OWNER || user?.role === Role.MANAGER;

  const [tours, setTours] = React.useState<TourItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTour, setEditingTour] = React.useState<TourItem | null>(null);
  const [deletingTour, setDeletingTour] = React.useState<TourItem | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSlugManual, setIsSlugManual] = React.useState(false);

  const form = useForm<CreateTourInput>({
    resolver: zodResolver(createTourSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      durationMinutes: 90,
      priceAdult: 150000,
      priceChild: 80000,
      capacity: 20,
      mediaIds: [],
      isPublished: false,
      sortOrder: 0,
    },
  });

  const fetchTours = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        let url = `/tours?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`;
        if (statusFilter === 'PUBLISHED') url += '&isPublished=true';
        if (statusFilter === 'DRAFT') url += '&isPublished=false';

        const res = await apiFetch<Paginated<TourItem>>(url, { signal });
        setTours(res.data);
        setTotal(res.total);
      } catch (err) {
        if (!isAbortError(err)) {
          if (!(err instanceof ApiError && err.statusCode === 404)) {
            console.error('Lỗi khi tải danh sách tour:', err);
          }
          setTours([]);
          setTotal(0);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, search, statusFilter],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchTours(controller.signal);
    return () => controller.abort();
  }, [fetchTours]);

  const openCreateDialog = () => {
    setEditingTour(null);
    setFormError(null);
    setIsSlugManual(false);
    form.reset({
      name: '',
      slug: '',
      description: '',
      durationMinutes: 90,
      priceAdult: 150000,
      priceChild: 80000,
      capacity: 20,
      mediaIds: [],
      isPublished: false,
      sortOrder: 0,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (tour: TourItem) => {
    setEditingTour(tour);
    setFormError(null);
    setIsSlugManual(true);
    form.reset({
      name: tour.name,
      slug: tour.slug,
      description: tour.description,
      durationMinutes: tour.durationMinutes,
      priceAdult: Number(tour.priceAdult) || 0,
      priceChild: Number(tour.priceChild) || 0,
      capacity: tour.capacity,
      mediaIds: tour.mediaIds || [],
      isPublished: tour.isPublished,
      sortOrder: tour.sortOrder ?? 0,
    });
    setDialogOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    form.setValue('name', newName, { shouldValidate: true });
    if (!isSlugManual) {
      form.setValue('slug', slugify(newName), { shouldValidate: true });
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManual(true);
    form.setValue('slug', e.target.value, { shouldValidate: true });
  };

  const handleSubmit = async (data: CreateTourInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingTour) {
        await apiFetch(`/tours/${editingTour.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } else {
        await apiFetch('/tours', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setDialogOpen(false);
      void fetchTours();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || 'Không thể lưu thông tin tour.');
      } else {
        setFormError('Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (tour: TourItem) => {
    try {
      const endpoint = tour.isPublished ? `/tours/${tour.id}/unpublish` : `/tours/${tour.id}/publish`;
      await apiFetch(endpoint, { method: 'PATCH' });
      void fetchTours();
    } catch (err) {
      console.error('Lỗi khi thay đổi trạng thái xuất bản:', err);
      alert('Không thể thay đổi trạng thái xuất bản.');
    }
  };

  const handleDelete = async () => {
    if (!deletingTour) return;
    try {
      await apiFetch(`/tours/${deletingTour.id}`, { method: 'DELETE' });
      setDeletingTour(null);
      void fetchTours();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Không thể xóa tour đã có suất hoặc đặt chỗ.');
      }
    }
  };

  const columns = React.useMemo<ColumnDef<TourItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tour trải nghiệm',
        cell: ({ row }) => {
          const item = row.original;
          const thumbnail = item.mediaIds?.[0];
          return (
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/admin/tours/${item.id}`}
                  className="font-medium text-slate-900 hover:text-emerald-600 transition-colors dark:text-slate-100 dark:hover:text-emerald-400 block truncate"
                >
                  {item.name}
                </Link>
                <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                  /{item.slug}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'durationMinutes',
        header: 'Thời lượng',
        cell: ({ row }) => (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {row.original.durationMinutes} phút
          </span>
        ),
      },
      {
        accessorKey: 'priceAdult',
        header: 'Giá người lớn',
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {formatMoney(row.original.priceAdult)}
          </span>
        ),
      },
      {
        accessorKey: 'priceChild',
        header: 'Giá trẻ em',
        cell: ({ row }) => (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {formatMoney(row.original.priceChild)}
          </span>
        ),
      },
      {
        accessorKey: 'capacity',
        header: 'Sức chứa',
        cell: ({ row }) => (
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {row.original.capacity} khách / suất
          </span>
        ),
      },
      {
        accessorKey: 'isPublished',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const isPublished = row.original.isPublished;
          return isPublished ? (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Đã xuất bản
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-slate-600 dark:text-slate-400">
              Bản nháp
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <Link href={`/admin/tours/${item.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 px-2.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
                  title="Quản lý lịch suất trải nghiệm"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Lịch suất</span>
                </Button>
              </Link>

              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    title={item.isPublished ? 'Gỡ xuất bản' : 'Xuất bản ngay'}
                    onClick={() => handleTogglePublish(item)}
                  >
                    {item.isPublished ? (
                      <EyeOff className="h-4 w-4 text-amber-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    title="Chỉnh sửa thông tin tour"
                    onClick={() => openEditDialog(item)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                    title="Xóa tour"
                    onClick={() => setDeletingTour(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [canEdit],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Tour Du lịch"
        description="Danh sách và quản lý các tour trải nghiệm sinh thái tại XFarm"
      >
        {canEdit && (
          <Button onClick={openCreateDialog} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Thêm tour mới
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <Input
            placeholder="Tìm theo tên tour hoặc slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Trạng thái:</span>
          <Select
            value={statusFilter}
            onValueChange={(val: 'ALL' | 'PUBLISHED' | 'DRAFT') => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="PUBLISHED">Đã xuất bản</SelectItem>
              <SelectItem value="DRAFT">Bản nháp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={tours}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Create / Edit Form Dialog */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingTour ? 'Chỉnh sửa Tour Trải nghiệm' : 'Thêm tour mới'}
        description="Điền thông tin chi tiết về tour du lịch, giá vé và sức chứa."
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="tour-name">
                Tên tour <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tour-name"
                placeholder="Ví dụ: Khám phá vườn cây ăn trái & hái quả"
                value={form.watch('name') || ''}
                onChange={handleNameChange}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="tour-slug">Đường dẫn tĩnh (Slug)</Label>
              <Input
                id="tour-slug"
                placeholder="kham-pha-vuon-cay-an-trai"
                value={form.watch('slug') || ''}
                onChange={handleSlugChange}
              />
              {form.formState.errors.slug && (
                <p className="text-xs text-red-500">{form.formState.errors.slug.message}</p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <Label htmlFor="tour-duration">
                Thời lượng (phút) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tour-duration"
                type="number"
                min={15}
                step={15}
                placeholder="90"
                value={form.watch('durationMinutes') ?? ''}
                onChange={(e) =>
                  form.setValue('durationMinutes', parseInt(e.target.value, 10) || 0, {
                    shouldValidate: true,
                  })
                }
              />
              {form.formState.errors.durationMinutes && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.durationMinutes.message}
                </p>
              )}
            </div>

            {/* Capacity */}
            <div className="space-y-1">
              <Label htmlFor="tour-capacity">
                Sức chứa tối đa (người / suất) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tour-capacity"
                type="number"
                min={1}
                placeholder="20"
                value={form.watch('capacity') ?? ''}
                onChange={(e) =>
                  form.setValue('capacity', parseInt(e.target.value, 10) || 0, {
                    shouldValidate: true,
                  })
                }
              />
              {form.formState.errors.capacity && (
                <p className="text-xs text-red-500">{form.formState.errors.capacity.message}</p>
              )}
            </div>

            {/* Price Adult */}
            <div className="space-y-1">
              <Label htmlFor="tour-price-adult">
                Giá vé người lớn <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={form.control}
                name="priceAdult"
                render={({ field }) => (
                  <MoneyInput
                    id="tour-price-adult"
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    placeholder="150.000"
                  />
                )}
              />
              {form.formState.errors.priceAdult && (
                <p className="text-xs text-red-500">{form.formState.errors.priceAdult.message}</p>
              )}
            </div>

            {/* Price Child */}
            <div className="space-y-1">
              <Label htmlFor="tour-price-child">
                Giá vé trẻ em <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={form.control}
                name="priceChild"
                render={({ field }) => (
                  <MoneyInput
                    id="tour-price-child"
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    placeholder="80.000"
                  />
                )}
              />
              {form.formState.errors.priceChild && (
                <p className="text-xs text-red-500">{form.formState.errors.priceChild.message}</p>
              )}
            </div>

            {/* Sort order */}
            <div className="space-y-1">
              <Label htmlFor="tour-sort">Thứ tự hiển thị</Label>
              <Input
                id="tour-sort"
                type="number"
                value={form.watch('sortOrder') ?? 0}
                onChange={(e) =>
                  form.setValue('sortOrder', parseInt(e.target.value, 10) || 0, {
                    shouldValidate: true,
                  })
                }
              />
            </div>

            {/* Publish Checkbox */}
            <div className="flex items-center gap-2 pt-6">
              <input
                id="tour-publish"
                type="checkbox"
                checked={form.watch('isPublished')}
                onChange={(e) => form.setValue('isPublished', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="tour-publish" className="cursor-pointer font-normal">
                Xuất bản tour ngay lập tức trên website
              </Label>
            </div>

            {/* Images */}
            <div className="space-y-1 sm:col-span-2">
              <Label>Hình ảnh tour</Label>
              <Controller
                control={form.control}
                name="mediaIds"
                render={({ field }) => (
                  <MultiImageUpload
                    value={field.value}
                    onChange={(ids) => field.onChange(ids)}
                  />
                )}
              />
            </div>

            {/* Rich text description */}
            <div className="space-y-1 sm:col-span-2">
              <Label>
                Mô tả chi tiết tour (Tiptap) <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={form.control}
                name="description"
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    minHeight="200px"
                  />
                )}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? 'Đang lưu...' : editingTour ? 'Lưu thay đổi' : 'Tạo tour'}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deletingTour}
        onOpenChange={(open) => !open && setDeletingTour(null)}
        title="Xác nhận xóa tour"
        description={`Bạn có chắc chắn muốn xóa tour "${deletingTour?.name}"? Thao tác này không thể hoàn tác nếu tour chưa có lượt đặt.`}
        confirmText="Xóa tour"
        isDanger
        onConfirm={handleDelete}
      />
    </div>
  );
}
