'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createPageSchema,
  type CreatePageInput,
  type Paginated,
  Role,
  slugify,
} from '@xfarm/shared';
import { DataTable, PageHeader, Button, FormDialog, ConfirmDialog, Input, Label } from '@xfarm/ui';
import { Plus, Edit2, Trash2, Loader2, FileText } from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { RichTextEditor } from '@/components/editor';

interface StaticPageItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_PAGES = [
  { slug: 'gioi-thieu', title: 'Giới thiệu về XFarm' },
  { slug: 'lien-he', title: 'Thông tin liên hệ' },
];

export default function StaticPagesCmsPage() {
  const user = useAdminUser();
  // SALES is explicitly restricted: SALES only edits products and posts
  const canEdit = user?.role === Role.OWNER || user?.role === Role.MANAGER;

  const [pages, setPages] = React.useState<StaticPageItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPage, setEditingPage] = React.useState<StaticPageItem | null>(null);
  const [deletingPage, setDeletingPage] = React.useState<StaticPageItem | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSlugManual, setIsSlugManual] = React.useState(false);

  const form = useForm<CreatePageInput>({
    resolver: zodResolver(createPageSchema),
    defaultValues: {
      title: '',
      slug: '',
      content: '',
    },
  });

  const fetchPages = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const res = await apiFetch<Paginated<StaticPageItem>>(
          `/pages?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
          { signal },
        );
        setPages(res.data);
        setTotal(res.total);
      } catch (err) {
        if (!isAbortError(err)) {
          if (!(err instanceof ApiError && err.statusCode === 404)) {
            console.error('Lỗi khi tải danh sách trang:', err);
          }
          setPages([]);
          setTotal(0);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, search],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchPages(controller.signal);
    return () => controller.abort();
  }, [fetchPages]);

  const openCreateDialog = () => {
    setEditingPage(null);
    setFormError(null);
    setIsSlugManual(false);
    form.reset({
      title: '',
      slug: '',
      content: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: StaticPageItem) => {
    setEditingPage(item);
    setFormError(null);
    setIsSlugManual(true);
    form.reset({
      title: item.title,
      slug: item.slug,
      content: item.content,
    });
    setDialogOpen(true);
  };

  const applyTemplate = (tpl: { slug: string; title: string }) => {
    form.setValue('title', tpl.title, { shouldValidate: true });
    form.setValue('slug', tpl.slug, { shouldValidate: true });
    setIsSlugManual(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    form.setValue('title', newTitle, { shouldValidate: true });
    if (!isSlugManual) {
      form.setValue('slug', slugify(newTitle), { shouldValidate: true });
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManual(true);
    form.setValue('slug', e.target.value, { shouldValidate: true });
  };

  const handleSubmit = async (data: CreatePageInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingPage) {
        await apiFetch(`/pages/${editingPage.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } else {
        await apiFetch('/pages', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setDialogOpen(false);
      fetchPages();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi lưu trang');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPage) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/pages/${deletingPage.id}`, {
        method: 'DELETE',
      });
      setDeletingPage(null);
      fetchPages();
    } catch (err) {
      console.error('Lỗi khi xóa trang:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<StaticPageItem>[] = [
    {
      id: 'icon',
      header: '',
      cell: () => (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <FileText className="h-5 w-5" />
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Tiêu đề trang',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-fg">
            {row.original.title}
          </span>
          <span className="block text-xs text-muted">/{row.original.slug}</span>
        </div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Cập nhật lần cuối',
      cell: ({ row }) => (
        <span className="text-muted text-xs">
          {row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleDateString('vi-VN') : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        if (!canEdit) return null;
        const p = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(p)}
              className="border-line text-fg hover:bg-hover hover:text-accent"
              title="Chỉnh sửa nội dung trang"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-line text-crit hover:bg-crit-bg/20"
              onClick={() => setDeletingPage(p)}
              title="Xóa trang"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Trang Tĩnh (Giới thiệu, Liên hệ)"
        description="Biên tập nội dung các trang thông tin tĩnh hiển thị trên website"
      >
        {canEdit && (
          <Button
            onClick={openCreateDialog}
            className="bg-accent hover:bg-accent-hover text-on-accent font-medium"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm trang mới
          </Button>
        )}
      </PageHeader>

      <div className="rounded-lg border border-line bg-surface shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={pages}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="Tìm theo tiêu đề trang..."
          isLoading={isLoading}
        />
      </div>

      {/* Form Dialog for Static Page */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingPage ? 'Chỉnh sửa trang tĩnh' : 'Tạo trang mới'}
        description="Điền thông tin và soạn thảo nội dung HTML cho trang"
      >
        {formError && (
          <div className="mb-4 rounded-md border border-crit/30 bg-crit-bg/20 p-3 text-sm text-crit">
            {formError}
          </div>
        )}

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4 max-h-[75vh] overflow-y-auto px-1"
        >
          {/* Quick template buttons */}
          {!editingPage && (
            <div className="rounded-md bg-surface-2 p-2.5 border border-line">
              <span className="text-xs font-semibold text-muted block mb-1.5">
                Mẫu trang sẵn có:
              </span>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_PAGES.map((tpl) => (
                  <Button
                    key={tpl.slug}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs border-line text-fg hover:bg-hover"
                    onClick={() => applyTemplate(tpl)}
                  >
                    + {tpl.title} (/{tpl.slug})
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="page-title" className="text-fg">Tiêu đề trang *</Label>
              <Input
                id="page-title"
                placeholder="VD: Giới thiệu XFarm"
                disabled={isSubmitting}
                className="bg-surface border-line text-fg"
                {...form.register('title')}
                onChange={handleTitleChange}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-crit">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <Label htmlFor="page-slug" className="text-fg">Đường dẫn tĩnh (Slug)</Label>
              <Input
                id="page-slug"
                placeholder="VD: gioi-thieu"
                disabled={isSubmitting}
                className="bg-surface border-line text-fg"
                {...form.register('slug')}
                onChange={handleSlugChange}
              />
              {form.formState.errors.slug && (
                <p className="text-xs text-crit">{form.formState.errors.slug.message}</p>
              )}
            </div>
          </div>

          {/* Content (RichTextEditor) */}
          <div className="space-y-1">
            <Label className="text-fg">Nội dung trang *</Label>
            <Controller
              control={form.control}
              name="content"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  minHeight="260px"
                />
              )}
            />
            {form.formState.errors.content && (
              <p className="text-xs text-crit">{form.formState.errors.content.message}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
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
              ) : editingPage ? (
                'Cập nhật trang'
              ) : (
                'Tạo trang'
              )}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Confirm Dialog for Deleting */}
      <ConfirmDialog
        open={Boolean(deletingPage)}
        onOpenChange={(open) => !open && setDeletingPage(null)}
        title="Xóa trang"
        description={`Bạn có chắc chắn muốn xóa trang "${deletingPage?.title}"?`}
        confirmText="Xóa trang"
        cancelText="Hủy bỏ"
        isDanger
        isLoading={isSubmitting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
