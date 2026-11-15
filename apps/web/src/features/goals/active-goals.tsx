'use client';
import { useT } from '@/i18n/provider';
import Link from 'next/link';
import { useGoals } from './use-goals';
import { GoalCard } from './goal-card';

/** Home widget with the active goals closest to completion. */
export function ActiveGoals() {
  const t = useT();
  const result = useGoals();
  const goals = (result.data?.goals ?? [])
    .filter((goal) => goal.state === 'active')
    .sort((a, b) => b.current / b.target - a.current / a.target)
    .slice(0, 3);
  if (!goals.length) return null;
  return (
    <section className="home-goals">
      <div className="section-title">
        <h2>{t('Metas ativas')}</h2>
        <Link href="/goals" className="section-link">
          {t('Ver todas')}
        </Link>
      </div>
      <div className="goal-grid">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </section>
  );
}
