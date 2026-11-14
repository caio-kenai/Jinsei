import { ApiError } from './api';

/** Sends one image as multipart form data; the API validates size and real format. */
export async function uploadImage(path: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`/api${path}`, { method: 'PUT', body, credentials: 'include' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof result.message === 'string' ? result.message : 'Não foi possível enviar a imagem',
    );
  return result as { url: string | null };
}
