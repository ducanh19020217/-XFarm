'use client';

import * as React from 'react';
import Link from 'next/link';
import { Package, Warehouse, Truck } from 'lucide-react';
import { cn } from '@xfarm/ui';

interface CatalogTabsProps {
  active: 'items' | 'warehouses' | 'suppliers';
}

export function CatalogTabs({ active }: CatalogTabsProps) {
  const tabs = [
    {
      id: 'items',
      label: 'Vật tư & Hàng hóa',
      href: '/admin/inventory/items',
      icon: Package,
    },
    {
      id: 'warehouses',
      label: 'Kho hàng',
      href: '/admin/inventory/warehouses',
      icon: Warehouse,
    },
    {
      id: 'suppliers',
      label: 'Nhà cung cấp',
      href: '/admin/inventory/suppliers',
      icon: Truck,
    },
  ] as const;

  return (
    <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
      <nav className="flex space-x-2" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
