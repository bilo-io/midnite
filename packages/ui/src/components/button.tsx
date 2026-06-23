import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ClassValue } from 'clsx';
import { cn } from '../lib/cn';

// cva's inferred return type references its own internal `./types` module, which
// under pnpm resolves to a non-portable `.pnpm/...` path — so emitting this
// package's .d.ts (declaration: true) trips TS2742. Annotating the variant props
// explicitly (mirroring cva's `ClassProp` class-XOR-className shape) keeps the
// emitted declaration self-contained while preserving the runtime cva instance
// and the `VariantProps<typeof buttonVariants>` inference used by `ButtonProps`.
type ButtonVariantsProps = {
  variant?: 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive' | null;
  size?: 'default' | 'sm' | 'lg' | 'icon' | null;
} & (
  | { class?: ClassValue; className?: never }
  | { class?: never; className?: ClassValue }
  | { class?: never; className?: never }
);

const buttonVariants: (props?: ButtonVariantsProps) => string = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
