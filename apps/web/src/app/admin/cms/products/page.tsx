'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createProductSchema,
  type CreateProductInput,
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
import { MoneyInput } from '@/components/ui/money-input';
import { MultiImageUpload } from '@/components/ui/image-upload';

interface ProductItem {
  id: string;
  slug: string;
  name: string;
  itemId: string;
  item?: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  description: string;
  price: number | string;
  unit: string;
  mediaIds: string[];
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}

interface SellableItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  isSellable: boolean;
}

export default function ProductsCmsPage() {
  const user = useAdminUser();
  const canEdit =
    user?.role === Role.OWNER || user?.role === Role.MANAGER || user?.role === Role.SALES;

  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Sellable items for select
  const [sellableItems, setSellableItems] = React.useState<SellableItem[]>([]);

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<ProductItem | null>(null);
  const [deletingProduct, setDeletingProduct] = React.useState<ProductItem | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSlugManual, setIsSlugManual] = React.useState(false);

  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      slug: '',
      itemId: '',
      description: '',
      price: 0,
      unit: '',
      mediaIds: [],
      isPublished: false,
      sortOrder: 0,
    },
  });

  // Fetch sellable items
  React.useEffect(() => {
    let isMounted = true;
    apiFetch<Paginated<SellableItem>>('/items?isSellable=true&pageSize=100')
      .then((res) => {
        if (isMounted) setSellableItems(res.data);
      })
      .catch((err) => {
        if (!isAbortError(err)) console.error('Lỗi khi tải danh sách hàng hóa bán được:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchProducts = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const res = await apiFetch<Paginated<ProductItem>>(
          `/products?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
          { signal },
        );
        setProducts(res.data);
        setTotal(res.total);
      } catch (err) {
        if (!isAbortError(err)) {
          if (!(err instanceof ApiError && err.statusCode === 404)) {
            console.error('Lỗi khi tải danh sách sản phẩm:', err);
          }
          // Fallback empty if endpoint is not implemented yet in parallel branch
          setProducts([]);
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
    void fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormError(null);
    setIsSlugManual(false);
    form.reset({
      name: '',
      slug: '',
      itemId: '',
      description: '',
      price: 0,
      unit: '',
      mediaIds: [],
      isPublished: false,
      sortOrder: 0,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (product: ProductItem) => {
    setEditingProduct(product);
    setFormError(null);
    setIsSlugManual(true);
    form.reset({
      name: product.name,
      slug: product.slug,
      itemId: product.itemId,
      description: product.description,
      price: Number(product.price) || 0,
      unit: product.unit,
      mediaIds: product.mediaIds || [],
      isPublished: product.isPublished,
      sortOrder: product.sortOrder ?? 0,
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

  const handleItemSelect = (selectedItemId: string) => {
    form.setValue('itemId', selectedItemId, { shouldValidate: true });
    const selectedItem = sellableItems.find((item) => item.id === selectedItemId);
    if (selectedItem) {
      if (!form.getValues('unit')) {
        form.setValue('unit', selectedItem.unit, { shouldValidate: true });
      }
      if (!form.getValues('name')) {
        form.setValue('name', selectedItem.name, { shouldValidate: true });
        if (!isSlugManual) {
          form.setValue('slug', slugify(selectedItem.name), { shouldValidate: true });
        }
      }
    }
  };

  const handleSubmit = async (data: CreateProductInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingProduct) {
        await apiFetch(`/products/${editingProduct.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } else {
        await apiFetch('/products', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi lưu sản phẩm');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/products/${deletingProduct.id}`, {
        method: 'DELETE',
      });
      setDeletingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error('Lỗi khi xóa sản phẩm:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<ProductItem>[] = [
    {
      id: 'thumbnail',
      header: 'Ảnh',
      cell: ({ row }) => {
        const firstMedia = row.original.mediaIds?.[0];
        return (
          <div className="h-12 w-12 rounded-md border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center dark:border-slate-800 dark:bg-slate-900">
            {firstMedia ? (
              <img
                src={firstMedia}
                alt={row.original.name}
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
      accessorKey: 'name',
      header: 'Tên sản phẩm',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.name}
          </span>
          <span className="block text-xs text-slate-400">/{row.original.slug}</span>
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Giá bán',
      cell: ({ row }) => (
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          {Number(row.original.price).toLocaleString('vi-VN')} ₫ / {row.original.unit}
        </span>
      ),
    },
    {
      accessorKey: 'isPublished',
      header: 'Trạng thái',
      cell: ({ row }) =>
        row.original.isPublished ? (
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
      accessorKey: 'sortOrder',
      header: 'Thứ tự',
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.sortOrder}</span>,
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
              title="Chỉnh sửa sản phẩm"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
              onClick={() => setDeletingProduct(p)}
              title="Xóa sản phẩm"
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
        title="Quản lý Sản phẩm Website"
        description="Quản lý danh sách sản phẩm nông sản trưng bày và bán trên website"
      >
        {canEdit && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm sản phẩm mới
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        data={products}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm theo tên sản phẩm..."
        isLoading={isLoading}
      />

      {/* Form Dialog for Create / Edit */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        description="Điền thông tin chi tiết sản phẩm hiển thị trên website"
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
          {/* Select Sellable Item */}
          <div className="space-y-1">
            <Label htmlFor="item-select">Vật tư / nông sản kho bán được *</Label>
            <Select
              defaultValue={form.getValues('itemId')}
              onValueChange={handleItemSelect}
              disabled={isSubmitting}
            >
              <SelectTrigger id="item-select">
                <SelectValue placeholder="Chọn vật tư kho có thể bán..." />
              </SelectTrigger>
              <SelectContent>
                {sellableItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    [{item.sku}] {item.name} ({item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.itemId && (
              <p className="text-xs text-red-600">{form.formState.errors.itemId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="product-name">Tên sản phẩm *</Label>
              <Input
                id="product-name"
                placeholder="VD: Rau muống hữu cơ"
                disabled={isSubmitting}
                {...form.register('name')}
                onChange={handleNameChange}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <Label htmlFor="product-slug">Đường dẫn tĩnh (Slug)</Label>
              <Input
                id="product-slug"
                placeholder="VD: rau-muong-huu-co"
                disabled={isSubmitting}
                {...form.register('slug')}
                onChange={handleSlugChange}
              />
              {form.formState.errors.slug && (
                <p className="text-xs text-red-600">{form.formState.errors.slug.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Price with MoneyInput */}
            <div className="space-y-1">
              <Label htmlFor="product-price">Giá bán (VNĐ) *</Label>
              <Controller
                control={form.control}
                name="price"
                render={({ field }) => (
                  <MoneyInput
                    id="product-price"
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    disabled={isSubmitting}
                  />
                )}
              />
              {form.formState.errors.price && (
                <p className="text-xs text-red-600">{form.formState.errors.price.message}</p>
              )}
            </div>

            {/* Unit */}
            <div className="space-y-1">
              <Label htmlFor="product-unit">Đơn vị tính *</Label>
              <Input
                id="product-unit"
                placeholder="VD: kg, bó, túi"
                disabled={isSubmitting}
                {...form.register('unit')}
              />
              {form.formState.errors.unit && (
                <p className="text-xs text-red-600">{form.formState.errors.unit.message}</p>
              )}
            </div>

            {/* Sort Order */}
            <div className="space-y-1">
              <Label htmlFor="product-sort">Thứ tự hiển thị</Label>
              <Input
                id="product-sort"
                type="number"
                disabled={isSubmitting}
                {...form.register('sortOrder', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Description (RichTextEditor) */}
          <div className="space-y-1">
            <Label>Mô tả chi tiết sản phẩm *</Label>
            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  minHeight="180px"
                />
              )}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Media Images */}
          <div className="space-y-1">
            <Label>Hình ảnh sản phẩm</Label>
            <Controller
              control={form.control}
              name="mediaIds"
              render={({ field }) => (
                <MultiImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>

          {/* Publish Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="product-published"
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              disabled={isSubmitting}
              {...form.register('isPublished')}
            />
            <Label
              htmlFor="product-published"
              className="cursor-pointer font-medium text-slate-700 dark:text-slate-300"
            >
              Xuất bản ngay (hiển thị trên trang chủ và danh mục sản phẩm)
            </Label>
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
              ) : editingProduct ? (
                'Cập nhật sản phẩm'
              ) : (
                'Tạo sản phẩm'
              )}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Confirm Dialog for Deleting */}
      <ConfirmDialog
        open={Boolean(deletingProduct)}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        title="Xóa sản phẩm"
        description={`Bạn có chắc chắn muốn xóa sản phẩm "${deletingProduct?.name}"? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa sản phẩm"
        cancelText="Hủy bỏ"
        isDanger
        isLoading={isSubmitting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
