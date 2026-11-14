'use client';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { MissionList } from './journey-widgets';
import { useProgression } from './use-progression';

/** Home widget: level, streak and today's missions. */
export function JourneyToday() {
  const { data } = useProgression();
  if (!data) return null;
  return (
    <section className="journey-today">
      <div className="section-title">
        <h2>Sua jornada hoje</h2>
        <span className={`streak-chip ${data.streak.today ? 'lit' : ''}`}>
          <Flame size={13} />
          {data.streak.current}
        </span>
        <span className="level-chip">Nível {data.level}</span>
        <Link href="/journey" className="section-link">
          Ver jornada
        </Link>
      </div>
      <MissionList missions={data.missions.filter((mission) => mission.period === 'daily')} />
    </section>
  );
}
