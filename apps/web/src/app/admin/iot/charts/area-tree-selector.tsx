'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, MapPin } from 'lucide-react';
import { AreaTreeItem, AREA_TYPE_COLORS } from '@/lib/area-constants';

interface AreaTreeSelectorProps {
  treeData: AreaTreeItem[];
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
}

interface TreeNodeProps {
  node: AreaTreeItem;
  level: number;
  expandedKeys: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
}

function TreeNode({
  node,
  level,
  expandedKeys,
  onToggleExpand,
  selectedAreaId,
  onSelectArea,
}: TreeNodeProps) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isExpanded = expandedKeys.has(node.id);
  const isSelected = selectedAreaId === node.id;
  const typeStyle = AREA_TYPE_COLORS[node.type];

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer text-xs transition-colors ${
          isSelected ? 'bg-selected text-accent font-semibold' : 'hover:bg-hover text-fg'
        }`}
        style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
        onClick={() => onSelectArea(node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-hover text-muted transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-accent shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-warn shrink-0" />
          )
        ) : (
          <MapPin
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: typeStyle?.stroke || 'var(--t-accent)' }}
          />
        )}

        <span className="truncate">{node.name}</span>
        <span className="text-[10px] text-muted font-mono">({node.code})</span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedKeys={expandedKeys}
              onToggleExpand={onToggleExpand}
              selectedAreaId={selectedAreaId}
              onSelectArea={onSelectArea}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AreaTreeSelector({
  treeData,
  selectedAreaId,
  onSelectArea,
}: AreaTreeSelectorProps) {
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(() => {
    return new Set(treeData.map((node) => node.id));
  });

  const handleToggleExpand = (id: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {treeData.map((rootNode) => (
        <TreeNode
          key={rootNode.id}
          node={rootNode}
          level={0}
          expandedKeys={expandedKeys}
          onToggleExpand={handleToggleExpand}
          selectedAreaId={selectedAreaId}
          onSelectArea={onSelectArea}
        />
      ))}
    </div>
  );
}
