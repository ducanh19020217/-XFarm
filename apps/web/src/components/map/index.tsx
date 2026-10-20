import dynamic from 'next/dynamic';
import React from 'react';
import type { AreaMapOverviewProps } from './area-map-overview';
import type { AreaMapEditorProps } from './area-map-editor';

export type { AreaMapOverviewProps, AreaMapEditorProps };

export const DynamicAreaMapOverview = dynamic(() => import('./area-map-overview'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 text-sm text-muted">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span>Đang khởi tạo bản đồ nông trại OpenStreetMap...</span>
    </div>
  ),
});

export const DynamicAreaMapEditor = dynamic(() => import('./area-map-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 text-sm text-muted">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span>Đang khởi tạo công cụ vẽ bản đồ...</span>
    </div>
  ),
});
