import Image from 'next/image';
import { cn } from '@/lib/utils';
import logo from '../../../../../assets/branding/jinsei-logo.png';
import appIcon from '../../../../../assets/branding/jinsei-icon.png';

export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('brand', compact && 'brand-compact', className)}>
      <Image
        src={compact ? appIcon : logo}
        alt="Jinsei"
        width={compact ? 1263 : 2172}
        height={compact ? 1246 : 724}
        priority
      />
    </span>
  );
}
