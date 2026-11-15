'use client';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { creatorSupport } from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useT } from '@/i18n/provider';

export function SupportDialog({
  open,
  onOpenChange,
  publicView = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicView?: boolean;
}) {
  const t = useT();
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('{label} copiado', { label }));
    } catch {
      toast.error(t('Não foi possível copiar. Tente novamente.'));
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`donation-dialog ${publicView ? 'public-surface' : ''}`}>
        <Image
          className="donation-logo"
          src="/branding/buy-me-a-monster.png"
          width={2172}
          height={724}
          alt={t('Buy Me a Monster')}
        />
        <DialogTitle className="dialog-title">
          {t('Um Monster para o próximo capítulo?')}
        </DialogTitle>
        <DialogDescription className="dialog-description">
          {t(
            'O Jinsei é gratuito e open source. Se quiser apoiar o desenvolvimento, faça um Pix de qualquer valor para',
          )}{' '}
          {creatorSupport.creator}
          {t(', criador do projeto.')}
        </DialogDescription>
        <div className="qr-surface">
          <QRCodeSVG
            value={creatorSupport.pixPayload}
            size={200}
            level="M"
            title={t('QR Code Pix para apoio voluntário')}
          />
        </div>
        <div className="donation-copy">
          <Button onClick={() => void copy(creatorSupport.pixPayload, t('Pix Copia e Cola'))}>
            <Copy size={15} />
            {t('Copiar Pix Copia e Cola')}
          </Button>
          <Button
            variant="outline"
            onClick={() => void copy(creatorSupport.pixKey, t('Chave Pix'))}
          >
            {t('Copiar chave Pix')}
          </Button>
        </div>
        <p className="donation-note">
          {t(
            'Você escolhe o valor no aplicativo do seu banco. A contribuição é opcional, vai diretamente para o criador do Jinsei em qualquer servidor e não libera funcionalidades. O Jinsei não processa nem confirma transferências.',
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
