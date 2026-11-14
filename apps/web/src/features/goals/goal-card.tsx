'use client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { categoryLabels, goalStateLabels, goalUnits, type Goal } from '@jinsei/contracts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GoalRing } from './goal-ring';

const date = (value: string) => format(parseISO(value), 'd MMM yyyy', { locale: ptBR });

export function goalAmount(goal: Goal) {
  const [singular, plural] = goalUnits[goal.metric];
  return `${goal.current.toLocaleString('pt-BR')} de ${goal.target.toLocaleString('pt-BR')} ${
    goal.target === 1 ? singular : plural
  }`;
}

export function GoalCard({
  goal,
  onEdit,
  onArchive,
  onDelete,
}: {
  goal: Goal;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const scope = goal.collectionName ?? (goal.mediaType ? categoryLabels[goal.mediaType] : null);
  return (
    <article className={`goal-card state-${goal.state}`}>
      <GoalRing value={goal.current / goal.target} />
      <div className="goal-card-body">
        <div className="goal-card-heading">
          <h3>{goal.name}</h3>
          <span className={`goal-state state-${goal.state}`}>{goalStateLabels[goal.state]}</span>
        </div>
        <p className="goal-amount">{goalAmount(goal)}</p>
        <p className="goal-meta">
          {[
            scope,
            goal.endsOn
              ? `${date(goal.startsOn)} – ${date(goal.endsOn)}`
              : `Desde ${date(goal.startsOn)}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {goal.description && <p className="goal-description">{goal.description}</p>}
      </div>
      {onEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="goal-menu" aria-label={`Opções da meta ${goal.name}`}>
              <MoreHorizontal size={15} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil size={13} />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onArchive}>
              {goal.state === 'archived' ? <ArchiveRestore size={13} /> : <Archive size={13} />}
              {goal.state === 'archived' ? 'Desarquivar' : 'Arquivar'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete}>
              <Trash2 size={13} />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </article>
  );
}
