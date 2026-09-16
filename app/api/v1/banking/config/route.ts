import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { isValidPrivateKey } from '@/lib/banking/enablebanking';
import { cleanString, jsonError, readJson, requestOrigin, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function describe(userId: string, req: Request) {
  const config = await db.bankingConfig.findUnique({ where: { userId } });
  return {
    appId: config?.appId ?? null,
    hasPrivateKey: !!config?.privateKey,
    redirectUrl: config?.redirectUrl ?? null,
    defaultRedirectUrl: `${requestOrigin(req)}/api/v1/banking/callback`,
    fromEnvironment: !!(process.env['ENABLE_BANKING_APP_ID'] && process.env['ENABLE_BANKING_PRIVATE_KEY']),
  };
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    return NextResponse.json(await describe(user.id, req));
  } catch (error) {
    return serverError('GET /banking/config', error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await readJson(req);

    const appId = body.appId !== undefined ? cleanString(body.appId, 100) || null : undefined;
    const redirectUrl = body.redirectUrl !== undefined ? cleanString(body.redirectUrl, 500) || null : undefined;
    let privateKey: string | null | undefined;
    if (body.clearPrivateKey) privateKey = null;
    else if (typeof body.privateKey === 'string' && body.privateKey.trim()) {
      privateKey = body.privateKey.trim();
      if (!isValidPrivateKey(privateKey)) return jsonError('Das ist keine gültige Schlüssel-Datei (.pem mit privatem RSA-Schlüssel).');
    }
    if (redirectUrl && !/^https?:\/\//i.test(redirectUrl)) return jsonError('Die Redirect-URL muss mit http:// oder https:// beginnen.');

    await db.bankingConfig.upsert({
      where: { userId: user.id },
      create: { userId: user.id, appId: appId ?? null, privateKey: privateKey ?? null, redirectUrl: redirectUrl ?? null },
      update: {
        ...(appId !== undefined && { appId }),
        ...(privateKey !== undefined && { privateKey }),
        ...(redirectUrl !== undefined && { redirectUrl }),
      },
    });
    return NextResponse.json(await describe(user.id, req));
  } catch (error) {
    return serverError('POST /banking/config', error, 'Einstellungen konnten nicht gespeichert werden');
  }
}
