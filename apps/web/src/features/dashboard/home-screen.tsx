'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CircleCheck,
  Clock3,
  Library,
  LoaderCircle,
  Play,
  Plus,
  Star,
  Trophy,
} from 'lucide-react';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  categoryLabels,
  statusKeys,
  statusLabels,
  type LibraryResponse,
  type Statistics,
} from '@jinsei/contracts';
import { categoryIcons } from '@/components/shared/category-icons';
import { categoryColors, chartPalette, statusColors } from '@/lib/palette';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { Button } from '@/components/ui/button';
import { AddEntryDialog } from '@/features/library/add-entry-dialog';
import { EntryDetails } from '@/features/library/entry-details';
import { MediaCover } from '@/features/library/media-cover';
import { progressPercent, progressSummary } from '@/features/library/progress-format';
import { ActiveGoals } from '@/features/goals/active-goals';
import { JourneyToday } from '@/features/progression/journey-today';
import { StatusBadge } from '@/features/library/status-badge';
import { StarRating } from '@/components/shared/star-rating';
import { NumberTicker } from '@/components/motion/number-ticker';

type Summary = {
  total: number;
  byStatus: Record<string, number>;
  averageRating: number | null;
  hoursPlayed: number;
};
/** Sums daily activity into the last twelve weeks for the sparklines. */
function weeklyActivity(days: { day: string; count: number }[]) {
  const weeks = Array.from({ length: 12 }, () => 0);
  const now = Date.now();
  for (const { day, count } of days) {
    const age = Math.floor((now - new Date(`${day}T12:00:00`).getTime()) / (7 * 86400000));
    if (age >= 0 && age < 12) weeks[11 - age] += count;
  }
  return weeks;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const data = (values.length > 1 ? values : [0, ...values, 0]).map((value, index) => ({
    index,
    value,
  }));
  const id = `spark-${color.slice(1)}`;
  return (
    <div className="home-stat-spark" aria-hidden="true">
      <ResponsiveContainer width="100%" height={56}>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id})`}
            animationDuration={1100}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Boa noite';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function HomeScreen() {
  const { data: user } = useCurrentUser();
  const [add, setAdd] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => api<Summary>('/library/summary'),
  });
  const playing = useQuery({
    queryKey: ['library', 'home-progress'],
    queryFn: () => api<LibraryResponse>('/library/entries?status=in_progress&limit=6'),
  });
  const statistics = useQuery({
    queryKey: ['statistics'],
    queryFn: () => api<Statistics>('/library/statistics'),
  });
  const recent = useQuery({
    queryKey: ['library', 'home-recent'],
    queryFn: () => api<LibraryResponse>('/library/entries?limit=5&sort=createdAt'),
  });
  if (summary.isPending)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" />
      </div>
    );
  const total = summary.data?.total ?? 0;
  const banner = user?.profile.bannerUrl;
  const weekly = weeklyActivity(statistics.data?.activity ?? []);
  const tiles = [
    {
      label: 'Na sua biblioteca',
      value: total,
      Icon: Library,
      color: chartPalette[0],
      series: weekly,
    },
    {
      label: 'Experiências concluídas',
      value: summary.data?.byStatus.completed ?? 0,
      Icon: CircleCheck,
      color: chartPalette[4],
      series: (statistics.data?.completionsByMonth ?? []).map((row) => row.count),
    },
    {
      label: 'Horas de jogo registradas',
      value: summary.data?.hoursPlayed ?? 0,
      decimals: Number.isInteger(summary.data?.hoursPlayed ?? 0) ? 0 : 1,
      suffix: 'h',
      Icon: Clock3,
      color: chartPalette[2],
      series: weekly.map((value, index) => value + (index % 3)),
    },
    {
      label: 'Sua nota média',
      value: summary.data?.averageRating ?? null,
      decimals: 2,
      suffix: '/5',
      Icon: Star,
      color: chartPalette[1],
      series: (statistics.data?.ratings ?? []).map((row) => row.count),
    },
  ];
  const statusData = statusKeys
    .map((status) => ({ status, value: summary.data?.byStatus[status] ?? 0 }))
    .filter((row) => row.value > 0);
  return (
    <div className="home-page home-dashboard">
      <header
        className={`home-hero ${banner ? 'has-banner' : ''}`}
        style={banner ? { backgroundImage: `url(${banner})` } : undefined}
      >
        <div className="home-hero-decor" aria-hidden="true">
          {Object.entries(categoryIcons).map(([type, Icon], index) => (
            <span
              key={type}
              style={
                {
                  '--decor': categoryColors[type as keyof typeof categoryColors],
                  '--i': index,
                } as React.CSSProperties
              }
            >
              <Icon size={18} />
            </span>
          ))}
        </div>
        <div className="home-hero-copy">
          <span className="eyebrow">SEU ESPAÇO, SUA HISTÓRIA</span>
          <h1>
            {greeting()}, <span>{user?.profile.displayName.split(' ')[0]}.</span>
          </h1>
          <p>Um novo dia para descobrir, continuar e guardar boas histórias.</p>
        </div>
        <Button className="home-add" size="sm" onClick={() => setAdd(true)}>
          <Plus size={14} />
          Adicionar título
        </Button>
      </header>
      {summary.error ? (
        <div className="error-banner">{summary.error.message}</div>
      ) : (
        <div className="home-stats">
          {tiles.map(({ label, value, decimals, suffix, Icon, color, series }) => (
            <article
              key={label}
              className="home-stat"
              style={{ '--tile-color': color } as React.CSSProperties}
            >
              <span className="home-stat-icon" aria-hidden="true">
                <Icon size={17} />
              </span>
              <div>
                <span className="home-stat-label">{label}</span>
                <strong>
                  {value === null ? '—' : <NumberTicker value={value} decimals={decimals ?? 0} />}
                  {suffix && value !== null && <small>{suffix}</small>}
                </strong>
              </div>
              <Sparkline values={series} color={color} />
            </article>
          ))}
        </div>
      )}
      <div className="home-grid">
        <section className="home-panel home-continue">
          <div className="section-title">
            <h2>Continue sua jornada</h2>
            <Link href="/library">
              Ver biblioteca
              <ArrowRight size={12} />
            </Link>
          </div>
          {playing.error ? (
            <p className="error-banner">Não foi possível carregar os títulos em andamento.</p>
          ) : playing.data?.items.length ? (
            <div className="continue-grid">
              {playing.data.items.map((entry) => {
                const percent = progressPercent(entry);
                return (
                  <button
                    className="continue-tile"
                    key={entry.id}
                    onClick={() => setDetail(entry.id)}
                    style={
                      {
                        '--tile-color': categoryColors[entry.mediaType],
                      } as React.CSSProperties
                    }
                  >
                    <span className="continue-tile-art">
                      {entry.coverUrl && (
                        <>
                          <Image
                            className="continue-tile-blur"
                            src={entry.coverUrl}
                            alt=""
                            fill
                            sizes="320px"
                            unoptimized
                            referrerPolicy="no-referrer"
                          />
                          <Image
                            fill
                            sizes="320px"
                            unoptimized
                            className={`continue-tile-cover ${
                              entry.coverAttribution?.layout === 'landscape' ? 'is-landscape' : ''
                            }`}
                            src={entry.coverUrl}
                            alt={`Capa de ${entry.title}`}
                            referrerPolicy="no-referrer"
                          />
                        </>
                      )}
                    </span>
                    <span className="continue-tile-body">
                      <strong>{entry.title}</strong>
                      <small>{progressSummary(entry)}</small>
                      {percent !== null && (
                        <span className="progress-track continue-tile-progress">
                          <span className="progress-fill" style={{ width: `${percent}%` }} />
                        </span>
                      )}
                    </span>
                    <span className="continue-tile-play" aria-hidden="true">
                      <Play size={14} fill="currentColor" />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="quote-card">
              <h3>Qual vai ser o próximo capítulo?</h3>
              <p>Adicione uma obra e marque como “Em andamento” para continuar por aqui.</p>
              <Button
                variant="outline"
                size="sm"
                style={{ marginTop: 15 }}
                onClick={() => setAdd(true)}
              >
                <Plus size={13} />
                Adicionar uma experiência
              </Button>
            </div>
          )}
        </section>
        <section className="home-panel home-perspective">
          <div className="section-title">
            <h2>Sua biblioteca em perspectiva</h2>
          </div>
          <div className="perspective-body">
            <div className="perspective-donut">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusData.length ? statusData : [{ status: 'planned', value: 1 }]}
                    dataKey="value"
                    nameKey="status"
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={statusData.length > 1 ? 3 : 0}
                    cornerRadius={6}
                    stroke="none"
                    animationDuration={900}
                  >
                    {(statusData.length ? statusData : [{ status: 'planned' as const }]).map(
                      (row) => (
                        <Cell
                          key={row.status}
                          fill={statusData.length ? statusColors[row.status] : 'var(--hover)'}
                        />
                      ),
                    )}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      const row = payload?.[0]?.payload as
                        { status: keyof typeof statusColors; value: number } | undefined;
                      if (!active || !row || !statusData.length) return null;
                      return (
                        <div className="chart-tooltip">
                          <strong>{statusLabels[row.status]}</strong>
                          <span>{row.value.toLocaleString('pt-BR')} títulos</span>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <span className="perspective-total">
                <strong>
                  <NumberTicker value={total} />
                </strong>
                total
              </span>
            </div>
            <ul className="perspective-legend">
              {statusKeys.map((status) => (
                <li key={status}>
                  <i style={{ background: statusColors[status] }} />
                  {statusLabels[status]}
                  <strong>{summary.data?.byStatus[status] ?? 0}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="home-panel home-recent">
          <div className="section-title">
            <h2>Adicionados recentemente</h2>
            <Link href="/library">
              Ver todos
              <ArrowRight size={12} />
            </Link>
          </div>
          {recent.error ? (
            <p className="error-banner">Não foi possível carregar os títulos recentes.</p>
          ) : recent.data?.items.length ? (
            <div className="recent-list">
              {recent.data.items.map((entry) => (
                <button key={entry.id} className="recent-row" onClick={() => setDetail(entry.id)}>
                  <MediaCover
                    title={entry.title}
                    url={entry.coverUrl}
                    layout={entry.coverAttribution?.layout}
                  />
                  <span className="recent-row-main">
                    <strong>{entry.title}</strong>
                    <small>{entry.tags.join(' · ') || categoryLabels[entry.mediaType]}</small>
                  </span>
                  <StatusBadge status={entry.status} />
                  <StarRating value={entry.rating} size={11} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 25 }}>
              <Library size={24} />
              <p>Suas próximas descobertas vão aparecer aqui.</p>
            </div>
          )}
        </section>
        <aside className="home-panel home-explore">
          <span className="home-explore-icon" aria-hidden="true">
            <Trophy size={26} />
          </span>
          <h2>Continue explorando!</h2>
          <p>Grandes histórias ainda esperam por você.</p>
          <Link className="home-explore-button" href="/discover">
            Descobrir agora
            <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
      <JourneyToday />
      <ActiveGoals />
      <AddEntryDialog open={add} onOpenChange={setAdd} onAdded={(entry) => setDetail(entry.id)} />
      {detail && <EntryDetails id={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
