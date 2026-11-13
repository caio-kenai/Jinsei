'use client';
import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function MediaCover({
  title,
  url,
  large = false,
  layout = 'portrait',
}: {
  title: string;
  url: string | null;
  large?: boolean;
  layout?: 'portrait' | 'landscape';
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const colors = ['#3e5768', '#755562', '#3e635b', '#6c5e48', '#55516f', '#425e78'];
  const hash = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span
      className={cn('cover', large && 'cover-large', layout === 'landscape' && 'cover-landscape')}
      title={!url || failedUrl === url ? `Capa indisponível: ${title}` : undefined}
      style={{ '--cover-color': colors[hash % colors.length] } as CSSProperties}
    >
      {url && failedUrl !== url ? (
        <Image
          src={url}
          alt={`Capa de ${title}`}
          width={large ? 240 : 52}
          height={large ? 320 : 70}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <span className={large ? 'cover-placeholder' : ''} aria-hidden="true">
          {title
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()}
          {large && <small>SEM CAPA</small>}
        </span>
      )}
    </span>
  );
}
