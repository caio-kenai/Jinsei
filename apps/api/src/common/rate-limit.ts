import { Throttle } from '@nestjs/throttler';
import { env } from '../config/env';

const windowMs = 60_000;

/** Requests allowed per minute, scaled for automated test runs. */
export function perMinute(limit: number) {
  return { ttl: windowMs, limit: limit * env.THROTTLE_SCALE };
}

export function RateLimit(limit: number) {
  return Throttle({ default: perMinute(limit) });
}
