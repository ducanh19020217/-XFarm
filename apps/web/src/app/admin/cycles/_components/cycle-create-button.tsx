'use client';

import { Button } from '@xfarm/ui';
import { Plus } from 'lucide-react';

export function CycleCreateButton({
  canManage,
  onClick,
}: {
  canManage: boolean;
  onClick: () => void;
}) {
  if (!canManage) return null;
  return (
    <Button onClick={onClick}>
      <Plus className="mr-1.5 h-4 w-4" />
      Thêm mùa vụ
    </Button>
  );
}
