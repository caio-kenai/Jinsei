import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  color: string;
  /** Short line under the number. */
  caption?: ReactNode;
  /** Share between 0 and 1, drawn as a thin meter. */
  meter?: number | null;
  href?: string;
  className?: string;
};

/** Metric card: label and icon on top, the number, then a meter or a caption. */
export function KpiCard({ label, value, icon, color, caption, meter, href, className }: Props) {
  const body = (
    <>
      <span className="kpi-glow" aria-hidden="true" />
      <span className="kpi-head">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon" aria-hidden="true">
          {icon}
        </span>
      </span>
      <strong className="kpi-value">{value}</strong>
      {meter !== undefined && meter !== null && (
        <span className="kpi-meter" aria-hidden="true">
          <span style={{ width: `${Math.round(Math.min(1, Math.max(0, meter)) * 100)}%` }} />
        </span>
      )}
      {caption && (
        <span className="kpi-caption">
          {caption}
          {href && <ArrowUpRight size={13} className="kpi-arrow" />}
        </span>
      )}
    </>
  );
  const style = { '--kpi': color } as CSSProperties;
  return href ? (
    <Link href={href} className={cn('kpi-card', 'is-link', className)} style={style}>
      {body}
    </Link>
  ) : (
    <div className={cn('kpi-card', className)} style={style}>
      {body}
    </div>
  );
}
