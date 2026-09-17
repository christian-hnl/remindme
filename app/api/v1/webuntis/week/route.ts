import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { jsonError, serverError, toDate } from '@/lib/api';
import { fetchWeekForUser } from '@/lib/webuntis';

export const dynamic = 'force-dynamic';

/** One week of the timetable straight from WebUntis, for browsing back and forth. */
export async function GET(req: Request) {
  try {
    const raw = new URL(req.url).searchParams.get('monday');
    const parsed = raw ? toDate(`${raw}T12:00:00`) : null;
    if (!parsed) return jsonError('Ungültiges Datum');

    // Always snap to the Monday of that week.
    const monday = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() || 7) - 1));

    const weeksAway = Math.round((monday.getTime() - Date.now()) / (7 * 86_400_000));
    if (weeksAway < -60 || weeksAway > 60) return jsonError('Diese Woche liegt zu weit weg.');

    const user = await getCurrentUser();
    const { lessons, schoolName } = await fetchWeekForUser(user.id, monday);
    return NextResponse.json({ monday: monday.toISOString(), schoolName, lessons });
  } catch (error) {
    return serverError('GET /webuntis/week', error, error instanceof Error ? error.message : 'Woche konnte nicht geladen werden');
  }
}
