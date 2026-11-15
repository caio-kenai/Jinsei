'use client';
import Link from 'next/link';
import { appVersion, creatorSupport } from '@jinsei/contracts';
import { Brand } from '@/components/shared/brand';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import '@/app/legal.css';
import { useInstance } from '@/features/instance/use-instance';
import { useT } from '@/i18n/provider';
export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { data: instance } = useInstance();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="about-dialog">
        <Brand compact />
        <DialogTitle className="dialog-title">Jinsei</DialogTitle>
        <span className="about-version">
          {t('Versão {version} · GNU AGPL v3 · Criado por {creator}', {
            version: appVersion,
            creator: creatorSupport.creator,
          })}
        </span>
        {instance && (
          <p className="attribution">
            {instance.name} · {new URL(instance.publicUrl).host}
            {instance.contactEmail && (
              <>
                <br />
                <a href={`mailto:${instance.contactEmail}`}>{t('Contato do operador')}</a>
              </>
            )}
          </p>
        )}
        <DialogDescription className="dialog-description">
          {t(
            'Um lugar para organizar seus jogos, filmes, séries, animes, mangás e livros. Gratuito, open source e feito para acompanhar suas histórias.',
          )}
        </DialogDescription>
        <div className="about-links">
          <a href="https://github.com/caio-kenai/Jinsei" target="_blank" rel="noreferrer">
            {t('Código aberto')}
          </a>
          <Link href="/privacy">{t('Privacidade')}</Link>
          <Link href="/terms">{t('Termos de uso')}</Link>
          <a
            href="https://github.com/caio-kenai/Jinsei/blob/main/ADDITIONAL_TERMS.md"
            target="_blank"
            rel="noreferrer"
          >
            {t('Termos da licença')}
          </a>
        </div>
        <p className="attribution">
          {t(
            'Metadados e imagens de Wikidata, Wikimedia Commons, CheapShark, TVmaze e Open Library. Os créditos de cada obra estão nos seus detalhes.',
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
