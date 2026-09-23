import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';
import { connectWithToken, extractToken, requestLoginMail, syncVmm, toSafeVmmConfigWithGroups } from '@/lib/vmm';

export const dynamic = 'force-dynamic';

const withGroups = async (userId: string) => {
  const config = await db.vmmConfig.findUnique({ where: { userId }, include: { groups: { orderBy: { name: 'asc' } } } });
  return toSafeVmmConfigWithGroups(config);
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json(await withGroups(user.id));
  } catch (error) {
    return serverError('GET /vmm', error);
  }
}

/** action: mail (send login link) · connect (redeem token) · sync (fetch marks) */
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const user = await getCurrentUser();
    const email = cleanString(body.email, 120);

    const config = await db.vmmConfig.upsert({
      where: { userId: user.id },
      update: email ? { email } : {},
      create: { userId: user.id, email: email ?? null },
    });

    if (body.action === 'mail') {
      const address = email ?? config.email;
      if (!address || !address.includes('@')) return jsonError('Bitte deine Schul-E-Mail eintragen');
      await requestLoginMail(address);
      return NextResponse.json({ success: true, message: `Login-Link an ${address} geschickt – schau in dein Postfach.` });
    }

    if (body.action === 'connect') {
      const token = extractToken(String(body.token ?? ''));
      if (!token) return jsonError('Das sieht nicht nach dem Link aus der E-Mail aus');
      await connectWithToken(user.id, token);
      const result = await syncVmm(user.id);
      return NextResponse.json({ success: true, message: `Verbunden – ${result.groups} Fächer mit ${result.marks} Noten geladen.`, config: await withGroups(user.id) });
    }

    if (body.action === 'sync') {
      const result = await syncVmm(user.id);
      return NextResponse.json({ success: true, message: `${result.groups} Fächer, ${result.marks} Noten aktualisiert.`, config: await withGroups(user.id) });
    }

    return NextResponse.json({ success: true, config: await withGroups(user.id) });
  } catch (error) {
    return serverError('POST /vmm', error, error instanceof Error ? error.message : 'View My Marks konnte nicht verbunden werden');
  }
}

/** Forgets the session; the stored marks stay readable. */
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    await db.vmmConfig.updateMany({ where: { userId: user.id }, data: { sessionId: null, csrfToken: null, username: null, role: null } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /vmm', error, 'Verbindung konnte nicht getrennt werden');
  }
}
