import dynamic from 'next/dynamic';
import React from 'react';
import type { AreaMapOverviewProps } from './area-map-overview';
import type { AreaMapEditorProps } from './area-map-editor';

export type { AreaMapOverviewProps, AreaMapEditorProps };

export const DynamicAreaMapOverview = dynamic(() => import('./area-map-overview'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      <span>Đang khởi tạo bản đồ nông trại OpenStreetMap...</span>
    </div>
  ),
});

export const DynamicAreaMapEditor = dynamic(() => import('./area-map-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      <span>Đang khởi tạo công cụ vẽ bản đồ...</span>
    </div>
  ),
});
