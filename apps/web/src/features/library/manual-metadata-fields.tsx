'use client';
import { useT } from '@/i18n/provider';
import { msg } from '@/i18n/config';
import { progressKinds, type MediaType } from '@jinsei/contracts';
import { Input } from '@/components/ui/input';

const creatorLabels: Record<(typeof progressKinds)[MediaType], [string, string]> = {
  game: [msg('Desenvolvimento'), msg('Estúdios ou pessoas, separados por vírgula')],
  episodic: [msg('Produção'), msg('Estúdios ou produtoras, separados por vírgula')],
  reading: [msg('Autoria'), msg('Autores, separados por vírgula')],
  film: [msg('Direção'), msg('Diretores, separados por vírgula')],
};
const totals: Record<MediaType, [string, string, number][]> = {
  games: [],
  anime: [
    ['totalEpisodes', msg('Total de episódios'), 100000],
    ['totalSeasons', msg('Temporadas'), 1000],
  ],
  series: [
    ['totalEpisodes', msg('Total de episódios'), 100000],
    ['totalSeasons', msg('Temporadas'), 1000],
  ],
  manga: [
    ['totalChapters', msg('Total de capítulos'), 100000],
    ['totalVolumes', msg('Total de volumes'), 10000],
  ],
  books: [['totalPages', msg('Total de páginas'), 100000]],
  movies: [['runtimeMinutes', msg('Duração (minutos)'), 2000]],
};

/** Optional totals and credits of a personal record, adapted to its category. */
export function ManualMetadataFields({ mediaType }: { mediaType: MediaType }) {
  const t = useT();
  const [creatorLabel, placeholder] = creatorLabels[progressKinds[mediaType]];
  return (
    <>
      {totals[mediaType].length > 0 && (
        <div className="form-grid">
          {totals[mediaType].map(([name, label, max]) => (
            <label className="field" key={name}>
              {t(label)}
              <Input
                name={name}
                type="number"
                min={1}
                max={max}
                step={1}
                placeholder={t('Opcional')}
              />
            </label>
          ))}
        </div>
      )}
      <label className="field">
        {t(creatorLabel)}
        <Input name="creators" placeholder={t(placeholder)} />
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
