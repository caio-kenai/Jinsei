'use client';
import { Plus } from 'lucide-react';
import type { EntryPatchInput, LibraryEntry } from '@jinsei/contracts';
import { episodePosition, nextStep, progressPercent, progressSummary } from './progress-format';

export function ProgressCell({
  entry,
  onOpen,
  onPatch,
}: {
  entry: LibraryEntry;
  onOpen: (id: string) => void;
  onPatch: (id: string, changes: EntryPatchInput) => void;
}) {
  const percent = progressPercent(entry);
  const summary = progressSummary(entry);
  const position = episodePosition(entry);
  const next = nextStep(entry);
  return (
    <div className="progress-cell">
      <button
        className="inline-control progress-summary"
        onClick={() => onOpen(entry.id)}
        aria-label={`Progresso de ${entry.title}: ${summary}`}
        title={position ?? undefined}
      >
        {percent !== null && (
          <span className="progress-track">
            <span className="progress-fill" style={{ width: `${percent}%`, display: 'block' }} />
          </span>
        )}
        {summary}
      </button>
      {next && (
        <button
          className="progress-increment"
          aria-label={`${next.label} em ${entry.title}`}
          title={next.label}
          onClick={() => onPatch(entry.id, { progress: next.progress })}
        >
          <Plus size={11} />
        </button>
      )}
    </div>
  );
}
