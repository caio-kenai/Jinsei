import { NextResponse, type NextRequest } from 'next/server';

// Transport only: all authentication, authorization and business rules remain in NestJS.
// Read the destination at runtime so the same container can serve any installation.
export function proxy(request: NextRequest) {
  const destination = new URL(process.env.API_URL ?? 'http://127.0.0.1:4000');
  destination.pathname = request.nextUrl.pathname;
  destination.search = request.nextUrl.search;
  return NextResponse.rewrite(destination);
}
export const config = { matcher: '/api/:path*' };
