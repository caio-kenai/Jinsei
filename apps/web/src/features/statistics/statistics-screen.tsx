'use client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChartColumn, LoaderCircle } from 'lucide-react';
import { categoryLabels, type Statistics } from '@jinsei/contracts';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { categoryIcons } from '@/components/shared/category-icons';
import { StatusBadge } from '@/features/library/status-badge';
import { ActivityHeatmap, BarList, ColumnChart } from './charts';

const number = (value: number) => value.toLocaleString('pt-BR');

export function StatisticsScreen() {
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
            <h1>Estatísticas</h1>
            <div className="breadcrumb">Sua jornada em números</div>
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
            <Button onClick={() => void result.refetch()}>Tentar novamente</Button>
          </div>
        ) : (
          <StatisticsContent statistics={result.data} />
        )}
      </div>
    </>
  );
}

function StatisticsContent({ statistics }: { statistics: Statistics }) {
  const { totals } = statistics;
  const tiles = [
    ['Títulos', number(totals.entries)],
    ['Concluídos', number(totals.completed)],
    ['Favoritos', number(totals.favorites)],
    [
      'Nota média',
      totals.averageRating === null
        ? '—'
        : `${totals.averageRating.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ★`,
    ],
    ['Horas jogadas', number(Math.round(totals.hoursPlayed))],
    ['Episódios', number(totals.episodesWatched)],
    ['Capítulos', number(totals.chaptersRead)],
    ['Páginas', number(totals.pagesRead)],
    ['Sessões de filmes', number(totals.timesWatched)],
  ] as const;
  const completedThisYear = statistics.completionsByMonth.reduce((sum, row) => sum + row.count, 0);
  return (
    <>
      <div className="stat-tiles">
        {tiles.map(([label, value]) => (
          <div className="stat-tile" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="statistics-grid">
        <section className="journey-card">
          <h2 className="chart-title">Conclusões nos últimos 12 meses</h2>
          <p className="chart-subtitle">
            {number(completedThisYear)} títulos concluídos no período
          </p>
          <ColumnChart
            label="Títulos concluídos"
            unit={['título', 'títulos']}
            rows={statistics.completionsByMonth.map((row) => {
              const date = parseISO(`${row.month}-01`);
              return {
                key: row.month,
                label: format(date, 'MMM', { locale: ptBR }),
                title: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
                value: row.count,
              };
            })}
          />
        </section>
        <section className="journey-card">
          <h2 className="chart-title">Por status</h2>
          <BarList
            rows={statistics.byStatus.map((row) => ({
              key: row.status,
              label: <StatusBadge status={row.status} />,
              value: row.count,
            }))}
          />
        </section>
        <section className="journey-card">
          <h2 className="chart-title">Por categoria</h2>
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
                        {categoryLabels[row.mediaType]}
                      </>
                    ),
                    value: row.total,
                    detail: `${number(row.total)} · ${number(row.completed)} concluídos`,
                  };
                })}
            />
          ) : (
            <p className="muted">Adicione títulos para ver a distribuição.</p>
          )}
        </section>
        <section className="journey-card">
          <h2 className="chart-title">Suas notas</h2>
          <ColumnChart
            label="Títulos por nota"
            unit={['título', 'títulos']}
            rows={statistics.ratings.map((row) => ({
              key: String(row.rating),
              label: row.rating.toLocaleString('pt-BR'),
              title: `${row.rating.toLocaleString('pt-BR')} estrelas`,
              value: row.count,
            }))}
          />
        </section>
      </div>
      <section className="journey-card activity-card">
        <h2 className="chart-title">Atividade</h2>
        <p className="chart-subtitle">Registros, avaliações e progresso dos últimos seis meses</p>
        <ActivityHeatmap days={statistics.activity} />
      </section>
    </>
  );
}
