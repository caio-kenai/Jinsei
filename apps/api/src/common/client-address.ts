import { BlockList, isIPv4 } from 'node:net';
import type { Request } from 'express';

/**
 * The API only receives traffic through the web server (the `/api` proxy and server-side
 * rendering), so addresses on the loopback and private networks are trusted hops.
 */
export const trustedProxies = 'loopback, linklocal, uniquelocal';

const internal = new BlockList();
internal.addSubnet('127.0.0.0', 8, 'ipv4');
internal.addSubnet('10.0.0.0', 8, 'ipv4');
internal.addSubnet('172.16.0.0', 12, 'ipv4');
internal.addSubnet('192.168.0.0', 16, 'ipv4');
internal.addSubnet('169.254.0.0', 16, 'ipv4');
internal.addAddress('::1', 'ipv6');
internal.addSubnet('fc00::', 7, 'ipv6');
internal.addSubnet('fe80::', 10, 'ipv6');

function isInternal(address: string | undefined) {
  if (!address) return false;
  const plain = address.startsWith('::ffff:') ? address.slice(7) : address;
  return internal.check(plain, isIPv4(plain) ? 'ipv4' : 'ipv6');
}

/**
 * Server-side rendering calls the API directly from the web container, without the
 * `X-Forwarded-For` header that the `/api` proxy always adds. Those reads are not a
 * visitor's requests, so they must not spend the rate limit shared by everyone.
 */
export function isServerRendering(request: Request) {
  return !request.headers['x-forwarded-for'] && isInternal(request.socket.remoteAddress);
}
