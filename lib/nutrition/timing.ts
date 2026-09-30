import type { MealSlot, NutritionSettingsData, TrainingType } from './types';
import { TRAINING_LABELS, TRAINING_SHORT } from './types';
import { round5, roundUp5, toMinutes, toTime } from './dates';

/**
 * Meal times follow the real timetable: breakfast before the commute, the Jause in the long
 * morning break, lunch in the lunch break (or at home when school ends early), the
 * pre-workout snack an hour before training – which starts once school is out and you are
 * home – and dinner right after training. Cancelled lessons shift everything automatically.
 */

export interface SchoolLesson {
  startTime: string;
  endTime: string;
  isCancelled?: boolean | null;
}

export interface DayTiming {
  hasSchool: boolean;
  schoolStart: string | null;
  schoolEnd: string | null;
  /** End according to the regular timetable, when cancellations made the day shorter. */
  regularEnd: string | null;
  /** Lunch falls into a break at school → it comes from a box. */
  lunchAtSchool: boolean;
  /** Lessons continue after the lunch break. */
  longDay: boolean;
  training: { type: TrainingType; start: string; end: string } | null;
  times: Record<MealSlot, string>;
  notes: string[];
}

type Settings = Pick<NutritionSettingsData, 'trainingDays' | 'trainingTime' | 'trainingMinutes' | 'commuteMinutes' | 'weekendBreakfast'>;

interface Interval {
  start: number;
  end: number;
}

function merge(lessons: SchoolLesson[]): Interval[] {
  const sorted = lessons
    .map((l) => ({ start: toMinutes(l.startTime), end: toMinutes(l.endTime) }))
    .filter((l) => l.end > l.start)
    .sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const l of sorted) {
    const last = out[out.length - 1];
    if (last && l.start <= last.end) last.end = Math.max(last.end, l.end);
    else out.push({ ...l });
  }
  return out;
}

/** Longest break in a window (ties → the earlier one). */
function longestGap(gaps: Interval[], from: number, to: number, minLength: number) {
  return gaps
    .filter((g) => g.start >= from && g.start <= to && g.end - g.start >= minLength)
    .sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start)[0];
}

const H = (h: number, m = 0) => h * 60 + m;

export function computeDayTiming(lessons: SchoolLesson[], weekday: number, settings: Settings): DayTiming {
  const commute = settings.commuteMinutes;
  const blocks = merge(lessons.filter((l) => !l.isCancelled));
  const regular = merge(lessons);
  const hasSchool = blocks.length > 0;
  const schoolStart = hasSchool ? blocks[0].start : null;
  const schoolEnd = hasSchool ? blocks[blocks.length - 1].end : null;
  const regularEnd = regular.length ? regular[regular.length - 1].end : null;
  const gaps: Interval[] = blocks.slice(1).map((b, i) => ({ start: blocks[i].end, end: b.start }));
  const notes: string[] = [];

  // Breakfast: 25 minutes before leaving – enough for a 5-minute breakfast without stress.
  const breakfast = schoolStart !== null ? Math.max(H(5, 30), Math.floor((schoolStart - commute - 25) / 5) * 5) : toMinutes(settings.weekendBreakfast);

  // Lunch: the lunch break when there is one, otherwise at home after school.
  let lunch: number;
  let lunchAtSchool = false;
  let longDay = false;
  const lunchBreak = hasSchool ? longestGap(gaps, H(11, 15), H(14, 30), 25) : undefined;
  if (lunchBreak) {
    lunch = lunchBreak.start + 5;
    lunchAtSchool = true;
    longDay = true;
  } else if (schoolEnd !== null && schoolEnd <= H(14, 30)) {
    lunch = Math.max(H(11, 45), schoolEnd + commute + 5);
  } else if (hasSchool) {
    // Straight through into the afternoon: eat in the longest break after late morning.
    const any = longestGap(gaps, H(11, 15), H(15), 5);
    lunch = any ? any.start : H(12, 30);
    lunchAtSchool = true;
    longDay = true;
    notes.push('Kurze Mittagspause – die Box sollte schnell gegessen sein.');
  } else {
    lunch = H(12, 30);
  }

  // Jause: the long morning break – at least 90 minutes before lunch, never the lunch break itself.
  let snack: number;
  const snackLatest = Math.min(H(11, 30), lunch - 90);
  const morningBreak = hasSchool ? longestGap(gaps, H(8, 45), snackLatest, 5) : undefined;
  if (morningBreak) snack = morningBreak.start;
  else if (schoolEnd !== null && schoolEnd <= H(11) && schoolEnd + commute <= lunch - 60) snack = schoolEnd + commute;
  else snack = Math.min(breakfast + 180, lunch - 90);

  const type = settings.trainingDays[String(weekday)] ?? 'rest';
  let training: DayTiming['training'] = null;
  let afternoon: number;
  let dinner: number;
  if (type !== 'rest') {
    const preferred = toMinutes(settings.trainingTime);
    // Out of school, home, one hour to digest the pre-workout snack.
    const afterSchool = schoolEnd !== null ? schoolEnd + commute + 60 : 0;
    const start = roundUp5(Math.max(preferred, afterSchool, lunch + 150));
    const end = start + settings.trainingMinutes;
    training = { type, start: toTime(start), end: toTime(end) };
    afternoon = start - 60;
    dinner = Math.max(H(18), roundUp5(end + 30));
  } else {
    afternoon = roundUp5(Math.max(schoolEnd !== null ? schoolEnd + commute : 0, lunch + 180, H(15)));
    dinner = roundUp5(Math.max(H(18, 30), afternoon + 90));
  }

  if (hasSchool && regularEnd !== null && schoolEnd !== null && schoolEnd < regularEnd) {
    notes.unshift(`Entfall – aus schon um ${toTime(schoolEnd)} statt ${toTime(regularEnd)}.`);
  }
  if (!hasSchool && regular.length > 0) notes.unshift('Heute entfällt der Unterricht.');
  if (longDay && schoolEnd !== null) notes.push(`Langer Schultag bis ${toTime(schoolEnd)} – Mittagessen aus der Box um ${toTime(round5(lunch))}.`);
  if (training) notes.push(`${TRAINING_SHORT[training.type]}-Training um ${training.start} → Pre-Workout um ${toTime(afternoon)}.`);

  return {
    hasSchool,
    schoolStart: schoolStart !== null ? toTime(schoolStart) : null,
    schoolEnd: schoolEnd !== null ? toTime(schoolEnd) : null,
    regularEnd: regularEnd !== null && schoolEnd !== null && regularEnd > schoolEnd ? toTime(regularEnd) : null,
    lunchAtSchool,
    longDay,
    training,
    times: {
      breakfast: toTime(breakfast),
      snack: toTime(round5(snack)),
      lunch: toTime(round5(lunch)),
      afternoon: toTime(afternoon),
      dinner: toTime(dinner),
    },
    notes,
  };
}

/** One line for the "Heute" hint, e.g. "Heute OK-Training → Pre-Workout um 15:00". */
export function trainingHint(timing: DayTiming) {
  if (!timing.training) return 'Heute Ruhetag – mehr Gemüse und Fett, weniger Kohlenhydrate.';
  return `Heute ${TRAINING_SHORT[timing.training.type]}-Training (${TRAINING_LABELS[timing.training.type]}) um ${timing.training.start} → Pre-Workout um ${timing.times.afternoon}`;
}
