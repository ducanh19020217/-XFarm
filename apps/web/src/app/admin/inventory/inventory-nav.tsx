'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, History, FileText, ListTree } from 'lucide-react';

interface TabItem {
  title: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
}

const tabs: TabItem[] = [
  {
    title: 'Tồn kho',
    href: '/admin/inventory',
    icon: Boxes,
    exact: true,
  },
  {
    title: 'Thẻ kho',
    href: '/admin/inventory/moves',
    icon: History,
  },
  {
    title: 'Phiếu kho',
    href: '/admin/inventory/documents',
    icon: FileText,
  },
  {
    title: 'Danh mục',
    href: '/admin/inventory/items',
    icon: ListTree,
  },
];

export function InventoryNav() {
  const pathname = usePathname();

  return (
    <div className="flex border-b border-line mb-6 gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-line hover:text-fg'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
