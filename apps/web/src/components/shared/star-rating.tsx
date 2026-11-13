'use client';
import '@/app/ratings.css';
import { useState } from 'react';
import { Popover } from 'radix-ui';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function formatStars(value: number | null) {
  if (value === null) return 'Sem avaliação';
  const quarter = Math.round(value * 4);
  const whole = Math.floor(quarter / 4);
  return `${whole || (quarter === 0 ? '0' : '')}${['', '¼', '½', '¾'][quarter % 4]}`;
}
export function StarRating({
  value,
  size = 14,
  showValue = false,
}: {
  value: number | null;
  size?: number;
  showValue?: boolean;
}) {
  return (
    <span
      className={`star-rating ${value === null ? 'unrated' : ''}`}
      role="img"
      aria-label={
        value === null ? 'Sem avaliação' : `${value.toLocaleString('pt-BR')} de 5 estrelas`
      }
      title={value === null ? 'Sem avaliação' : `${formatStars(value)} de 5 estrelas`}
    >
      <span className="rating-stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span className="rating-star" key={index} style={{ width: size, height: size }}>
            <Star size={size} />
            <span
              className="rating-star-fill"
              style={{ width: `${Math.max(0, Math.min(1, (value ?? 0) - index)) * 100}%` }}
            >
              <Star size={size} fill="currentColor" />
            </span>
          </span>
        ))}
      </span>
      {showValue && (
        <span className="star-value" aria-hidden="true">
          {value === null ? '—' : formatStars(value)}
        </span>
      )}
    </span>
  );
}
export function StarRatingInput({
  value,
  onChange,
  label = 'Sua nota',
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
}) {
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value;
  return (
    <div className="star-input">
      <div className="star-input-track" onPointerLeave={() => setPreview(null)}>
        <StarRating value={shown} size={26} />
        <input
          type="range"
          min={0}
          max={5}
          step={0.25}
          value={value ?? 0}
          aria-label={label}
          aria-valuetext={
            value === null ? 'Sem avaliação' : `${value.toLocaleString('pt-BR')} de 5 estrelas`
          }
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(next === 0 ? null : next);
            setPreview(null);
          }}
          onPointerMove={(event) => {
            if (event.buttons) return;
            const box = event.currentTarget.getBoundingClientRect();
            setPreview(
              Math.max(
                0.25,
                Math.min(5, Math.ceil(((event.clientX - box.left) / box.width) * 20) / 4),
              ),
            );
          }}
        />
      </div>
      <span className="star-input-value" aria-live="polite">
        {formatStars(shown)}
        {shown !== null && <small> / 5</small>}
      </span>
      <button
        type="button"
        className="star-clear"
        aria-label={`Limpar ${label.toLowerCase()}`}
        disabled={value === null}
        onClick={() => {
          setPreview(null);
          onChange(null);
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
export function RatingPicker({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value);
      }}
    >
      <Popover.Trigger asChild>
        <button className="rating-trigger" aria-label={label}>
          <StarRating value={value} size={13} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="rating-popover" sideOffset={8} align="start" aria-label={label}>
          <h3>Sua avaliação</h3>
          <p>Escolha de ¼ a 5 estrelas.</p>
          <StarRatingInput value={draft} onChange={setDraft} label={label} />
          <div className="rating-popover-actions">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Salvar nota
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
