import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { removeConnection } from '@/lib/banking/sync';
import { jsonError, serverError } from '@/lib/api';

type Params = { params: { id: string } };

/** Ends the bank session; accounts and already fetched bookings stay. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!(await removeConnection(user.id, params.id))) return jsonError('Verbindung nicht gefunden', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /banking/connections/[id]', error, 'Verbindung konnte nicht getrennt werden');
  }
}
