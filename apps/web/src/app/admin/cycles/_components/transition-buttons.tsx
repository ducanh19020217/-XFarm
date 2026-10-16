'use client';

import * as React from 'react';
import { CYCLE_TRANSITIONS, CycleStatus } from '@xfarm/shared';
import { Button } from '@xfarm/ui';
import { transitionLabels } from './constants';

export function TransitionButtons({
  status,
  canManage,
  onSelect,
}: {
  status: CycleStatus;
  canManage: boolean;
  onSelect: (status: CycleStatus) => void;
}) {
  if (!canManage) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {(CYCLE_TRANSITIONS[status] || []).map((next) => (
        <Button
          key={next}
          variant={next === CycleStatus.CANCELLED ? 'destructive' : 'default'}
          onClick={() => onSelect(next)}
        >
          {transitionLabels[next]}
        </Button>
      ))}
    </div>
  );
}
