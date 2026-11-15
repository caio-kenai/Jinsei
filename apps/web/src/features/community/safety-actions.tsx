'use client';
import { msg } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Flag, LoaderCircle, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  reportReasonLabels,
  reportReasons,
  type BlockedUser,
  type ReportInput,
} from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const targetLabels: Record<ReportInput['targetType'], string> = {
  user: 'esta pessoa',
  message: 'esta mensagem',
  club: 'este clube',
  club_post: msg('esta publicação'),
  review: 'esta review',
};

export function useBlocks() {
  return useQuery({
    queryKey: ['community', 'blocks'],
    queryFn: () => api<{ users: BlockedUser[] }>('/community/blocks'),
  });
}

export function useSafetyMutations() {
  const t = useT();
  const client = useQueryClient();
  const refresh = () => void client.invalidateQueries({ queryKey: ['community'] });
  return {
    block: useMutation({
      mutationFn: (userId: string) => api(`/community/blocks/${userId}`, { method: 'POST' }),
      onSuccess: () => {
        toast.success(t('Pessoa bloqueada'));
        refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
    unblock: useMutation({
      mutationFn: (userId: string) => api(`/community/blocks/${userId}`, { method: 'DELETE' }),
      onSuccess: () => {
        toast.success(t('Pessoa desbloqueada'));
        refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  };
}

/** Lets anyone send a report to the instance moderators. */
export function ReportDialog({
  target,
  open,
  onOpenChange,
}: {
  target: Pick<ReportInput, 'targetType' | 'targetId'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const [reason, setReason] = useState<ReportInput['reason']>('spam');
  const [details, setDetails] = useState('');
  const send = useMutation({
    mutationFn: () =>
      api('/community/reports', {
        method: 'POST',
        body: jsonBody({ ...target, reason, details }),
      }),
    onSuccess: () => {
      toast.success(t('Denúncia enviada. Obrigado por ajudar a cuidar da comunidade.'));
      setDetails('');
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="report-dialog">
        <DialogTitle className="dialog-title">
          {t('Denunciar')} {t(targetLabels[target.targetType])}
        </DialogTitle>
        <DialogDescription className="dialog-description">
          {t(
            'A moderação desta instância recebe uma cópia do conteúdo. Quem você denunciou não fica sabendo quem enviou.',
          )}
        </DialogDescription>
        <form
          className="report-form"
          onSubmit={(event) => {
            event.preventDefault();
            send.mutate();
          }}
        >
          <div className="report-reasons" role="radiogroup" aria-label={t('Motivo')}>
            {reportReasons.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={reason === value}
                className={cn('report-reason', reason === value && 'active')}
                onClick={() => setReason(value)}
              >
                {t(reportReasonLabels[value])}
              </button>
            ))}
          </div>
          <label className="field">
            {t('Detalhes (opcional)')}
            <Textarea
              value={details}
              maxLength={1000}
              rows={3}
              placeholder={t('Conte o que aconteceu')}
              onChange={(event) => setDetails(event.target.value)}
            />
          </label>
          <div className="dialog-footer">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancelar')}
            </Button>
            <Button type="submit" variant="destructive" disabled={send.isPending}>
              {send.isPending ? <LoaderCircle size={14} className="spin" /> : <Flag size={14} />}
              {t('Enviar denúncia')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Small button that opens the report dialog for one piece of content. */
export function ReportButton({
  target,
  className,
  label = msg('Denunciar'),
}: {
  target: Pick<ReportInput, 'targetType' | 'targetId'>;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={cn('report-button', className)}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <Flag size={13} />
      </button>
      {open && <ReportDialog target={target} open onOpenChange={setOpen} />}
    </>
  );
}

/** “…” menu with report and block for a person. */
export function UserSafetyMenu({
  userId,
  name,
  blocked = false,
  className,
}: {
  userId: string;
  name: string;
  blocked?: boolean;
  className?: string;
}) {
  const t = useT();
  const [reporting, setReporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { block, unblock } = useSafetyMutations();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn('community-icon-link safety-trigger', className)}
            aria-label={t('Mais opções para {name}', { name })}
          >
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setReporting(true)}>
            <Flag size={14} />
            {t('Denunciar')}
          </DropdownMenuItem>
          {blocked ? (
            <DropdownMenuItem onSelect={() => unblock.mutate(userId)}>
              <ShieldCheck size={14} />
              {t('Desbloquear')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="danger-item" onSelect={() => setConfirming(true)}>
              <Ban size={14} />
              {t('Bloquear')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {reporting && (
        <ReportDialog
          target={{ targetType: 'user', targetId: userId }}
          open
          onOpenChange={setReporting}
        />
      )}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogTitle className="dialog-title">
            {t('Bloquear')} {name}?
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {t(
              'Vocês deixam de ser amigos, não podem trocar mensagens nem se encontrar na busca, e as publicações dessa pessoa somem dos clubes para você. Dá para desbloquear quando quiser.',
            )}
          </DialogDescription>
          <div className="dialog-footer">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t('Cancelar')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => block.mutate(userId, { onSuccess: () => setConfirming(false) })}
              disabled={block.isPending}
            >
              <Ban size={14} />
              {t('Bloquear')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
