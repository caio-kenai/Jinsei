import type { CatalogResult } from '@jinsei/contracts';

export interface CatalogProvider {
  readonly id: 'wikidata' | 'igdb';
  readonly enabled: boolean;
  search(query: string): Promise<CatalogResult[]>;
  details(externalId: string): Promise<CatalogResult>;
}

export class ProviderCache {
  private readonly cache = new Map<string, { expiresAt: number; value: CatalogResult[] }>();
  private queue: Promise<unknown> = Promise.resolve();
  async get(key: string, loader: () => Promise<CatalogResult[]>) {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const operation = this.queue.then(async () => {
      const repeated = this.cache.get(key);
      if (repeated && repeated.expiresAt > Date.now()) return repeated.value;
      const value = await loader();
      if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, { value, expiresAt: Date.now() + 600000 });
      await new Promise((resolve) => setTimeout(resolve, 300));
      return value;
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}

export async function providerFetch(url: URL | string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: { 'User-Agent': 'Jinsei/0.1 (https://github.com/caio-kenai/Jinsei)', ...init.headers },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
  return response.json();
}
