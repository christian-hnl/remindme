import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { jsonError, serverError } from '@/lib/api';
import { LogError, deleteLog } from '@/lib/nutrition/server/logs';
import { loadContext } from '@/lib/nutrition/server/week';
import { invalidateNutritionReminders } from '@/lib/nutrition/server/reminders';

type Params = { params: { id: string } };

/** Undoes a tick. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const result = await deleteLog(await loadContext(user.id), params.id);
    await invalidateNutritionReminders(user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LogError) return jsonError(error.message, 404);
    return serverError('DELETE /nutrition/logs/[id]', error, 'Eintrag konnte nicht entfernt werden');
  }
}
