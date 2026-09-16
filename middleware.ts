import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

/**
 * Optional password protection for self-hosting: set APP_PASSWORD (and optionally
 * APP_USERNAME, default "admin") to require HTTP Basic Auth. The iCal feed is exempt
 * because it validates its own token (calendar apps can't do Basic Auth reliably).
 * Env keys are built dynamically so Next.js reads them at runtime instead of inlining.
 */
export function middleware(req: NextRequest) {
  const password = process.env['APP_' + 'PASSWORD'];
  if (!password || req.nextUrl.pathname === '/api/v1/calendar/ical') return NextResponse.next();

  const expectedUser = process.env['APP_' + 'USERNAME'] || 'admin';
  const header = req.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(':');
      if (sep > -1 && decoded.slice(0, sep) === expectedUser && decoded.slice(sep + 1) === password) {
        return NextResponse.next();
      }
    } catch {
      // Malformed header → fall through to 401.
    }
  }

  return new NextResponse('Authentifizierung erforderlich', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="LifeTracker", charset="UTF-8"' },
  });
}
