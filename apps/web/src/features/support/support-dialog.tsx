'use client';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type Support = { enabled: false } | { enabled: true; payload: string; key: string };
export function SupportDialog({
  open,
  onOpenChange,
  publicView = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicView?: boolean;
}) {
  const result = useQuery({
    queryKey: ['support'],
    queryFn: () => api<Support>('/support'),
    enabled: open,
    staleTime: 300000,
    retry: false,
  });
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error('Não foi possível copiar. Tente novamente.');
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`donation-dialog ${publicView ? 'public-surface' : ''}`}>
        <Image
          className="donation-logo"
          src="/branding/buy-me-a-monster.png"
          width={2188}
          height={724}
          alt="Buy Me a Monster"
        />
        <DialogTitle className="dialog-title">Um Monster para o próximo capítulo?</DialogTitle>
        <DialogDescription className="dialog-description">
          O Jinsei é gratuito. Se quiser apoiar o desenvolvimento, você pode fazer uma contribuição
          voluntária via Pix.
        </DialogDescription>
        {result.isPending ? (
          <LoaderCircle className="spin" style={{ margin: '20px auto' }} />
        ) : result.error ? (
          <p role="alert" className="error-banner">
            Não foi possível carregar as informações de apoio.
          </p>
        ) : result.data?.enabled ? (
          <>
            <div className="qr-surface">
              <QRCodeSVG
                value={result.data.payload}
                size={200}
                level="M"
                title="QR Code Pix para apoio voluntário"
              />
            </div>
            <div className="donation-copy">
              <Button
                onClick={() => {
                  if (result.data?.enabled) void copy(result.data.payload, 'Pix Copia e Cola');
                }}
              >
                <Copy size={15} />
                Copiar Pix Copia e Cola
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (result.data?.enabled) void copy(result.data.key, 'Chave Pix');
                }}
              >
                Copiar chave Pix
              </Button>
            </div>
          </>
        ) : (
          <p className="muted">O apoio via Pix ainda não foi configurado nesta instalação.</p>
        )}
        <p className="donation-note">
          A contribuição não libera funcionalidades ou vantagens. O pagamento é realizado no seu
          banco; o Jinsei não processa nem confirma transferências.
        </p>
      </DialogContent>
    </Dialog>
  );
}
