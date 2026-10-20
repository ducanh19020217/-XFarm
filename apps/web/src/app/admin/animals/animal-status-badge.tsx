import * as React from 'react';
import { StatusBadge } from '@xfarm/ui';
import { AnimalStatus, ANIMAL_STATUS_LABELS } from './types';

export interface AnimalStatusBadgeProps {
  status: AnimalStatus | string;
}

export function AnimalStatusBadge({ status }: AnimalStatusBadgeProps) {
  if (status === AnimalStatus.ALIVE) {
    return <StatusBadge status={true} activeText={ANIMAL_STATUS_LABELS[AnimalStatus.ALIVE]} />;
  }

  if (status === AnimalStatus.DEAD) {
    return <StatusBadge status={false} inactiveText={ANIMAL_STATUS_LABELS[AnimalStatus.DEAD]} />;
  }

  if (status === AnimalStatus.SOLD) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-warn-bg text-warn border border-warn/20">
        {ANIMAL_STATUS_LABELS[AnimalStatus.SOLD]}
      </span>
    );
  }

  return <StatusBadge status={status} />;
}
