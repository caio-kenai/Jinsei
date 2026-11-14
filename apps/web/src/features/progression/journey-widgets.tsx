'use client';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Flame } from 'lucide-react';
import type { Mission, Progression } from '@jinsei/contracts';

export function LevelCard({ progression }: { progression: Progression }) {
  const span = progression.nextLevelXp - progression.levelXp;
  const within = progression.xp - progression.levelXp;
  const title = progression.titles.find((item) => item.key === progression.activeTitle);
  return (
    <section className="journey-card level-card">
      <span className="level-badge" aria-hidden="true">
        {progression.level}
      </span>
      <div className="level-body">
        <span className="eyebrow">Nível {progression.level}</span>
        <h2>{title?.label ?? 'Sua jornada'}</h2>
        <div
          className="xp-track"
          role="progressbar"
          aria-label="Experiência até o próximo nível"
          aria-valuemin={0}
          aria-valuemax={span}
          aria-valuenow={within}
        >
          <span style={{ width: `${Math.round((within / span) * 100)}%` }} />
        </div>
        <small>
          {within.toLocaleString('pt-BR')} / {span.toLocaleString('pt-BR')} XP para o nível{' '}
          {progression.level + 1} · {progression.xp.toLocaleString('pt-BR')} XP no total
        </small>
      </div>
    </section>
  );
}

export function StreakCard({ progression }: { progression: Progression }) {
  const { streak } = progression;
  const done = new Set(streak.days);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: progression.timezone }).format(
    new Date(),
  );
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(`${today}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - (13 - index));
    return date.toISOString().slice(0, 10);
  });
  return (
    <section className={`journey-card streak-card ${streak.today ? 'lit' : ''}`}>
      <Flame size={30} className="streak-flame" aria-hidden="true" />
      <div>
        <span className="eyebrow">Sequência</span>
        <h2>
          {streak.current} {streak.current === 1 ? 'dia' : 'dias'}
        </h2>
        <small>
          {streak.today
            ? 'Missões diárias concluídas hoje.'
            : 'Conclua as missões diárias para manter a sequência.'}{' '}
          Recorde: {streak.best}.
        </small>
        <div className="streak-days" aria-label="Últimos 14 dias">
          {days.map((day) => (
            <span
              key={day}
              className={done.has(day) ? 'done' : ''}
              title={day.split('-').reverse().join('/')}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function MissionList({ missions }: { missions: Mission[] }) {
  return (
    <ul className="mission-list">
      {missions.map((mission) => (
        <li key={mission.key} className={mission.completed ? 'completed' : ''}>
          <span className="mission-check" aria-hidden="true">
            {mission.completed && <Check size={12} />}
          </span>
          <span className="mission-body">
            <span className="mission-label">{mission.label}</span>
            <span className="mission-track">
              <span style={{ width: `${(mission.progress / mission.target) * 100}%` }} />
            </span>
            <small>
              {mission.progress.toLocaleString('pt-BR')} / {mission.target.toLocaleString('pt-BR')}
              {' · '}
              {mission.completed
                ? 'Concluída'
                : `Termina ${formatDistanceToNowStrict(new Date(mission.endsAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}`}
            </small>
          </span>
          <span className="mission-xp">+{mission.xp} XP</span>
        </li>
      ))}
    </ul>
  );
}
