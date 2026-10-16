'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createPostSchema,
  type CreatePostInput,
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
import { Plus, Edit2, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { RichTextEditor } from '@/components/editor';
import { SingleImageUpload } from '@/components/ui/image-upload';

interface PostItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverMediaId?: string | null;
  publishedAt?: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
}

export default function PostsCmsPage() {
  const user = useAdminUser();
  const canEdit =
    user?.role === Role.OWNER || user?.role === Role.MANAGER || user?.role === Role.SALES;

  const [posts, setPosts] = React.useState<PostItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<PostItem | null>(null);
  const [deletingPost, setDeletingPost] = React.useState<PostItem | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSlugManual, setIsSlugManual] = React.useState(false);

  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      coverMediaId: undefined,
      status: 'DRAFT',
    },
  });

  const fetchPosts = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const res = await apiFetch<Paginated<PostItem>>(
          `/posts?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
          { signal },
        );
        setPosts(res.data);
        setTotal(res.total);
      } catch (err) {
        if (!isAbortError(err)) {
          if (!(err instanceof ApiError && err.statusCode === 404)) {
            console.error('Lỗi khi tải danh sách bài viết:', err);
          }
          setPosts([]);
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
    void fetchPosts(controller.signal);
    return () => controller.abort();
  }, [fetchPosts]);

  const openCreateDialog = () => {
    setEditingPost(null);
    setFormError(null);
    setIsSlugManual(false);
    form.reset({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      coverMediaId: undefined,
      status: 'DRAFT',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (post: PostItem) => {
    setEditingPost(post);
    setFormError(null);
    setIsSlugManual(true);
    form.reset({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverMediaId: post.coverMediaId || undefined,
      status: post.status,
    });
    setDialogOpen(true);
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

  const handleSubmit = async (data: CreatePostInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingPost) {
        await apiFetch(`/posts/${editingPost.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } else {
        await apiFetch('/posts', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setDialogOpen(false);
      fetchPosts();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi lưu bài viết');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPost) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/posts/${deletingPost.id}`, {
        method: 'DELETE',
      });
      setDeletingPost(null);
      fetchPosts();
    } catch (err) {
      console.error('Lỗi khi xóa bài viết:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<PostItem>[] = [
    {
      id: 'cover',
      header: 'Ảnh bìa',
      cell: ({ row }) => {
        const cover = row.original.coverMediaId;
        return (
          <div className="h-12 w-16 rounded-md border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center dark:border-slate-800 dark:bg-slate-900">
            {cover ? (
              <img
                src={cover}
                alt={row.original.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <ImageIcon className="h-5 w-5 text-slate-400" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Tiêu đề bài viết',
      cell: ({ row }) => (
        <div className="max-w-md">
          <span className="font-medium text-slate-900 dark:text-slate-100 block truncate">
            {row.original.title}
          </span>
          <span className="block text-xs text-slate-400 truncate">/{row.original.slug}</span>
        </div>
      ),
    },
    {
      accessorKey: 'excerpt',
      header: 'Tóm tắt',
      cell: ({ row }) => (
        <p className="max-w-xs truncate text-xs text-slate-500">{row.original.excerpt}</p>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) =>
        row.original.status === 'PUBLISHED' ? (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
            Đã xuất bản
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-slate-600 dark:text-slate-400">
            Bản nháp
          </Badge>
        ),
    },
    {
      accessorKey: 'publishedAt',
      header: 'Ngày xuất bản',
      cell: ({ row }) =>
        row.original.publishedAt
          ? new Date(row.original.publishedAt).toLocaleDateString('vi-VN')
          : '—',
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
              title="Chỉnh sửa bài viết"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
              onClick={() => setDeletingPost(p)}
              title="Xóa bài viết"
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
        title="Quản lý Bài viết & Tin tức"
        description="Đăng tải tin tức nông trại, kiến thức canh tác và câu chuyện sinh thái lên website"
      >
        {canEdit && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Viết bài mới
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        data={posts}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm theo tiêu đề bài viết..."
        isLoading={isLoading}
      />

      {/* Form Dialog for Post Create/Edit */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingPost ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
        description="Soạn thảo nội dung bài viết và chọn trạng thái xuất bản"
      >
        {formError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {formError}
          </div>
        )}

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4 max-h-[75vh] overflow-y-auto px-1"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="post-title">Tiêu đề bài viết *</Label>
              <Input
                id="post-title"
                placeholder="VD: Kỹ thuật nuôi ong tự nhiên tại XFarm"
                disabled={isSubmitting}
                {...form.register('title')}
                onChange={handleTitleChange}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <Label htmlFor="post-slug">Đường dẫn tĩnh (Slug)</Label>
              <Input
                id="post-slug"
                placeholder="VD: ky-thuat-nuoi-ong-tu-nhien"
                disabled={isSubmitting}
                {...form.register('slug')}
                onChange={handleSlugChange}
              />
              {form.formState.errors.slug && (
                <p className="text-xs text-red-600">{form.formState.errors.slug.message}</p>
              )}
            </div>
          </div>

          {/* Excerpt */}
          <div className="space-y-1">
            <Label htmlFor="post-excerpt">Tóm tắt ngắn *</Label>
            <textarea
              id="post-excerpt"
              rows={2}
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Tóm tắt 1-2 câu ngắn gọn về bài viết để hiển thị ở trang danh sách..."
              disabled={isSubmitting}
              {...form.register('excerpt')}
            />
            {form.formState.errors.excerpt && (
              <p className="text-xs text-red-600">{form.formState.errors.excerpt.message}</p>
            )}
          </div>

          {/* Cover Image */}
          <div className="space-y-1">
            <Label>Ảnh bìa bài viết</Label>
            <Controller
              control={form.control}
              name="coverMediaId"
              render={({ field }) => (
                <SingleImageUpload
                  value={field.value}
                  onChange={(mediaId) => field.onChange(mediaId || undefined)}
                  disabled={isSubmitting}
                  label="Chọn ảnh bìa bài viết"
                />
              )}
            />
          </div>

          {/* Content (RichTextEditor) */}
          <div className="space-y-1">
            <Label>Nội dung chi tiết *</Label>
            <Controller
              control={form.control}
              name="content"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  minHeight="220px"
                />
              )}
            />
            {form.formState.errors.content && (
              <p className="text-xs text-red-600">{form.formState.errors.content.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>Trạng thái xuất bản *</Label>
            <Select
              defaultValue={form.getValues('status')}
              onValueChange={(val) => form.setValue('status', val as 'DRAFT' | 'PUBLISHED')}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Bản nháp (DRAFT)</SelectItem>
                <SelectItem value="PUBLISHED">Xuất bản công khai (PUBLISHED)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
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
              ) : editingPost ? (
                'Cập nhật bài viết'
              ) : (
                'Đăng bài viết'
              )}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Confirm Dialog for Deleting */}
      <ConfirmDialog
        open={Boolean(deletingPost)}
        onOpenChange={(open) => !open && setDeletingPost(null)}
        title="Xóa bài viết"
        description={`Bạn có chắc chắn muốn xóa bài viết "${deletingPost?.title}"?`}
        confirmText="Xóa bài viết"
        cancelText="Hủy bỏ"
        isDanger
        isLoading={isSubmitting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
