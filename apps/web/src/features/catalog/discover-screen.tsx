'use client';
import { useState } from 'react';
import { categoryLabels, mediaTypes, type MediaType, type CatalogResult } from '@jinsei/contracts';
import { Select } from '@/components/ui/input';
import { CatalogSearch } from './catalog-search';
import { AddEntryDialog } from '@/features/library/add-entry-dialog';
import { EntryDetails } from '@/features/library/entry-details';
export function DiscoverScreen() {
  const [mediaType, setMediaType] = useState<MediaType>('games');
  const [item, setItem] = useState<CatalogResult>();
  const [add, setAdd] = useState(false);
  const [detail, setDetail] = useState<string>();
  return (
    <div className="discover-page" style={{ maxWidth: 850 }}>
      <header className="page-heading">
        <span className="eyebrow" style={{ marginBottom: 8 }}>
          O PRÓXIMO CAPÍTULO
        </span>
        <h1>O que você quer descobrir?</h1>
        <p>Encontre histórias para viver, jogar e lembrar.</p>
      </header>
      <label className="field" style={{ maxWidth: 200 }}>
        Categoria
        <Select
          value={mediaType}
          onChange={(event) => setMediaType(event.target.value as MediaType)}
        >
          {mediaTypes.map((type) => (
            <option value={type} key={type}>
              {categoryLabels[type]}
            </option>
          ))}
        </Select>
      </label>
      <CatalogSearch
        key={mediaType}
        mediaType={mediaType}
        onSelect={(value) => {
          setItem(value);
          setAdd(true);
        }}
        onManual={() => {
          setItem(undefined);
          setAdd(true);
        }}
      />
      <AddEntryDialog
        key={item?.id ?? item?.externalId ?? 'manual'}
        open={add}
        onOpenChange={setAdd}
        mediaType={mediaType}
        initialItem={item}
        onAdded={(entry) => setDetail(entry.id)}
      />
      {detail && <EntryDetails id={detail} onClose={() => setDetail(undefined)} />}
    </div>
  );
}
