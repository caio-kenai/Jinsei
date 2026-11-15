import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { env } from '../../config/env';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(data: Buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(text: string) {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of text.replace(/=+$/, '').toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid base32');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

const STEP_SECONDS = 30;
export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

/** RFC 6238 code (HMAC-SHA1, 6 digits) for a time step. */
export function totp(secret: string, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

/** Returns the matching time step (accepting one step of clock drift), or null. */
export function matchStep(secret: string, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const step = currentStep(now);
  for (const candidate of [step - 1, step, step + 1]) {
    const expected = Buffer.from(totp(secret, candidate));
    if (timingSafeEqual(expected, Buffer.from(code))) return candidate;
  }
  return null;
}

export const newSecret = () => base32Encode(randomBytes(20));

export function otpauthUri(secret: string, account: string) {
  const issuer = env.INSTANCE_NAME;
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

const key = () => createHash('sha256').update(env.SECRET_KEY).digest();

/** Encrypts secrets with AES-256-GCM when SECRET_KEY is configured. */
export function seal(secret: string) {
  if (!env.SECRET_KEY) return `plain:${secret}`;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')}`;
}

export function unseal(stored: string) {
  if (stored.startsWith('plain:')) return stored.slice(6);
  if (!stored.startsWith('v1:') || !env.SECRET_KEY)
    throw new Error('SECRET_KEY ausente para ler a verificação em duas etapas');
  const raw = Buffer.from(stored.slice(3), 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

/** Ten one-time codes like "k7m2-9qxp", stored only as hashes. */
export function recoveryCodes() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => {
    const bytes = randomBytes(8);
    const text = [...bytes].map((byte) => chars[byte % chars.length]).join('');
    return `${text.slice(0, 4)}-${text.slice(4)}`;
  });
}
export const hashRecoveryCode = (code: string) =>
  createHash('sha256').update(code.trim().toLowerCase()).digest('hex');
