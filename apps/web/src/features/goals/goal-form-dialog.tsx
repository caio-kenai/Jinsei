'use client';
import { useState } from 'react';
import { endOfMonth, endOfYear, format, startOfMonth, startOfYear } from 'date-fns';
import {
  categoryLabels,
  goalInputSchema,
  goalMetricLabels,
  goalMetrics,
  goalScopes,
  goalUnits,
  type Goal,
  type GoalInput,
  type GoalMetric,
  type MediaType,
} from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCollections } from '@/features/collections/use-collections';

const iso = (date: Date) => format(date, 'yyyy-MM-dd');
const presets = [
  { label: 'Este ano', range: () => [startOfYear(new Date()), endOfYear(new Date())] as const },
  { label: 'Este mês', range: () => [startOfMonth(new Date()), endOfMonth(new Date())] as const },
  { label: 'Sem prazo', range: () => [new Date(), null] as const },
];

export function GoalFormDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Goal;
  pending: boolean;
  onSubmit: (input: GoalInput) => void;
}) {
  const [metric, setMetric] = useState<GoalMetric>(initial?.metric ?? 'titles_completed');
  const [mediaType, setMediaType] = useState<MediaType | ''>(initial?.mediaType ?? '');
  const [collectionId, setCollectionId] = useState(initial?.collectionId ?? '');
  const [startsOn, setStartsOn] = useState(initial?.startsOn ?? iso(startOfYear(new Date())));
  const [endsOn, setEndsOn] = useState(initial?.endsOn ?? iso(endOfYear(new Date())));
  const [error, setError] = useState('');
  const collections = useCollections();
  const scopes = goalScopes[metric];
  const collectionGoal = metric === 'collection_completed';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-dialog">
        <DialogTitle className="dialog-title">{initial ? 'Editar meta' : 'Nova meta'}</DialogTitle>
        <DialogDescription className="dialog-description">
          O progresso é calculado automaticamente a partir da sua biblioteca.
        </DialogDescription>
        <form
          className="dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            const parsed = goalInputSchema.safeParse({
              name: fields.get('name'),
              description: fields.get('description'),
              metric,
              mediaType: scopes.includes(mediaType as MediaType) ? mediaType : null,
              collectionId: collectionGoal ? collectionId || null : null,
              target: collectionGoal ? 1 : Number(fields.get('target')),
              startsOn,
              endsOn: endsOn || null,
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? 'Revise os dados da meta');
              return;
            }
            setError('');
            onSubmit(parsed.data);
          }}
        >
          <label className="field">
            Nome
            <Input
              name="name"
              required
              autoFocus
              maxLength={80}
              defaultValue={initial?.name}
              placeholder="Concluir 20 jogos em 2026"
            />
          </label>
          <div className="form-grid">
            <label className="field">
              Objetivo
              <Select
                value={metric}
                onChange={(event) => {
                  const next = event.target.value as GoalMetric;
                  setMetric(next);
                  if (!goalScopes[next].includes(mediaType as MediaType))
                    setMediaType(goalScopes[next].length === 1 ? goalScopes[next][0] : '');
                }}
              >
                {goalMetrics.map((value) => (
                  <option key={value} value={value}>
                    {goalMetricLabels[value]}
                  </option>
                ))}
              </Select>
            </label>
            {collectionGoal ? (
              <label className="field">
                Coleção
                <Select
                  required
                  value={collectionId}
                  onChange={(event) => setCollectionId(event.target.value)}
                >
                  <option value="">Escolha uma coleção</option>
                  {collections.data?.collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </Select>
                <small>A meta acompanha os títulos concluídos da coleção.</small>
              </label>
            ) : (
              <label className="field">
                Quantidade ({goalUnits[metric][1]})
                <Input
                  name="target"
                  type="number"
                  min={1}
                  max={1000000}
                  required
                  defaultValue={initial?.target ?? 10}
                />
              </label>
            )}
          </div>
          {scopes.length > 1 && (
            <label className="field">
              Categoria
              <Select
                value={mediaType}
                onChange={(event) => setMediaType(event.target.value as MediaType | '')}
              >
                <option value="">Todas as categorias</option>
                {scopes.map((type) => (
                  <option key={type} value={type}>
                    {categoryLabels[type]}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <div className="goal-presets" role="group" aria-label="Períodos rápidos">
            {presets.map((preset) => (
              <button
                type="button"
                key={preset.label}
                className="toolbar-button"
                onClick={() => {
                  const [from, to] = preset.range();
                  setStartsOn(iso(from));
                  setEndsOn(to ? iso(to) : '');
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label className="field">
              Início
              <Input
                type="date"
                required
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
            </label>
            <label className="field">
              Prazo
              <Input
                type="date"
                min={startsOn}
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
              />
              <small>Deixe em branco para uma meta sem prazo.</small>
            </label>
          </div>
          <label className="field">
            Descrição
            <Textarea
              name="description"
              rows={2}
              maxLength={500}
              defaultValue={initial?.description}
              placeholder="Por que esta meta importa? (opcional)"
            />
          </label>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-footer">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {initial ? 'Salvar meta' : 'Criar meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
