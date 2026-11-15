import { test, expect } from '@playwright/test';
import { createHmac, randomUUID } from 'node:crypto';

const options = {
  baseURL: 'http://127.0.0.1:4000',
  extraHTTPHeaders: { Origin: 'http://localhost:3000' },
};
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function totp(secret: string, step: number) {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of secret) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}
const step = () => Math.floor(Date.now() / 30000);

test('verificação em duas etapas com aplicativo e códigos de recuperação', async ({
  playwright,
}) => {
  const client = await playwright.request.newContext(options);
  const email = `mfa-${randomUUID().slice(0, 8)}@example.test`;
  const password = 'Jinsei testes 1234';
  await client.post('/api/auth/register', { data: { email, password } });
  const setup = await (await client.post('/api/users/me/mfa/setup')).json();
  expect(setup.uri).toContain('otpauth://totp/');
  expect(
    (await client.post('/api/users/me/mfa/enable', { data: { code: '000000' } })).status(),
  ).toBe(401);
  const enabledStep = step();
  const enabled = await (
    await client.post('/api/users/me/mfa/enable', {
      data: { code: totp(setup.secret, enabledStep) },
    })
  ).json();
  expect(enabled.recoveryCodes).toHaveLength(10);
  expect((await (await client.get('/api/users/me')).json()).mfaEnabled).toBe(true);
  expect(await (await client.get('/api/users/me/mfa')).json()).toEqual({
    enabled: true,
    remainingRecoveryCodes: 10,
  });

  // Password alone no longer opens a session.
  const visitor = await playwright.request.newContext(options);
  const first = await (await visitor.post('/api/auth/login', { data: { email, password } })).json();
  expect(first).toEqual({ mfaRequired: true, challenge: expect.any(String) });
  expect((await visitor.get('/api/users/me')).status()).toBe(401);
  // The code already used to enable cannot be replayed.
  expect(
    (
      await visitor.post('/api/auth/login/mfa', {
        data: { challenge: first.challenge, code: totp(setup.secret, enabledStep) },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await visitor.post('/api/auth/login/mfa', {
        data: { challenge: first.challenge, code: enabled.recoveryCodes[0] },
      })
    ).status(),
  ).toBe(200);
  expect((await visitor.get('/api/users/me')).status()).toBe(200);
  expect((await (await client.get('/api/users/me/mfa')).json()).remainingRecoveryCodes).toBe(9);

  // A recovery code works once; a later authenticator step is accepted.
  const second = await (
    await visitor.post('/api/auth/login', { data: { email, password } })
  ).json();
  expect(
    (
      await visitor.post('/api/auth/login/mfa', {
        data: { challenge: second.challenge, code: enabled.recoveryCodes[0] },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await visitor.post('/api/auth/login/mfa', {
        data: { challenge: second.challenge, code: totp(setup.secret, enabledStep + 1) },
      })
    ).status(),
  ).toBe(200);

  // Five wrong codes end the challenge.
  const third = await (await visitor.post('/api/auth/login', { data: { email, password } })).json();
  for (let attempt = 0; attempt < 5; attempt++)
    await visitor.post('/api/auth/login/mfa', {
      data: { challenge: third.challenge, code: '123456' },
    });
  const blocked = await visitor.post('/api/auth/login/mfa', {
    data: { challenge: third.challenge, code: enabled.recoveryCodes[2] },
  });
  expect(blocked.status()).toBe(401);

  expect(
    (
      await client.post('/api/users/me/mfa/disable', {
        data: { password: 'senha errada', code: enabled.recoveryCodes[3] },
      })
    ).status(),
  ).toBe(401);
  await client.post('/api/users/me/mfa/disable', {
    data: { password, code: enabled.recoveryCodes[3] },
  });
  expect(
    await (await visitor.post('/api/auth/login', { data: { email, password } })).json(),
  ).toEqual({ authenticated: true });
  await client.dispose();
  await visitor.dispose();
});
