'use client';
import type { UseFormRegister } from 'react-hook-form';
import type { EntryPatchInput, LibraryEntry } from '@jinsei/contracts';
import { Input } from '@/components/ui/input';
import { episodePosition } from './progress-format';

/** Progress inputs of the entry category. Films are tracked by their viewing history. */
export function ProgressFields({
  entry,
  register,
}: {
  entry: LibraryEntry;
  register: UseFormRegister<EntryPatchInput>;
}) {
  const { progress, metadata } = entry;
  if (progress.kind === 'game')
    return (
      <div className="form-grid">
        <label className="field">
          Horas jogadas
          <Input
            type="number"
            min={0}
            max={100000}
            step="0.5"
            {...register('progress.hoursPlayed', { valueAsNumber: true })}
          />
        </label>
        <label className="field">
          Conclusão (%)
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            {...register('progress.completion', { valueAsNumber: true })}
          />
        </label>
      </div>
    );
  if (progress.kind === 'episodic') {
    const total = metadata.kind === 'episodic' ? metadata.totalEpisodes : null;
    const position = episodePosition(entry);
    return (
      <label className="field">
        Episódios assistidos
        <Input
          type="number"
          min={0}
          max={
            total && metadata.kind === 'episodic' && metadata.releaseStatus === 'finished'
              ? total
              : 100000
          }
          step={1}
          {...register('progress.episodesWatched', { valueAsNumber: true })}
        />
        <small>
          {[total ? `De ${total} episódios` : 'Total de episódios não informado', position]
            .filter(Boolean)
            .join(' · ')}
        </small>
      </label>
    );
  }
  if (progress.kind === 'reading') {
    const totals = metadata.kind === 'reading' ? metadata : null;
    if (entry.mediaType === 'books')
      return (
        <label className="field">
          Páginas lidas
          <Input
            type="number"
            min={0}
            max={100000}
            step={1}
            {...register('progress.pagesRead', { valueAsNumber: true })}
          />
          <small>
            {totals?.totalPages
              ? `De ${totals.totalPages} páginas`
              : 'Total de páginas não informado'}
          </small>
        </label>
      );
    return (
      <div className="form-grid">
        <label className="field">
          Capítulos lidos
          <Input
            type="number"
            min={0}
            max={100000}
            step={1}
            {...register('progress.chaptersRead', { valueAsNumber: true })}
          />
          {totals?.totalChapters && <small>De {totals.totalChapters} capítulos</small>}
        </label>
        <label className="field">
          Volumes lidos
          <Input
            type="number"
            min={0}
            max={10000}
            step={1}
            {...register('progress.volumesRead', { valueAsNumber: true })}
          />
          {totals?.totalVolumes && <small>De {totals.totalVolumes} volumes</small>}
        </label>
      </div>
    );
  }
  return null;
}
