import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-poppins transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border border-primary/20 bg-primary/10 text-primary',
        secondary:
          'border border-secondary bg-secondary text-secondary-foreground',
        destructive:
          'border border-destructive/20 bg-destructive/10 text-destructive',
        outline: 'border border-border text-foreground',
        success:
          'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
        warning:
          'border border-amber-500/20 bg-amber-500/10 text-amber-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
