import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('brand', className)}>
      <Image src="/branding/jinsei-logo.png" alt="Jinsei" width={2172} height={724} priority />
    </span>
  );
}
