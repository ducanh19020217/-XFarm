import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-ok-bg text-ok',
        secondary: 'border-transparent bg-surface-2 text-fg-2',
        destructive: 'border-transparent bg-crit-bg text-crit',
        outline: 'border border-line text-fg bg-transparent',
        warning: 'border-transparent bg-warn-bg text-warn',
        info: 'border-transparent bg-info-bg text-info',
        accent: 'border-transparent bg-accent-bg text-accent',
        chip: 'border-transparent bg-chip text-chip-text',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
