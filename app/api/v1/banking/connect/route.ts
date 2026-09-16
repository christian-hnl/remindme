import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { startConnection } from '@/lib/banking/sync';
import { EnableBankingError } from '@/lib/banking/enablebanking';
import { cleanString, jsonError, readJson, requestOrigin, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const aspspName = cleanString(body.aspspName, 200);
    const country = (cleanString(body.country, 2) ?? '').toUpperCase();
    if (!aspspName || country.length !== 2) return jsonError('Bitte eine Bank auswählen');

    const user = await getCurrentUser();
    const config = await db.bankingConfig.findUnique({ where: { userId: user.id } });
    const redirectUrl = config?.redirectUrl || `${requestOrigin(req)}/api/v1/banking/callback`;

    const url = await startConnection(user.id, { name: aspspName, country }, redirectUrl);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof EnableBankingError) return jsonError(error.message, error.status || 502);
    return serverError('POST /banking/connect', error, 'Bankverbindung konnte nicht gestartet werden');
  }
}
