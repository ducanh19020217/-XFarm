'use client';

import * as React from 'react';
import { PageHeader } from '@xfarm/ui';
import { PawPrint, Layers } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { AnimalGroupItem, AreaSummary, CycleSummary, Paginated } from './types';
import { GroupsTab } from './groups-tab';
import { AnimalsTab } from './animals-tab';

interface UserProfile {
  id: string;
  role: string;
}

export default function AnimalsPage() {
  const [activeTab, setActiveTab] = React.useState<'groups' | 'animals'>('groups');
  const [userRole, setUserRole] = React.useState<string | null>(null);

  // Common reference data
  const [cycles, setCycles] = React.useState<CycleSummary[]>([]);
  const [areas, setAreas] = React.useState<AreaSummary[]>([]);
  const [groups, setGroups] = React.useState<AnimalGroupItem[]>([]);

  React.useEffect(() => {
    const controller = new AbortController();
    // 1. Fetch user profile
    apiFetch<{ data: UserProfile }>('/auth/me', { signal: controller.signal })
      .then((res) => {
        if (res.data) setUserRole(res.data.role);
      })
      .catch(() => {
        // Fallback or ignore
      });

    // 2. Fetch cycles for livestock/aqua
    apiFetch<Paginated<CycleSummary> | { data: CycleSummary[] }>('/cycles?pageSize=100', {
      signal: controller.signal,
    })
      .then((res) => {
        const list = Array.isArray(res) ? res : res.data || [];
        setCycles(list);
      })
      .catch(() => {
        // Cycles API might not be available or empty
      });

    // 3. Fetch areas
    apiFetch<Paginated<AreaSummary> | { data: AreaSummary[] }>('/areas?pageSize=100', {
      signal: controller.signal,
    })
      .then((res) => {
        const list = Array.isArray(res) ? res : res.data || [];
        setAreas(list);
      })
      .catch(() => {
        // Areas API might not be available or empty
      });

    // 4. Fetch animal groups for animal dropdown / filters
    apiFetch<Paginated<AnimalGroupItem> | { data: AnimalGroupItem[] }>(
      '/animal-groups?pageSize=100',
      { signal: controller.signal },
    )
      .then((res) => {
        const list = Array.isArray(res) ? res : res.data || [];
        setGroups(list);
      })
      .catch(() => {
        // Animal groups might be empty
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Vật nuôi"
        description="Theo dõi đàn gia súc, gia cầm, cá thể và các sự kiện chăn nuôi"
      />

      {/* Tabs chuyển đổi giữa Đàn và Cá thể */}
      <div className="flex border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'groups'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-fg hover:border-line-strong'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Đàn vật nuôi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('animals')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'animals'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-fg hover:border-line-strong'
          }`}
        >
          <PawPrint className="h-4 w-4" />
          <span>Cá thể vật nuôi</span>
        </button>
      </div>

      {/* Nội dung tab tương ứng */}
      {activeTab === 'groups' ? (
        <GroupsTab userRole={userRole} cycles={cycles} areas={areas} />
      ) : (
        <AnimalsTab userRole={userRole} groups={groups} />
      )}
    </div>
  );
}
