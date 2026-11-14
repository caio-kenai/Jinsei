import { config } from 'dotenv';
import { z } from 'zod';

config({ path: '../../.env', quiet: true });
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default('127.0.0.1'),
  INSTANCE_NAME: z.string().min(1).max(80).default('Jinsei'),
  WEB_ORIGIN: z
    .url()
    .default('http://localhost:3000')
    .refine((value) => {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash
      );
    }, 'Informe somente a origem HTTP/HTTPS')
    .transform((value) => new URL(value).origin),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  IGDB_ENABLED: z.enum(['true', 'false']).default('false'),
  IGDB_CLIENT_ID: z.string().default(''),
  IGDB_CLIENT_SECRET: z.string().default(''),
  TMDB_READ_TOKEN: z.string().default(''),
  S3_ENDPOINT: z.string().default(''),
  S3_BUCKET: z.string().default(''),
  S3_REGION: z.string().default('us-east-1'),
  // Local development falls back to the MinIO root credentials of Docker Compose.
  S3_ACCESS_KEY: z.string().default(process.env.MINIO_ROOT_USER ?? ''),
  S3_SECRET_KEY: z.string().default(process.env.MINIO_ROOT_PASSWORD ?? ''),
  // Multiplies every rate limit; only raise it for automated test runs.
  THROTTLE_SCALE: z.coerce.number().int().min(1).max(1000).default(1),
  DONATION_PIX_PAYLOAD: z.string().default(''),
  DONATION_PIX_KEY: z.string().default(''),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Configuração de ambiente inválida: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
  );
}
export const env = parsed.data;
if (env.NODE_ENV === 'production' && env.THROTTLE_SCALE !== 1) {
  throw new Error('THROTTLE_SCALE não pode ser alterado em produção');
}
if (
  env.NODE_ENV === 'production' &&
  !env.WEB_ORIGIN.startsWith('https://') &&
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.WEB_ORIGIN).hostname)
) {
  throw new Error('WEB_ORIGIN deve usar HTTPS em produção');
}
