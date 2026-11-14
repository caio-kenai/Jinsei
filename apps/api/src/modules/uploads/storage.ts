import { createHash, createHmac } from 'node:crypto';
import { env } from '../../config/env';

const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const hmac = (key: Buffer | string, data: string) =>
  createHmac('sha256', key).update(data).digest();

export const storageEnabled = Boolean(
  env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY,
);

/**
 * Minimal S3 client (path-style requests signed with AWS Signature V4). It works with MinIO and
 * other S3-compatible services without adding an SDK to the API.
 */
export async function s3(
  method: 'GET' | 'PUT' | 'DELETE' | 'HEAD',
  key = '',
  body?: Buffer,
  contentType?: string,
) {
  const url = new URL(env.S3_ENDPOINT);
  url.pathname = `/${env.S3_BUCKET}${key ? `/${key.split('/').map(encodeURIComponent).join('/')}` : ''}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const payloadHash = sha256(body ?? '');
  const headers: Record<string, string> = {
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...(contentType ? { 'content-type': contentType } : {}),
  };
  const names = Object.keys(headers).sort();
  const canonical = [
    method,
    url.pathname,
    '',
    names.map((name) => `${name}:${headers[name]}\n`).join(''),
    names.join(';'),
    payloadHash,
  ].join('\n');
  const scope = `${day}/${env.S3_REGION}/s3/aws4_request`;
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${env.S3_SECRET_KEY}`, day), env.S3_REGION), 's3'),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey)
    .update(['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n'))
    .digest('hex');
  // The runtime sets the Host header itself; it is only part of the signature.
  const sent = Object.fromEntries(Object.entries(headers).filter(([name]) => name !== 'host'));
  return fetch(url, {
    method,
    headers: {
      ...sent,
      authorization: `AWS4-HMAC-SHA256 Credential=${env.S3_ACCESS_KEY}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`,
    },
    body: body ? new Uint8Array(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
}

let bucketReady: Promise<void> | null = null;
/** Creates the bucket on first use when the storage service does not have it yet. */
export function ensureBucket() {
  bucketReady ??= (async () => {
    const head = await s3('HEAD');
    if (head.status === 404) {
      const created = await s3('PUT');
      if (!created.ok && created.status !== 409) throw new Error(`Bucket HTTP ${created.status}`);
    } else if (!head.ok) throw new Error(`Bucket HTTP ${head.status}`);
  })().catch((error) => {
    bucketReady = null;
    throw error;
  });
  return bucketReady;
}

/** Image type detected from the file signature; the declared type and extension are ignored. */
export function imageType(data: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
    return 'image/jpeg';
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png';
  if (
    data.subarray(0, 4).toString('ascii') === 'RIFF' &&
    data.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'image/webp';
  return null;
}
