import { statusLabels, type StatusKey } from '@jinsei/contracts';
export function StatusBadge({ status }: { status: StatusKey }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}
