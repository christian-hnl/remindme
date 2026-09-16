import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { testUntisConnection } from '@/lib/webuntis';
import { readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await readJson(req);
  const user = await getCurrentUser();
  const stored = await db.webUntisConfig.findUnique({ where: { userId: user.id } });

  // Allow testing with the saved password without re-entering it, as long as the
  // account (server, school, user) is unchanged.
  const sameAccount =
    stored && stored.server === body.server && stored.school === body.school && stored.username === body.username;
  const password = body.password || (sameAccount ? stored.password : null);

  const result = await testUntisConnection({
    server: body.server,
    school: body.school,
    username: body.username,
    password,
    icalUrl: body.icalUrl,
  });
  return NextResponse.json(result);
}
