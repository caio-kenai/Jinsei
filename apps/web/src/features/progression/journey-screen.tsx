'use client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, LoaderCircle, Lock, Sparkles } from 'lucide-react';
import { missionPeriodLabels, missionPeriods } from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { badgeIcons } from './badge-icons';
import { LevelCard, MissionList, StreakCard } from './journey-widgets';
import { useActiveTitle, useProgression } from './use-progression';

export function JourneyScreen() {
  const result = useProgression();
  const title = useActiveTitle();
  if (result.isPending)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" />
      </div>
    );
  if (result.error)
    return (
      <div className="empty-state">
        <p>{result.error.message}</p>
        <Button onClick={() => void result.refetch()}>Tentar novamente</Button>
      </div>
    );
  const progression = result.data;
  const unlocked = progression.badges.filter((badge) => badge.unlockedAt).length;
  return (
    <>
      <header className="context-header">
        <div className="context-title">
          <span className="context-icon">
            <Sparkles size={17} />
          </span>
          <div>
            <h1>Jornada</h1>
            <div className="breadcrumb">Níveis, missões, sequência e conquistas</div>
          </div>
        </div>
      </header>
      <div className="library-scroll journey-page">
        <div className="journey-hero">
          <LevelCard progression={progression} />
          <StreakCard progression={progression} />
        </div>
        <div className="mission-columns">
          {missionPeriods.map((period) => (
            <section key={period} className="journey-card">
              <h2 className="journey-section-title">{missionPeriodLabels[period]}</h2>
              <MissionList
                missions={progression.missions.filter((mission) => mission.period === period)}
              />
            </section>
          ))}
        </div>
        <section className="journey-section">
          <div className="section-title">
            <h2>Insígnias</h2>
            <span className="group-number">
              {unlocked} de {progression.badges.length}
            </span>
          </div>
          <div className="badge-grid">
            {progression.badges.map((badge) => {
              const Icon = badgeIcons[badge.icon] ?? Sparkles;
              return (
                <article
                  key={badge.key}
                  className={`badge-card ${badge.unlockedAt ? 'unlocked' : 'locked'}`}
                >
                  <span className="badge-icon">
                    {badge.unlockedAt ? <Icon size={20} /> : <Lock size={16} />}
                  </span>
                  <strong>{badge.label}</strong>
                  <small>{badge.description}</small>
                  {badge.unlockedAt ? (
                    <small className="badge-date">
                      {format(parseISO(badge.unlockedAt), 'd MMM yyyy', { locale: ptBR })}
                    </small>
                  ) : (
                    <span className="badge-track">
                      <span style={{ width: `${(badge.progress / badge.target) * 100}%` }} />
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </section>
        <section className="journey-section">
          <div className="section-title">
            <h2>Títulos</h2>
          </div>
          <p className="muted journey-hint">
            O título escolhido aparece na sua jornada e no seu perfil.
          </p>
          <div className="title-list">
            {progression.titles.map((item) => {
              const active = progression.activeTitle === item.key;
              return (
                <button
                  key={item.key}
                  className={`title-option ${active ? 'active' : ''}`}
                  disabled={!item.unlocked || title.isPending}
                  aria-pressed={active}
                  onClick={() => title.mutate(active ? null : item.key)}
                >
                  {item.unlocked ? active ? <Check size={13} /> : null : <Lock size={12} />}
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.requirement}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
