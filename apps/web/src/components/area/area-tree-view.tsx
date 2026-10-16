'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  MapPin,
  Edit2,
  Lock,
  Unlock,
  ExternalLink,
} from 'lucide-react';
import { Button, StatusBadge, Badge } from '@xfarm/ui';
import { AreaItem, AreaTreeItem, AREA_TYPE_LABELS, AREA_TYPE_COLORS } from '@/lib/area-constants';

interface AreaTreeViewProps {
  treeData: AreaTreeItem[];
  onEdit?: (area: AreaItem) => void;
  onToggleStatus?: (area: AreaItem) => void;
  canWrite?: boolean;
}

interface TreeNodeProps {
  node: AreaTreeItem;
  level: number;
  expandedKeys: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit?: (area: AreaItem) => void;
  onToggleStatus?: (area: AreaItem) => void;
  canWrite?: boolean;
}

function TreeNode({
  node,
  level,
  expandedKeys,
  onToggleExpand,
  onEdit,
  onToggleStatus,
  canWrite = false,
}: TreeNodeProps) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isExpanded = expandedKeys.has(node.id);
  const typeStyle = AREA_TYPE_COLORS[node.type];
  const cyclesCount = node.activeCyclesCount ?? node._count?.cycles ?? 0;

  return (
    <div className="select-none">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2.5 px-3 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40 ${
          level > 0 ? 'bg-slate-50/40 dark:bg-slate-900/30' : ''
        }`}
        style={{ paddingLeft: `${Math.max(12, level * 28 + 12)}px` }}
      >
        {/* Cột Tên và Phân cấp */}
        <div className="flex min-w-[260px] flex-1 items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleExpand(node.id)}
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
            <MapPin
              className="h-4 w-4 shrink-0"
              style={{ color: typeStyle?.stroke || '#10b981' }}
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <Link
              href={`/admin/areas/${node.id}`}
              className="font-medium text-slate-900 hover:text-emerald-600 dark:text-slate-100 dark:hover:text-emerald-400"
            >
              {node.name}
            </Link>
            <span className="font-mono text-xs text-slate-400">({node.code})</span>
          </div>

          <Badge
            variant="outline"
            className="text-[11px] px-1.5 py-0"
            style={{
              backgroundColor: `${typeStyle?.fill}15`,
              color: typeStyle?.stroke,
              borderColor: `${typeStyle?.stroke}40`,
            }}
          >
            {AREA_TYPE_LABELS[node.type] || node.type}
          </Badge>
        </div>

        {/* Thông tin phụ: Diện tích, Mùa vụ, Trạng thái */}
        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="hidden sm:block w-28 text-right font-medium">
            {node.areaM2 != null ? `${Number(node.areaM2).toLocaleString('vi-VN')} m²` : '—'}
          </div>

          <div className="hidden md:flex items-center gap-1 w-24 justify-center">
            {cyclesCount > 0 ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {cyclesCount} vụ
              </span>
            ) : (
              <span className="text-slate-400">0 vụ</span>
            )}
          </div>

          <div className="w-20">
            <StatusBadge status={node.isActive} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link href={`/admin/areas/${node.id}`}>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Xem chi tiết">
                <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
              </Button>
            </Link>

            {canWrite && onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onEdit(node)}
                title="Chỉnh sửa"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-600" />
              </Button>
            )}

            {canWrite && onToggleStatus && (
              <Button
                variant={node.isActive ? 'outline' : 'default'}
                size="sm"
                className={`h-7 w-7 p-0 ${
                  node.isActive
                    ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
                onClick={() => onToggleStatus(node)}
                title={node.isActive ? 'Khóa khu vực' : 'Mở khóa khu vực'}
              >
                {node.isActive ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Render các nút con khi được mở rộng */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedKeys={expandedKeys}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AreaTreeView({
  treeData,
  onEdit,
  onToggleStatus,
  canWrite = false,
}: AreaTreeViewProps) {
  // Tập hợp các ID được mở rộng
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(() => {
    // Mặc định mở rộng tất cả các node cấp 1
    return new Set(treeData.map((node) => node.id));
  });

  const handleToggleExpand = (id: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set<string>();
    const traverse = (items: AreaTreeItem[]) => {
      for (const item of items) {
        allIds.add(item.id);
        if (item.children) traverse(item.children);
      }
    };
    traverse(treeData);
    setExpandedKeys(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedKeys(new Set());
  };

  if (!treeData || treeData.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        Không có dữ liệu phân cấp khu/lô nào.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-950">
      {/* Controls Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Cây phân cấp Khu & Lô canh tác ({treeData.length} khu gốc)
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExpandAll}
            className="h-7 text-xs"
          >
            Mở rộng tất cả
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCollapseAll}
            className="h-7 text-xs"
          >
            Thu gọn tất cả
          </Button>
        </div>
      </div>

      {/* Header Columns */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-900/50">
        <div>Tên khu / Phân vùng</div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block w-28 text-right">Diện tích</div>
          <div className="hidden md:block w-24 text-center">Mùa vụ</div>
          <div className="w-20 text-center">Trạng thái</div>
          <div className="w-24 text-center">Thao tác</div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {treeData.map((rootNode) => (
          <TreeNode
            key={rootNode.id}
            node={rootNode}
            level={0}
            expandedKeys={expandedKeys}
            onToggleExpand={handleToggleExpand}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            canWrite={canWrite}
          />
        ))}
      </div>
    </div>
  );
}
