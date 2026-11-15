import { useT } from '@/i18n/provider';
import { statusLabels, type StatusKey } from '@jinsei/contracts';
export function StatusBadge({ status }: { status: StatusKey }) {
  const t = useT();
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {t(statusLabels[status])}
    </span>
  );
}
