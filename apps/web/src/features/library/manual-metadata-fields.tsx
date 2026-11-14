'use client';
import { progressKinds, type MediaType } from '@jinsei/contracts';
import { Input } from '@/components/ui/input';

const creatorLabels: Record<(typeof progressKinds)[MediaType], [string, string]> = {
  game: ['Desenvolvimento', 'Estúdios ou pessoas, separados por vírgula'],
  episodic: ['Produção', 'Estúdios ou produtoras, separados por vírgula'],
  reading: ['Autoria', 'Autores, separados por vírgula'],
  film: ['Direção', 'Diretores, separados por vírgula'],
};
const totals: Record<MediaType, [string, string, number][]> = {
  games: [],
  anime: [
    ['totalEpisodes', 'Total de episódios', 100000],
    ['totalSeasons', 'Temporadas', 1000],
  ],
  series: [
    ['totalEpisodes', 'Total de episódios', 100000],
    ['totalSeasons', 'Temporadas', 1000],
  ],
  manga: [
    ['totalChapters', 'Total de capítulos', 100000],
    ['totalVolumes', 'Total de volumes', 10000],
  ],
  books: [['totalPages', 'Total de páginas', 100000]],
  movies: [['runtimeMinutes', 'Duração (minutos)', 2000]],
};

/** Optional totals and credits of a personal record, adapted to its category. */
export function ManualMetadataFields({ mediaType }: { mediaType: MediaType }) {
  const [creatorLabel, placeholder] = creatorLabels[progressKinds[mediaType]];
  return (
    <>
      {totals[mediaType].length > 0 && (
        <div className="form-grid">
          {totals[mediaType].map(([name, label, max]) => (
            <label className="field" key={name}>
              {label}
              <Input name={name} type="number" min={1} max={max} step={1} placeholder="Opcional" />
            </label>
          ))}
        </div>
      )}
      <label className="field">
        {creatorLabel}
        <Input name="creators" placeholder={placeholder} />
      </label>
    </>
  );
}

export function manualMetadataValues(fields: FormData, mediaType: MediaType) {
  const optional = (name: string) => (fields.get(name) ? Number(fields.get(name)) : null);
  const values = Object.fromEntries(
    totals[mediaType].map(([name]) => [name, optional(name)] as const),
  );
  return {
    ...values,
    creators: String(fields.get('creators') ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  };
}
