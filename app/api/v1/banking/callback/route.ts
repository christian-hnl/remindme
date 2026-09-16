import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { completeConnection } from '@/lib/banking/sync';
import { requestOrigin } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** The bank (via Enable Banking) redirects here after the user approved access. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const back = (query: Record<string, string>) => NextResponse.redirect(`${requestOrigin(req)}/?${new URLSearchParams(query)}`);

  if (params.get('error')) {
    return back({ bank: 'error', message: params.get('error_description') || 'Die Freigabe bei der Bank wurde abgebrochen.' });
  }
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) return back({ bank: 'error', message: 'Die Antwort der Bank war unvollständig.' });

  try {
    const user = await getCurrentUser();
    const result = await completeConnection(user.id, state, code);
    return back({ bank: 'connected', created: String(result.created) });
  } catch (error) {
    console.error('Banking callback failed:', error);
    return back({ bank: 'error', message: error instanceof Error ? error.message : 'Verbindung fehlgeschlagen' });
  }
}
