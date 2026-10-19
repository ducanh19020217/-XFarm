'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Tag,
  Loader2,
} from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  Toast,
  useToast,
} from '@xfarm/ui';
import { TransactionType } from '@xfarm/shared';
import { apiFetch, ApiError } from '@/lib/api';

export interface CategoryNode {
  id: string;
  name: string;
  type: TransactionType;
  parentId: string | null;
  isActive: boolean;
  systemKey: string | null;
  children: CategoryNode[];
}

export default function FinanceCategoriesPage() {
  const { message, showToast, closeToast } = useToast();

  const [categories, setCategories] = React.useState<CategoryNode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [search, setSearch] = React.useState('');
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryNode | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formType, setFormType] = React.useState<TransactionType>(TransactionType.EXPENSE);
  const [formParentId, setFormParentId] = React.useState<string>('');
  const [formIsActive, setFormIsActive] = React.useState(true);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [categoryToDelete, setCategoryToDelete] = React.useState<CategoryNode | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fetchCategories = React.useCallback(async () => {
    setLoading(true);
    try {
      const typeQuery = typeFilter !== 'ALL' ? `?type=${typeFilter}` : '';
      const res = await apiFetch<{ data: CategoryNode[] } | CategoryNode[]>(
        `/finance-categories/tree${typeQuery}`,
      );
      const data = 'data' in res ? res.data : res;
      setCategories(Array.isArray(data) ? data : []);

      // Auto expand all parent nodes initially
      const keys = new Set<string>();
      function collectKeys(nodes: CategoryNode[]) {
        for (const n of nodes) {
          if (n.children && n.children.length > 0) {
            keys.add(n.id);
            collectKeys(n.children);
          }
        }
      }
      collectKeys(Array.isArray(data) ? data : []);
      setExpandedKeys(keys);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải danh mục thu chi');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, showToast]);

  React.useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Flatten categories of same type for Parent dropdown
  const getParentOptions = (type: TransactionType, currentId?: string) => {
    const list: { id: string; name: string }[] = [];
    // Collect all descendants of currentId to avoid cycles
    const excludeIds = new Set<string>();
    if (currentId) {
      excludeIds.add(currentId);
      function findDescendants(nodes: CategoryNode[]) {
        for (const n of nodes) {
          if (excludeIds.has(n.id)) {
            for (const child of n.children) excludeIds.add(child.id);
          }
          findDescendants(n.children);
        }
      }
      findDescendants(categories);
    }

    function traverse(nodes: CategoryNode[], depth = 0) {
      for (const node of nodes) {
        if (node.type === type && !excludeIds.has(node.id)) {
          const prefix = depth > 0 ? `${'— '.repeat(depth)}` : '';
          list.push({ id: node.id, name: `${prefix}${node.name}` });
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children, depth + 1);
        }
      }
    }
    traverse(categories);
    return list;
  };

  const openCreateDialog = (parent?: CategoryNode) => {
    setEditingCategory(null);
    setFormName('');
    setFormType(parent ? parent.type : typeFilter !== 'ALL' ? (typeFilter as TransactionType) : TransactionType.EXPENSE);
    setFormParentId(parent ? parent.id : '');
    setFormIsActive(true);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (cat: CategoryNode) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormParentId(cat.parentId || '');
    setFormIsActive(cat.isActive);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Tên danh mục không được để trống');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        await apiFetch(`/finance-categories/${editingCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: formName.trim(),
            ...(editingCategory.systemKey ? {} : { type: formType }),
            parentId: formParentId || null,
            isActive: formIsActive,
          }),
        });
        showToast('Cập nhật danh mục thành công');
      } else {
        await apiFetch('/finance-categories', {
          method: 'POST',
          body: JSON.stringify({
            name: formName.trim(),
            type: formType,
            parentId: formParentId || undefined,
            isActive: formIsActive,
          }),
        });
        showToast('Tạo danh mục thành công');
      }
      setDialogOpen(false);
      await fetchCategories();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Có lỗi xảy ra khi lưu danh mục');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/finance-categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });
      showToast('Xóa danh mục thành công');
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      await fetchCategories();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể xóa danh mục');
    } finally {
      setDeleting(false);
    }
  };

  // Filter nodes by search term
  const filterNodes = (nodes: CategoryNode[]): CategoryNode[] => {
    if (!search.trim()) return nodes;
    const term = search.toLowerCase();

    function matches(n: CategoryNode): boolean {
      if (n.name.toLowerCase().includes(term)) return true;
      return n.children.some(matches);
    }

    return nodes
      .filter(matches)
      .map((n) => ({
        ...n,
        children: filterNodes(n.children),
      }));
  };

  const filteredCategories = filterNodes(categories);

  const renderTreeNode = (node: CategoryNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedKeys.has(node.id);
    const isSystem = Boolean(node.systemKey);

    return (
      <div key={node.id} className="select-none">
        <div
          className={`group flex items-center justify-between border-b border-slate-100 py-2.5 px-3 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40 ${
            depth > 0 ? 'bg-slate-50/30 dark:bg-slate-900/20' : ''
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 28 + 12)}px` }}
        >
          {/* Cột Tên và Phân cấp */}
          <div className="flex items-center gap-2 min-w-[280px] flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-200 text-slate-500 dark:hover:bg-slate-700"
                title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-6" />
            )}

            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-amber-500 shrink-0" />
              )
            ) : (
              <Tag className="h-4 w-4 text-slate-400 shrink-0" />
            )}

            <span className="font-medium text-slate-900 dark:text-slate-100">
              {node.name}
            </span>

            {/* Badges */}
            <div className="flex items-center gap-1.5 ml-2">
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${
                  node.type === TransactionType.INCOME
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                }`}
              >
                {node.type === TransactionType.INCOME ? 'Thu' : 'Chi'}
              </span>

              {isSystem && (
                <span
                  title="Danh mục hệ thống (khóa chỉnh sửa loại và không thể xóa)"
                  className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <Lock className="h-3 w-3" />
                  Hệ thống
                </span>
              )}

              {!node.isActive && (
                <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Tạm khóa
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openCreateDialog(node)}
              className="h-8 px-2 text-xs text-slate-700 hover:text-emerald-600"
              title="Thêm danh mục con"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Thêm con
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(node)}
              className="h-8 px-2 text-xs text-slate-700 hover:text-blue-600"
              title="Chỉnh sửa danh mục"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSystem || hasChildren}
              onClick={() => {
                setCategoryToDelete(node);
                setDeleteConfirmOpen(true);
              }}
              className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none"
              title={
                isSystem
                  ? 'Không thể xóa danh mục hệ thống'
                  : hasChildren
                    ? 'Không thể xóa danh mục có danh mục con'
                    : 'Xóa danh mục'
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Danh mục tài chính"
        description="Cây danh mục thu/chi phân cấp, thiết lập định khoản và khóa danh mục hệ thống"
      >
        <Button
          onClick={() => openCreateDialog()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Thêm danh mục
        </Button>
      </PageHeader>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Tìm kiếm danh mục theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-48">
          <select
            aria-label="Lọc theo loại danh mục"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-800"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Tất cả loại danh mục</option>
            <option value={TransactionType.INCOME}>Khoản thu (INCOME)</option>
            <option value={TransactionType.EXPENSE}>Khoản chi (EXPENSE)</option>
          </select>
        </div>
      </div>

      {/* Categories Tree Container */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/50 dark:text-slate-400 flex justify-between">
          <span>Tên danh mục / Cây phân cấp</span>
          <span>Thao tác</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Đang tải cây danh mục...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Chưa có danh mục nào phù hợp
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCategories.map((node) => renderTreeNode(node))}
          </div>
        )}
      </div>

      {/* Dialog Thêm/Sửa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory?.systemKey
                ? 'Đây là danh mục hệ thống. Một số thuộc tính được khóa để đảm bảo toàn vẹn dữ liệu.'
                : 'Nhập thông tin danh mục thu/chi để phân loại giao dịch.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Tên danh mục *</Label>
              <Input
                id="cat-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="VD: Chi phí phân bón, Doanh thu rau quả..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-type">Loại giao dịch *</Label>
              <select
                id="cat-type"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-800 disabled:opacity-50"
                value={formType}
                disabled={Boolean(editingCategory?.systemKey)}
                onChange={(e) => {
                  const newType = e.target.value as TransactionType;
                  setFormType(newType);
                  // Reset parent if type changed
                  setFormParentId('');
                }}
              >
                <option value={TransactionType.EXPENSE}>Khoản chi (EXPENSE)</option>
                <option value={TransactionType.INCOME}>Khoản thu (INCOME)</option>
              </select>
              {editingCategory?.systemKey && (
                <p className="text-xs text-amber-600 mt-1">
                  Loại của danh mục hệ thống không thể thay đổi
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-parent">Danh mục cha (tùy chọn)</Label>
              <select
                id="cat-parent"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-800"
                value={formParentId}
                onChange={(e) => setFormParentId(e.target.value)}
              >
                <option value="">(Không có - Danh mục gốc)</option>
                {getParentOptions(formType, editingCategory?.id).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="cat-active"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="cat-active" className="cursor-pointer font-normal">
                Kích hoạt danh mục này
              </Label>
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? 'Đang lưu...' : editingCategory ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Xác nhận xóa danh mục"
        description={`Bạn có chắc chắn muốn xóa danh mục "${categoryToDelete?.name}" không? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa danh mục"
        isDanger={true}
        isLoading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
