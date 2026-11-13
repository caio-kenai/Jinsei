'use client';

import type { ComponentProps } from 'react';
import { DropdownMenu as Primitive } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuSeparator = () => <Primitive.Separator className="menu-separator" />;
export const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => (
  <Primitive.Label className="menu-label">{children}</Primitive.Label>
);
export function DropdownMenuContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={6}
        align="end"
        className={cn('menu-content', className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item className={cn('menu-item', className)} {...props} />;
}
export function DropdownMenuCheckboxItem({
  children,
  checked,
  ...props
}: ComponentProps<typeof Primitive.CheckboxItem>) {
  return (
    <Primitive.CheckboxItem className="menu-item menu-checkbox" checked={checked} {...props}>
      <span className="menu-check">
        <Primitive.ItemIndicator>
          <Check size={14} />
        </Primitive.ItemIndicator>
      </span>
      {children}
    </Primitive.CheckboxItem>
  );
}
