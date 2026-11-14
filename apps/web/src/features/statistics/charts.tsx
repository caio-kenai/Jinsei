'use client';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const number = (value: number) => value.toLocaleString('pt-BR');

/** Horizontal bars of one hue; each row carries its own label, so color never identifies. */
export function BarList({
  rows,
}: {
  rows: { key: string; label: React.ReactNode; value: number; detail?: string }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="bar-list">
      {rows.map((row) => (
        <li key={row.key} title={`${row.detail ?? number(row.value)}`}>
          <span className="bar-label">{row.label}</span>
          <span className="bar-track">
            <span style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <span className="bar-value">{row.detail ?? number(row.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Vertical columns (Recharts) with a hover tooltip and a table view for screen readers. */
export function ColumnChart({
  rows,
  label,
  unit,
}: {
  rows: { key: string; label: string; title: string; value: number }[];
  label: string;
  unit: [string, string];
}) {
  const [table, setTable] = useState(false);
  const describe = (value: number) => `${number(value)} ${value === 1 ? unit[0] : unit[1]}`;
  return (
    <figure className="column-chart">
      <button type="button" className="chart-toggle" onClick={() => setTable(!table)}>
        {table ? 'Ver gráfico' : 'Ver tabela'}
      </button>
      {table ? (
        <table className="chart-table">
          <thead>
            <tr>
              <th scope="col">Período</th>
              <th scope="col">{label}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.title}</td>
                <td>{number(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="column-chart-canvas" role="img" aria-label={label}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={rows}
              margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
              barCategoryGap={4}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ className: 'chart-baseline' }}
                tick={{ className: 'chart-axis' }}
                interval="preserveStartEnd"
              />
              <Tooltip
                cursor={{ className: 'chart-cursor' }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                  if (!active || !row) return null;
                  return (
                    <div className="chart-tooltip">
                      <strong>{row.title}</strong>
                      <span>{describe(row.value)}</span>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="value"
                fill="var(--primary)"
                fillOpacity={0.85}
                radius={[4, 4, 0, 0]}
                minPointSize={(value) => (Number(value) > 0 ? 4 : 0)}
                activeBar={{ fillOpacity: 1 }}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}

/** Daily activity as a calendar heatmap: one hue, light to dark, weeks as columns. */
export function ActivityHeatmap({ days }: { days: { day: string; count: number }[] }) {
  const counts = new Map(days.map((item) => [item.day, item.count]));
  const max = Math.max(1, ...days.map((item) => item.count));
  const today = new Date();
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7 * 25 - end.getUTCDay());
  const cells: { day: string; count: number; column: number; row: number }[] = [];
  for (
    let date = new Date(start), index = 0;
    date <= end;
    date.setUTCDate(date.getUTCDate() + 1), index++
  ) {
    const day = date.toISOString().slice(0, 10);
    cells.push({ day, count: counts.get(day) ?? 0, column: Math.floor(index / 7), row: index % 7 });
  }
  const level = (count: number) => (count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4)));
  const size = 12;
  const step = 15;
  const columns = Math.max(...cells.map((cell) => cell.column)) + 1;
  return (
    <figure className="heatmap">
      <svg
        viewBox={`0 0 ${columns * step} ${7 * step}`}
        role="img"
        aria-label="Atividade diária nos últimos seis meses"
      >
        {cells.map((cell) => (
          <rect
            key={cell.day}
            className={`heat-${level(cell.count)}`}
            x={cell.column * step}
            y={cell.row * step}
            width={size}
            height={size}
            rx={3}
          >
            <title>{`${format(parseISO(cell.day), "d 'de' MMM yyyy", { locale: ptBR })}: ${number(
              cell.count,
            )} ${cell.count === 1 ? 'atividade' : 'atividades'}`}</title>
          </rect>
        ))}
      </svg>
      <figcaption className="heatmap-legend">
        Menos
        {[0, 1, 2, 3, 4].map((value) => (
          <span key={value} className={`heat-swatch heat-${value}`} />
        ))}
        Mais
      </figcaption>
    </figure>
  );
}
