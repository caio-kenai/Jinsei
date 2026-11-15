import { translate } from '@/i18n/config';
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof result.message === 'string'
        ? translate(result.message)
        : translate('Não foi possível concluir a operação'),
    );
  return result as T;
}
export const jsonBody = (body: unknown) => JSON.stringify(body);
