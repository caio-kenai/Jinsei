import Image from 'next/image';
import { cn } from '@/lib/utils';
import logo from '../../../../../assets/branding/jinsei-logo.png';
import logoDark from '../../../../../assets/branding/jinsei-logo-dark.png';
import appIcon from '../../../../../assets/branding/jinsei-icon.png';

/**
 * Jinsei logo. `adaptive` adds the light-text version used by the dark theme
 * (public pages stay light, so only the app shell opts in).
 */
export function Brand({
  className,
  compact = false,
  adaptive = false,
}: {
  className?: string;
  compact?: boolean;
  adaptive?: boolean;
}) {
  return (
    <span
      className={cn('brand', compact && 'brand-compact', adaptive && 'brand-adaptive', className)}
    >
      <Image
        className={adaptive ? 'brand-light' : undefined}
        src={compact ? appIcon : logo}
        alt="Jinsei"
        width={compact ? 1263 : 2172}
        height={compact ? 1246 : 724}
        priority
      />
      {adaptive && !compact && (
        <Image className="brand-dark" src={logoDark} alt="" width={2172} height={724} priority />
      )}
    </span>
  );
}
