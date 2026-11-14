'use client';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

/** Vertical columns with labels under each column, a hover tooltip and an optional table. */
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
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((row) => row.value));
  const width = 640;
  const height = 180;
  const gap = 6;
  const column = (width - gap * (rows.length - 1)) / rows.length;
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
        <svg viewBox={`0 0 ${width} ${height + 22}`} role="img" aria-label={label}>
          <line className="chart-baseline" x1={0} x2={width} y1={height} y2={height} />
          {rows.map((row, index) => {
            const barHeight = row.value ? Math.max(4, (row.value / max) * (height - 18)) : 0;
            const x = index * (column + gap);
            return (
              <g
                key={row.key}
                onMouseEnter={() => setHover(row.key)}
                onMouseLeave={() => setHover(null)}
              >
                <rect className="chart-hit" x={x} y={0} width={column} height={height} />
                {barHeight > 0 && (
                  <path
                    className={`chart-column ${hover === row.key ? 'active' : ''}`}
                    d={`M${x},${height} V${height - barHeight + 4} Q${x},${height - barHeight} ${
                      x + 4
                    },${height - barHeight} H${x + column - 4} Q${x + column},${height - barHeight} ${
                      x + column
                    },${height - barHeight + 4} V${height} Z`}
                  />
                )}
                {hover === row.key && (
                  <text className="chart-value" x={x + column / 2} y={height - barHeight - 6}>
                    {number(row.value)}
                  </text>
                )}
                <text className="chart-axis" x={x + column / 2} y={height + 15}>
                  {row.label}
                </text>
                <title>{`${row.title}: ${describe(row.value)}`}</title>
              </g>
            );
          })}
        </svg>
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
