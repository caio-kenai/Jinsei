'use client';
import { msg } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useState } from 'react';
import { LoaderCircle, Plus, Target } from 'lucide-react';
import { toast } from 'sonner';
import type { Goal } from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { GoalCard } from './goal-card';
import { GoalFormDialog } from './goal-form-dialog';
import { useGoalMutations, useGoals } from './use-goals';

const sections = [
  { title: msg('Em andamento'), states: ['active'] },
  { title: msg('Concluídas'), states: ['achieved'] },
  { title: msg('Encerradas e arquivadas'), states: ['expired', 'archived'] },
] as const;

export function GoalsScreen() {
  const t = useT();
  const result = useGoals();
  const { create, update, remove } = useGoalMutations();
  const [form, setForm] = useState<{ goal?: Goal } | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  return (
    <>
      <header className="context-header">
        <div className="context-title">
          <span className="context-icon">
            <Target size={17} />
          </span>
          <div>
            <h1>{t('Metas')}</h1>
            <div className="breadcrumb">{t('Objetivos acompanhados pela sua biblioteca')}</div>
          </div>
        </div>
        <div className="context-actions">
          <Button size="sm" onClick={() => setForm({})}>
            <Plus size={14} />
            {t('Nova meta')}
          </Button>
        </div>
      </header>
      <div className="library-scroll goals-page">
        {result.isPending ? (
          <div className="empty-state">
            <LoaderCircle className="spin" />
          </div>
        ) : result.error ? (
          <div className="empty-state">
            <p>{result.error.message}</p>
            <Button onClick={() => void result.refetch()}>{t('Tentar novamente')}</Button>
          </div>
        ) : result.data.goals.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">
              <Target size={25} />
            </span>
            <h2>{t('Aonde você quer chegar?')}</h2>
            <p>
              {t(
                'Concluir 20 jogos no ano, ler 100 capítulos, terminar uma coleção. Você escolhe.',
              )}
            </p>
            <Button variant="outline" onClick={() => setForm({})}>
              <Plus size={14} />
              {t('Criar minha primeira meta')}
            </Button>
          </div>
        ) : (
          sections.map((section) => {
            const goals = result.data.goals.filter((goal) =>
              (section.states as readonly string[]).includes(goal.state),
            );
            if (!goals.length) return null;
            return (
              <section key={section.title} className="goal-section">
                <div className="section-title">
                  <h2>{t(section.title)}</h2>
                  <span className="group-number">{goals.length}</span>
                </div>
                <div className="goal-grid">
                  {goals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={() => setForm({ goal })}
                      onArchive={() =>
                        update.mutate({
                          id: goal.id,
                          changes: { archived: goal.state !== 'archived' },
                        })
                      }
                      onDelete={() => setDeleting(goal)}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
      {form && (
        <GoalFormDialog
          open
          onOpenChange={(open) => !open && setForm(null)}
          initial={form.goal}
          pending={create.isPending || update.isPending}
          onSubmit={(input) => {
            const options = {
              onSuccess: () => {
                setForm(null);
                toast.success(form.goal ? t('Meta atualizada') : t('Meta criada'));
              },
            };
            if (form.goal) update.mutate({ id: form.goal.id, changes: input }, options);
            else create.mutate(input, options);
          }}
        />
      )}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogTitle className="dialog-title">{t('Excluir esta meta?')}</DialogTitle>
          <DialogDescription className="dialog-description">
            {deleting?.name} {t('será removida. Sua biblioteca não é alterada.')}
          </DialogDescription>
          <div className="dialog-footer">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t('Cancelar')}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => {
                    setDeleting(null);
                    toast.success(t('Meta excluída'));
                  },
                })
              }
            >
              {t('Excluir meta')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
