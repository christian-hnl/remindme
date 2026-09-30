import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { syncWebUntisData } from '@/lib/webuntis';
import { jsonError } from '@/lib/api';
import { invalidateNutritionReminders } from '@/lib/nutrition/server/reminders';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getCurrentUser();
    const result = await syncWebUntisData(user.id);
    // Meal times follow the timetable – a new plan (or a cancellation) moves the reminders.
    await invalidateNutritionReminders(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('WebUntis sync error:', error);
    return jsonError(error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen', 502);
  }
}
