'use client';
import { currentDateLocale, currentLocale } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  BookMarked,
  BookOpen,
  ChartColumn,
  CircleCheck,
  Film,
  Gamepad2,
  Heart,
  Library,
  LoaderCircle,
  Star,
  Tv,
} from 'lucide-react';
import { categoryLabels, type Statistics } from '@jinsei/contracts';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { categoryIcons } from '@/components/shared/category-icons';
import { StatusBadge } from '@/features/library/status-badge';
import { categoryColors, chartPalette, ratingColor, statusColors } from '@/lib/palette';
import { NumberTicker } from '@/components/motion/number-ticker';
import { ActivityHeatmap, BarList, ColumnChart } from './charts';

const number = (value: number) => value.toLocaleString(currentLocale());

export function StatisticsScreen() {
  const t = useT();
  const result = useQuery({
    queryKey: ['statistics'],
    queryFn: () => api<Statistics>('/library/statistics'),
  });
  return (
    <>
      <header className="context-header">
        <div className="context-title">
          <span className="context-icon">
            <ChartColumn size={17} />
          </span>
          <div>
            <h1>{t('Estatísticas')}</h1>
            <div className="breadcrumb">{t('Sua jornada em números')}</div>
          </div>
        </div>
      </header>
      <div className="library-scroll statistics-page">
        {result.isPending ? (
          <div className="empty-state">
            <LoaderCircle className="spin" />
          </div>
        ) : result.error ? (
          <div className="empty-state">
            <p>{result.error.message}</p>
            <Button onClick={() => void result.refetch()}>{t('Tentar novamente')}</Button>
          </div>
        ) : (
          <StatisticsContent statistics={result.data} />
        )}
      </div>
    </>
  );
}

function StatisticsContent({ statistics }: { statistics: Statistics }) {
  const t = useT();
  const { totals } = statistics;
  const tiles: {
    label: string;
    value: number | null;
    decimals?: number;
    suffix?: string;
    Icon: typeof Library;
  }[] = [
    { label: t('Títulos'), value: totals.entries, Icon: Library },
    { label: t('Concluídos'), value: totals.completed, Icon: CircleCheck },
    { label: t('Favoritos'), value: totals.favorites, Icon: Heart },
    { label: t('Nota média'), value: totals.averageRating, decimals: 2, suffix: ' ★', Icon: Star },
    { label: t('Horas jogadas'), value: Math.round(totals.hoursPlayed), Icon: Gamepad2 },
    { label: t('Episódios'), value: totals.episodesWatched, Icon: Tv },
    { label: t('Capítulos'), value: totals.chaptersRead, Icon: BookOpen },
    { label: t('Páginas'), value: totals.pagesRead, Icon: BookMarked },
    { label: t('Sessões de filmes'), value: totals.timesWatched, Icon: Film },
  ];
  const completedThisYear = statistics.completionsByMonth.reduce((sum, row) => sum + row.count, 0);
  return (
    <>
      <div className="stat-tiles">
        {tiles.map(({ label, value, decimals, suffix, Icon }, index) => (
          <div
            className="stat-tile"
            key={label}
            style={
              { '--tile-color': chartPalette[index % chartPalette.length] } as React.CSSProperties
            }
          >
            <span className="stat-tile-icon" aria-hidden="true">
              <Icon size={15} />
            </span>
            <span>{label}</span>
            <strong>
              {value === null ? (
                '—'
              ) : (
                <>
                  <NumberTicker value={value} decimals={decimals} />
                  {suffix}
                </>
              )}
            </strong>
          </div>
        ))}
      </div>
      <div className="statistics-grid">
        <section className="journey-card">
          <h2 className="chart-title">{t('Conclusões nos últimos 12 meses')}</h2>
          <p className="chart-subtitle">
            {number(completedThisYear)} {t('títulos concluídos no período')}
          </p>
          <ColumnChart
            label={t('Títulos concluídos')}
            unit={[t('título'), t('títulos')]}
            rows={statistics.completionsByMonth.map((row) => {
              const date = parseISO(`${row.month}-01`);
              return {
                key: row.month,
                label: format(date, 'MMM', { locale: currentDateLocale() }),
                title: format(date, t("MMMM 'de' yyyy"), { locale: currentDateLocale() }),
                value: row.count,
              };
            })}
          />
        </section>
        <section className="journey-card">
          <h2 className="chart-title">{t('Por status')}</h2>
          <BarList
            rows={statistics.byStatus.map((row) => ({
              key: row.status,
              label: <StatusBadge status={row.status} />,
              value: row.count,
              color: statusColors[row.status],
            }))}
          />
        </section>
        <section className="journey-card">
          <h2 className="chart-title">{t('Por categoria')}</h2>
          {statistics.byCategory.length ? (
            <BarList
              rows={statistics.byCategory
                .sort((a, b) => b.total - a.total)
                .map((row) => {
                  const Icon = categoryIcons[row.mediaType];
                  return {
                    key: row.mediaType,
                    label: (
                      <>
                        <Icon size={13} />
                        {t(categoryLabels[row.mediaType])}
                      </>
                    ),
                    value: row.total,
                    color: categoryColors[row.mediaType],
                    detail: t('{number} · {number2} concluídos', {
                      number: number(row.total),
                      number2: number(row.completed),
                    }),
                  };
                })}
            />
          ) : (
            <p className="muted">{t('Adicione títulos para ver a distribuição.')}</p>
          )}
        </section>
        <section className="journey-card">
          <h2 className="chart-title">{t('Suas notas')}</h2>
          <ColumnChart
            label={t('Títulos por nota')}
            unit={[t('título'), t('títulos')]}
            rows={statistics.ratings.map((row) => ({
              key: String(row.rating),
              label: row.rating.toLocaleString(currentLocale()),
              title: `${row.rating.toLocaleString(currentLocale())} estrelas`,
              value: row.count,
              color: ratingColor(row.rating),
            }))}
          />
        </section>
      </div>
      <section className="journey-card activity-card">
        <h2 className="chart-title">{t('Atividade')}</h2>
        <p className="chart-subtitle">
          {t('Registros, avaliações e progresso dos últimos seis meses')}
        </p>
        <ActivityHeatmap days={statistics.activity} />
      </section>
    </>
  );
}
