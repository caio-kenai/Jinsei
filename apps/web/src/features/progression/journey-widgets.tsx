'use client';
import { currentDateLocale, currentLocale } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { formatDistanceToNowStrict } from 'date-fns';
import { Check, Flame } from 'lucide-react';
import type { Mission, Progression } from '@jinsei/contracts';

export function LevelCard({ progression }: { progression: Progression }) {
  const t = useT();
  const span = progression.nextLevelXp - progression.levelXp;
  const within = progression.xp - progression.levelXp;
  const title = progression.titles.find((item) => item.key === progression.activeTitle);
  return (
    <section className="journey-card level-card">
      <span className="level-badge" aria-hidden="true">
        {progression.level}
      </span>
      <div className="level-body">
        <span className="eyebrow">
          {t('Nível')} {progression.level}
        </span>
        <h2>{title ? t(title.label) : t('Sua jornada')}</h2>
        <div
          className="xp-track"
          role="progressbar"
          aria-label={t('Experiência até o próximo nível')}
          aria-valuemin={0}
          aria-valuemax={span}
          aria-valuenow={within}
        >
          <span style={{ width: `${Math.round((within / span) * 100)}%` }} />
        </div>
        <small>
          {within.toLocaleString(currentLocale())} / {span.toLocaleString(currentLocale())}{' '}
          {t('XP para o nível')} {progression.level + 1} ·{' '}
          {progression.xp.toLocaleString(currentLocale())} {t('XP no total')}
        </small>
      </div>
    </section>
  );
}

export function StreakCard({ progression }: { progression: Progression }) {
  const t = useT();
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
        <span className="eyebrow">{t('Sequência')}</span>
        <h2>
          {streak.current} {streak.current === 1 ? 'dia' : 'dias'}
        </h2>
        <small>
          {streak.today
            ? t('Missões diárias concluídas hoje.')
            : t('Conclua as missões diárias para manter a sequência.')}{' '}
          {t('Recorde:')} {streak.best}.
        </small>
        <div className="streak-days" aria-label={t('Últimos 14 dias')}>
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
  const t = useT();
  return (
    <ul className="mission-list">
      {missions.map((mission) => (
        <li key={mission.key} className={mission.completed ? 'completed' : ''}>
          <span className="mission-check" aria-hidden="true">
            {mission.completed && <Check size={12} />}
          </span>
          <span className="mission-body">
            <span className="mission-label">{t(mission.label)}</span>
            <span className="mission-track">
              <span style={{ width: `${(mission.progress / mission.target) * 100}%` }} />
            </span>
            <small>
              {mission.progress.toLocaleString(currentLocale())} /{' '}
              {mission.target.toLocaleString(currentLocale())}
              {' · '}
              {mission.completed
                ? t('Concluída')
                : `Termina ${formatDistanceToNowStrict(new Date(mission.endsAt), {
                    addSuffix: true,
                    locale: currentDateLocale(),
                  })}`}
            </small>
          </span>
          <span className="mission-xp">
            +{mission.xp} {t('XP')}
          </span>
        </li>
      ))}
    </ul>
  );
}
