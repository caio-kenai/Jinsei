// Server-side reads of public API data for rendering and metadata. Never forwards cookies.
const apiBase = () => process.env.API_URL ?? 'http://127.0.0.1:4000';

export async function serverApi<T>(path: string): Promise<T | null> {
  const response = await fetch(`${apiBase()}/api${path}`, { next: { revalidate: 60 } }).catch(
    () => null,
  );
  if (!response?.ok) return null;
  return (await response.json()) as T;
}

/** Public origin of this installation, used for canonical and Open Graph URLs. */
export async function siteUrl() {
  const instance = await serverApi<{ publicUrl: string }>('/instance');
  return instance?.publicUrl ?? 'http://localhost:3000';
}
export const absolute = (origin: string, path: string | null) =>
  path ? new URL(path, origin).toString() : undefined;
