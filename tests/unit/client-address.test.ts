import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { isServerRendering } from '../../apps/api/src/common/client-address';

const request = (remoteAddress: string, forwardedFor?: string) =>
  ({
    headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
    socket: { remoteAddress },
  }) as unknown as Request;

describe('rate limit per visitor', () => {
  it('skips server-side rendering calls from the web container', () => {
    expect(isServerRendering(request('172.18.0.4'))).toBe(true);
    expect(isServerRendering(request('::ffff:127.0.0.1'))).toBe(true);
    expect(isServerRendering(request('::1'))).toBe(true);
  });
  it('counts every request forwarded for a visitor', () => {
    expect(isServerRendering(request('172.18.0.4', '203.0.113.9'))).toBe(false);
  });
  it('never trusts a public address without the proxy', () => {
    expect(isServerRendering(request('203.0.113.9'))).toBe(false);
  });
});
