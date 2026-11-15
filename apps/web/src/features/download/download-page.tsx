'use client';
import { useState, useSyncExternalStore, type ComponentType } from 'react';
import { Check, Copy, Download, ShieldCheck, Smartphone } from 'lucide-react';
import { FaAndroid, FaApple, FaLinux, FaWindows } from 'react-icons/fa6';
import { toast } from 'sonner';
import { PublicFooter, PublicHeader } from '@/features/presentation/public-navigation';
import { useT } from '@/i18n/provider';
import { msg } from '@/i18n/config';
import { cn } from '@/lib/utils';

const RELEASES = 'https://github.com/caio-kenai/Jinsei/releases';
const asset = (file: string) => `${RELEASES}/latest/download/${file}`;

type Platform = 'windows' | 'macos' | 'linux' | 'android';
const platforms: {
  id: Platform;
  name: string;
  detail: string;
  Icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  color: string;
  files: { label: string; file: string }[];
}[] = [
  {
    id: 'windows',
    name: 'Windows',
    detail: msg('Windows 10 ou mais recente, 64 bits'),
    Icon: FaWindows,
    color: '#0078d4',
    files: [{ label: msg('Instalador (.exe)'), file: 'Jinsei-windows-x64-setup.exe' }],
  },
  {
    id: 'macos',
    name: 'macOS',
    detail: msg('macOS 11 ou mais recente, Intel e Apple Silicon'),
    Icon: FaApple,
    color: 'var(--platform-apple)',
    files: [{ label: msg('Imagem de disco (.dmg)'), file: 'Jinsei-macos-universal.dmg' }],
  },
  {
    id: 'linux',
    name: 'Linux',
    detail: msg('64 bits, com WebKitGTK'),
    Icon: FaLinux,
    color: '#e8a400',
    files: [
      { label: 'AppImage', file: 'Jinsei-linux-x86_64.AppImage' },
      { label: msg('Pacote .deb'), file: 'Jinsei-linux-amd64.deb' },
    ],
  },
  {
    id: 'android',
    name: 'Android',
    detail: msg('Android 8 ou mais recente'),
    Icon: FaAndroid,
    color: '#2fbf71',
    files: [{ label: msg('Aplicativo (.apk)'), file: 'Jinsei-android.apk' }],
  },
];

const subscribe = () => () => undefined;

function detectPlatform(): Platform | null {
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) return 'android';
  if (/Windows/i.test(agent)) return 'windows';
  if (/Mac OS X|Macintosh/i.test(agent) && !/iPhone|iPad/i.test(agent)) return 'macos';
  if (/Linux/i.test(agent)) return 'linux';
  return null;
}

export function DownloadPage() {
  const t = useT();
  const platform = useSyncExternalStore(subscribe, detectPlatform, () => null);
  const server = useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => '',
  );
  const [copied, setCopied] = useState(false);
  async function copyServer() {
    try {
      await navigator.clipboard.writeText(server);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(t('Não foi possível copiar. Tente novamente.'));
    }
  }
  const ordered = platform
    ? [...platforms].sort((a, b) => Number(b.id === platform) - Number(a.id === platform))
    : platforms;
  return (
    <div className="public-surface download-site">
      <PublicHeader />
      <main className="marketing-container download-page">
        <header className="download-hero">
          <span className="landing-eyebrow">{t('APPS DO JINSEI')}</span>
          <h1>{t('Suas histórias no computador e no celular.')}</h1>
          <p>
            {t(
              'Os apps abrem o mesmo Jinsei da web, com a sua conta e os seus dados no servidor. Basta entrar uma vez.',
            )}
          </p>
          {server && (
            <div className="download-server">
              <span>{t('Ao abrir o app, use este servidor:')}</span>
              <button type="button" onClick={() => void copyServer()}>
                <strong>{server}</strong>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span className="sr-only">{t('Copiar endereço do servidor')}</span>
              </button>
            </div>
          )}
        </header>
        <section className="download-grid" aria-label={t('Plataformas')}>
          {ordered.map(({ id, name, detail, Icon, color, files }) => (
            <article
              key={id}
              className={cn('download-card', id === platform && 'is-recommended')}
              style={{ '--platform': color } as React.CSSProperties}
            >
              <span className="download-icon">
                <Icon size={24} aria-hidden />
              </span>
              <div>
                <h2>{name}</h2>
                {id === platform && <em>{t('Recomendado para este dispositivo')}</em>}
                <p>{t(detail)}</p>
              </div>
              <div className="download-files">
                {files.map(({ label, file }) => (
                  <a key={file} className="download-button" href={asset(file)} rel="noreferrer">
                    <Icon size={18} aria-hidden />
                    <span>
                      <small>{t('Baixar para {platform}', { platform: name })}</small>
                      {t(label)}
                    </span>
                    <Download size={15} className="download-button-arrow" />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </section>
        <section className="download-notes">
          <div>
            <ShieldCheck size={18} />
            <p>
              {t(
                'Os instaladores ainda não têm assinatura digital paga. Na primeira abertura, o Windows pode mostrar “O Windows protegeu o computador” (clique em Mais informações → Executar assim mesmo) e o macOS pode pedir para abrir pelo menu Ajustes → Privacidade e Segurança.',
              )}
            </p>
          </div>
          <div>
            <Smartphone size={18} />
            <p>
              {t(
                'No Android, permita a instalação pelo navegador quando o sistema pedir. O app não está na Play Store e é atualizado baixando o APK novo.',
              )}
            </p>
          </div>
          <p className="download-links">
            <a href={`${RELEASES}/latest`} target="_blank" rel="noreferrer">
              {t('Notas da versão')}
            </a>
            <a href={asset('SHA256SUMS-apps')} rel="noreferrer">
              {t('Somas de verificação (SHA-256)')}
            </a>
            <a
              href="https://github.com/caio-kenai/Jinsei/blob/main/docs/APPS.md"
              target="_blank"
              rel="noreferrer"
            >
              {t('Como compilar os apps')}
            </a>
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
