import { db } from '@/lib/db';
import { colorForName, findScheduleBlockId } from '@/lib/tasks';
import { guessExamKindFromText } from '@/lib/school';

import { DEMO_DEFAULTS, DEMO_SCHOOL } from '@/lib/untis-defaults';

export { DEMO_DEFAULTS, DEMO_SCHOOL };

export type UntisSource = 'api' | 'ical' | 'demo';

export interface WebUntisSyncResult {
  success: boolean;
  schoolName: string;
  syncedLessonsCount: number;
  syncedHomeworkCount: number;
  syncedExamsCount: number;
  message: string;
  source: UntisSource;
}

export interface UntisTestResult {
  success: boolean;
  message: string;
  source?: UntisSource;
}

interface LessonInput {
  date: Date;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  room: string | null;
  teacher: string | null;
  substitutionNote: string | null;
  isCancelled: boolean;
  externalUntisId: string;
  /** Untis "sg" (student group), or a fallback tag so parallel same-subject lessons stay apart. */
  studentGroup: string | null;
  /** Untis lstype "ex" – an exam period. */
  isExam: boolean;
}

interface HomeworkInput {
  /** Untis subject code or subject name. */
  subject: string;
  title: string;
  description: string | null;
  dueDate: Date;
  estimatedMinutes: number;
  priority: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');
const toUntisDate = (d: Date) => Number(`${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`);
const fromUntisDate = (n: number) => {
  const s = String(n);
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
};
const fromUntisTime = (n: number) => `${pad(Math.floor(n / 100))}:${pad(n % 100)}`;
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const isoWeekday = (d: Date) => d.getDay() || 7;

/** Monday–Friday of the current school week; on weekends the upcoming week. */
export function getSchoolWeek(reference = new Date()) {
  const monday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const weekday = isoWeekday(monday);
  monday.setDate(monday.getDate() - weekday + 1 + (weekday >= 6 ? 7 : 0));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { monday, friday };
}

/** Joins consecutive lessons of the same subject (double periods) into one block. */
function mergeDoubleLessons(lessons: LessonInput[]): LessonInput[] {
  const sorted = [...lessons].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || toMinutes(a.startTime) - toMinutes(b.startTime)
  );
  const merged: LessonInput[] = [];
  for (const lesson of sorted) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.dayOfWeek === lesson.dayOfWeek &&
      prev.subjectCode === lesson.subjectCode &&
      prev.room === lesson.room &&
      prev.isCancelled === lesson.isCancelled &&
      prev.studentGroup === lesson.studentGroup &&
      prev.isExam === lesson.isExam &&
      toMinutes(lesson.startTime) - toMinutes(prev.endTime) <= 15 &&
      toMinutes(lesson.startTime) >= toMinutes(prev.startTime)
    ) {
      prev.endTime = lesson.endTime;
      continue;
    }
    merged.push({ ...lesson });
  }
  return merged;
}

// ---------------------------------------------------------------------------
// WebUntis JSON-RPC 2.0
// ---------------------------------------------------------------------------

function normalizeServer(server: string) {
  return server.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
}

const UNTIS_ERRORS: Record<number, string> = {
  [-8500]: 'Unbekanntes Schul-Kürzel',
  [-8504]: 'Benutzername oder Passwort falsch',
  [-8509]: 'Keine Berechtigung für diese Daten',
  [-8520]: 'Nicht angemeldet – Sitzung abgelaufen',
  [-8998]: 'Benutzerkonto ist gesperrt',
};

async function untisRpc<T>(
  server: string,
  school: string,
  method: string,
  params: unknown,
  sessionId?: string
): Promise<T> {
  const url = `https://${normalizeServer(server)}/WebUntis/jsonrpc.do?school=${encodeURIComponent(school)}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) headers.Cookie = `JSESSIONID=${sessionId}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: `lifetracker-${Date.now()}`, method, params, jsonrpc: '2.0' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error(`WebUntis-Server "${normalizeServer(server)}" ist nicht erreichbar.`);
  }

  if (response.status === 404) {
    throw new Error(
      `Schule „${school}“ auf ${normalizeServer(server)} nicht gefunden. Server und Schul-Kürzel stehen in der WebUntis-Adresse: https://SERVER/WebUntis/?school=KÜRZEL`
    );
  }
  if (!response.ok) throw new Error(`WebUntis antwortet mit HTTP ${response.status}.`);

  const data = await response.json().catch(() => null);
  if (!data) throw new Error('WebUntis lieferte keine gültige Antwort.');
  if (data.error) {
    throw new Error(UNTIS_ERRORS[data.error.code] ?? data.error.message ?? `WebUntis Fehler ${data.error.code}`);
  }
  return data.result as T;
}

interface UntisSession {
  sessionId: string;
  personType: number;
  personId: number;
  klasseId: number;
}

async function login(server: string, school: string, username: string, password: string) {
  const session = await untisRpc<UntisSession>(server, school, 'authenticate', {
    user: username,
    password,
    client: 'LifeTracker',
  });
  if (!session?.sessionId) throw new Error('WebUntis hat keine Sitzung zurückgegeben.');
  return session;
}

async function logout(server: string, school: string, sessionId: string) {
  try {
    await untisRpc(server, school, 'logout', {}, sessionId);
  } catch {
    // Session expires on its own; a failed logout is harmless.
  }
}

interface UntisElementRef {
  id: number;
  name?: string;
  longname?: string;
  orgname?: string;
}

interface UntisLesson {
  id: number;
  date: number;
  startTime: number;
  endTime: number;
  code?: 'cancelled' | 'irregular';
  lstext?: string;
  substText?: string;
  info?: string;
  su?: UntisElementRef[];
  ro?: UntisElementRef[];
  te?: UntisElementRef[];
  /** Student group ("Gruppe 1" splits etc.), when the school tags it in Untis. */
  sg?: string;
  /** ls = normal lesson, ex = exam; other values (oh, sb, bs) are treated as normal. */
  lstype?: 'ls' | 'ex' | 'oh' | 'sb' | 'bs';
}

export type TimetableScope = 'personal' | 'class';

/**
 * Loads the personal or the class timetable. Personal falls back to the class when the
 * school hasn't assigned lessons to students (empty result or no permission) and vice versa.
 */
async function fetchApiLessons(
  server: string,
  school: string,
  session: UntisSession,
  monday: Date,
  friday: Date,
  scope: TimetableScope
): Promise<{ lessons: LessonInput[]; usedScope: TimetableScope }> {
  const personal = session.personId > 0 ? { id: session.personId, type: session.personType, scope: 'personal' as const } : null;
  const klasse = session.klasseId > 0 ? { id: session.klasseId, type: 1, scope: 'class' as const } : null;
  const candidates = (scope === 'class' ? [klasse, personal] : [personal, klasse]).filter(
    (c): c is NonNullable<typeof c> => c !== null
  );
  if (candidates.length === 0) throw new Error('Für diesen Benutzer wurde kein Stundenplan gefunden.');

  let lessons: UntisLesson[] = [];
  let usedScope: TimetableScope = candidates[0].scope;
  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      lessons = await untisRpc<UntisLesson[]>(
        server,
        school,
        'getTimetable',
        {
          options: {
            element: { id: candidate.id, type: candidate.type },
            startDate: toUntisDate(monday),
            endDate: toUntisDate(friday),
            showLsText: true,
            // Without this WebUntis omits "sg" – the tag that tells parallel groups apart.
            showStudentgroup: true,
            showSubstText: true,
            showInfo: true,
            roomFields: ['name', 'longname'],
            subjectFields: ['name', 'longname'],
            teacherFields: ['name', 'longname'],
          },
        },
        session.sessionId
      );
      usedScope = candidate.scope;
      lastError = null;
      if (lessons?.length) break;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError && !lessons?.length) throw lastError;

  const unique = new Map<string, LessonInput>();
  for (const lesson of lessons ?? []) {
    const subject = lesson.su?.[0];
    const code = (subject?.name || lesson.lstext || 'UNT').trim();
    const name = subject?.longname || subject?.name || lesson.lstext || 'Unterricht';
    const startTime = fromUntisTime(lesson.startTime);
    const room = lesson.ro?.map((r) => r.name).filter(Boolean).join(', ') || null;
    const teacher = lesson.te?.map((t) => t.longname || t.name).filter(Boolean).join(', ') || null;
    // Untis tags real group splits with "sg"; without it, two parallel lessons of the same
    // subject at the same time only differ by teacher or room – use that as a fallback tag so
    // both survive instead of one silently overwriting the other below.
    const studentGroup = lesson.sg?.trim() || null;
    const isExam = lesson.lstype === 'ex';
    const key = `${lesson.date}-${startTime}-${code}-${studentGroup ?? teacher ?? room ?? lesson.id}`;
    if (unique.has(key)) continue;

    const roomChange = lesson.ro?.find((r) => r.orgname);
    const teacherChange = lesson.te?.find((t) => t.orgname);
    const isCancelled = lesson.code === 'cancelled';
    const notes = [
      isCancelled ? 'Entfällt' : null,
      lesson.substText,
      roomChange ? `Raumänderung (statt ${roomChange.orgname})` : null,
      teacherChange ? `Vertretung (statt ${teacherChange.orgname})` : null,
      lesson.info,
    ].filter(Boolean);

    unique.set(key, {
      date: fromUntisDate(lesson.date),
      dayOfWeek: isoWeekday(fromUntisDate(lesson.date)),
      startTime,
      endTime: fromUntisTime(lesson.endTime),
      title: isExam && lesson.lstext ? lesson.lstext.trim() : name,
      subjectCode: code,
      subjectName: name,
      room,
      teacher,
      substitutionNote: notes.length ? notes.join(' · ') : null,
      isCancelled,
      externalUntisId: `untis-${lesson.id}-${lesson.date}`,
      studentGroup,
      isExam,
    });
  }
  return { lessons: mergeDoubleLessons(Array.from(unique.values())), usedScope };
}

interface ExamInput {
  externalUntisId: string;
  subjectCode: string;
  title: string;
  date: Date;
  note: string | null;
  /** Grade WebUntis already published for this exam, if any. */
  grade: string | null;
}

/**
 * Announced exams (Schularbeiten, Tests) come from the REST API – schools enter them there,
 * not as timetable entries. Exams assigned to specific students are skipped unless they're ours.
 */
async function fetchApiExams(
  server: string,
  school: string,
  sessionId: string,
  personId: number,
  from: Date,
  to: Date
): Promise<ExamInput[]> {
  const url = `https://${normalizeServer(server)}/WebUntis/api/exams?startDate=${toUntisDate(from)}&endDate=${toUntisDate(to)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Cookie: `JSESSIONID=${sessionId}; schoolname="_${Buffer.from(school).toString('base64')}"`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const exams: any[] = json?.data?.exams ?? [];

    return exams
      .filter((exam) => {
        const assigned: any[] = exam.assignedStudents ?? [];
        return assigned.length === 0 || assigned.some((s) => Number(s?.id) === personId);
      })
      .map((exam) => {
        const date = fromUntisDate(Number(exam.examDate));
        const start = Number(exam.startTime);
        date.setHours(Number.isFinite(start) ? Math.floor(start / 100) : 8, Number.isFinite(start) ? start % 100 : 0, 0, 0);
        const subjectCode = String(exam.subject ?? '').trim();
        const name = String(exam.name ?? '').trim();
        return {
          // The API reports id 0 for every exam, so build a stable key ourselves.
          externalUntisId: `untis-exam-${exam.examDate}-${exam.startTime}-${subjectCode}`,
          subjectCode,
          title: name || `${subjectCode} ${String(exam.examType ?? '').includes('SA') ? 'Schularbeit' : 'Test'}`.trim(),
          date,
          note: [String(exam.text ?? '').trim(), (exam.rooms ?? []).join(', '), (exam.teachers ?? []).join(', ')].filter(Boolean).join(' · ') || null,
          grade: String(exam.grade ?? '').trim() || null,
        };
      });
  } catch (error) {
    console.warn('WebUntis exam fetch failed:', error);
    return [];
  }
}

/** Homework lives in the WebUntis REST API, which accepts the JSON-RPC session cookie. */
async function fetchApiHomework(
  server: string,
  school: string,
  sessionId: string,
  from: Date,
  to: Date
): Promise<HomeworkInput[]> {
  const url = `https://${normalizeServer(server)}/WebUntis/api/homeworks/lessons?startDate=${toUntisDate(from)}&endDate=${toUntisDate(to)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Cookie: `JSESSIONID=${sessionId}; schoolname="_${Buffer.from(school).toString('base64')}"`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const homeworks: any[] = json?.data?.homeworks ?? [];
    const lessons = new Map<number, any>((json?.data?.lessons ?? []).map((l: any) => [l.id, l]));

    return homeworks
      .filter((hw) => !hw.completed && hw.text)
      .map((hw) => {
        const subject = String(lessons.get(hw.lessonId)?.subject ?? 'Hausaufgabe');
        const text = String(hw.text).trim();
        const firstLine = text.split('\n')[0].slice(0, 90);
        const dueDate = fromUntisDate(hw.dueDate);
        dueDate.setHours(8, 0, 0, 0);
        return {
          subject,
          title: `${subject}: ${firstLine}`,
          description: [text, hw.remark].filter(Boolean).join('\n\n') || null,
          dueDate,
          estimatedMinutes: 30,
          priority: 'high',
        };
      });
  } catch (error) {
    console.warn('WebUntis homework fetch failed:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// iCal subscription feed
// ---------------------------------------------------------------------------

interface IcalEvent {
  summary?: string;
  location?: string;
  description?: string;
  status?: string;
  uid?: string;
  start?: Date;
  end?: Date;
}

function unescapeIcal(value: string) {
  return value.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();
}

/** Handles DATE, floating/TZID local times (interpreted in server time zone) and UTC. */
function parseIcalDate(value: string): Date | undefined {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return undefined;
  const [, y, mo, d, h = '0', mi = '0', s = '0', utc] = m;
  return utc
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
    : new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

export function parseIcalEvents(text: string): IcalEvent[] {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events: IcalEvent[] = [];
  let current: IcalEvent | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') current = {};
    else if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const sep = line.indexOf(':');
      if (sep < 0) continue;
      const name = line.slice(0, sep).split(';')[0].toUpperCase();
      const value = line.slice(sep + 1);
      if (name === 'SUMMARY') current.summary = unescapeIcal(value);
      else if (name === 'LOCATION') current.location = unescapeIcal(value);
      else if (name === 'DESCRIPTION') current.description = unescapeIcal(value);
      else if (name === 'STATUS') current.status = value.trim().toUpperCase();
      else if (name === 'UID') current.uid = value.trim();
      else if (name === 'DTSTART') current.start = parseIcalDate(value);
      else if (name === 'DTEND') current.end = parseIcalDate(value);
    }
  }
  return events;
}

async function fetchIcalEvents(icalUrl: string): Promise<IcalEvent[]> {
  const url = icalUrl.trim().replace(/^webcal:\/\//i, 'https://');
  if (!/^https?:\/\//i.test(url)) throw new Error('Der iCal-Link muss mit https:// oder webcal:// beginnen.');

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new Error('Der iCal-Feed ist nicht erreichbar.');
  }
  if (!res.ok) throw new Error(`Der iCal-Feed antwortet mit HTTP ${res.status}.`);
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Der Link liefert keinen gültigen iCal-Kalender.');
  return parseIcalEvents(text);
}

function icalEventsToLessons(events: IcalEvent[], reference = new Date()): LessonInput[] {
  const valid = events.filter(
    (e): e is IcalEvent & { start: Date; end: Date; summary: string } => !!(e.start && e.end && e.summary)
  );
  const inWeek = (monday: Date) => {
    const end = new Date(monday);
    end.setDate(monday.getDate() + 5);
    return valid.filter((e) => e.start! >= monday && e.start! < end);
  };

  let { monday } = getSchoolWeek(reference);
  let weekEvents = inWeek(monday);
  if (weekEvents.length === 0) {
    // School holidays: fall back to the next week that actually has lessons.
    const next = valid.filter((e) => e.start! >= monday).sort((a, b) => +a.start! - +b.start!)[0];
    if (next) {
      monday = getSchoolWeek(next.start!).monday;
      weekEvents = inWeek(monday);
    }
  }

  const unique = new Map<string, LessonInput>();
  for (const e of weekEvents) {
    const start = e.start!;
    const end = e.end!;
    const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const summary = e.summary!;
    const key = `${isoWeekday(start)}-${startTime}-${summary}`;
    if (unique.has(key)) continue;
    const code = summary.split(/[\s,/]+/)[0].slice(0, 10);
    const isCancelled = e.status === 'CANCELLED';
    unique.set(key, {
      date: start,
      dayOfWeek: isoWeekday(start),
      startTime,
      endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      title: summary,
      subjectCode: code,
      subjectName: code,
      room: e.location || null,
      teacher: e.description?.split('\n')[0] || null,
      substitutionNote: isCancelled ? 'Entfällt' : null,
      isCancelled,
      externalUntisId: `untis-ical-${e.uid ?? key}`,
      studentGroup: null,
      isExam: false,
    });
  }
  return mergeDoubleLessons(Array.from(unique.values()));
}

// ---------------------------------------------------------------------------
// Demo timetable (used for the demo school without credentials)
// ---------------------------------------------------------------------------

const DEMO_SUBJECTS: Record<string, { name: string; colorHex: string; icon: string }> = {
  M: { name: 'Mathe', colorHex: '#6366F1', icon: 'calculator' },
  PH: { name: 'Physik', colorHex: '#F59E0B', icon: 'atom' },
  INF: { name: 'Informatik', colorHex: '#8B5CF6', icon: 'terminal' },
  L: { name: 'Latein', colorHex: '#EC4899', icon: 'languages' },
  BWL: { name: 'BWL', colorHex: '#10B981', icon: 'briefcase' },
  D: { name: 'Deutsch', colorHex: '#3B82F6', icon: 'book' },
  E: { name: 'Englisch', colorHex: '#06B6D4', icon: 'globe' },
  CH: { name: 'Chemie', colorHex: '#14B8A6', icon: 'flask' },
  SP: { name: 'Sport', colorHex: '#EAB308', icon: 'activity' },
};

// [day, start, end, title, subject code, room, teacher, substitution note]
const DEMO_LESSONS: [number, string, string, string, string, string, string, string?][] = [
  [1, '08:00', '09:30', 'Mathematik (Analysis & Matrizen)', 'M', 'Raum 204', 'Prof. Mag. Weber'],
  [1, '09:45', '11:15', 'Informatik (Algorithmen & Datenstrukturen)', 'INF', 'EDV-Labor 2', 'DI Gruber'],
  [1, '11:45', '12:35', 'Physik Vorlesung (Optik)', 'PH', 'Physiksaal 1', 'Dr. Schneider', 'Vertretung Fr. Dr. Klein in R102'],
  [1, '13:30', '15:00', 'BWL & Projektmanagement', 'BWL', 'Raum 105', 'Mag. Bauer'],
  [2, '08:00', '09:30', 'Englisch (Advanced Writing & Presentation)', 'E', 'Sprachlabor A', 'Ms. Taylor'],
  [2, '09:45', '11:15', 'Mathematik Vertiefung (Vektoralgebra)', 'M', 'Raum 204', 'Prof. Mag. Weber'],
  [2, '11:45', '13:15', 'Latein Lektüre (Cicero Reden)', 'L', 'Raum 208', 'Dr. Fischer'],
  [3, '08:00', '10:30', 'Informatik Software-Projekt & Git', 'INF', 'EDV-Labor 2', 'DI Gruber'],
  [3, '11:00', '12:30', 'Deutsch (Epochen & Textanalyse)', 'D', 'Raum 301', 'Mag. Hofer'],
  [3, '13:30', '15:00', 'Chemie Labor (Thermodynamik)', 'CH', 'Chemiesaal 2', 'Dr. Wagner'],
  [4, '08:00', '09:30', 'Physik Experimentallabor', 'PH', 'Physiksaal 1', 'Dr. Schneider'],
  [4, '10:00', '11:30', 'BWL Finanzierung & Steuern', 'BWL', 'Raum 105', 'Mag. Bauer'],
  [4, '12:00', '13:30', 'Latein Grammatik & Vokabeltest', 'L', 'Raum 208', 'Dr. Fischer'],
  [5, '08:00', '09:30', 'Mathematik Klausurvorbereitung', 'M', 'Raum 204', 'Prof. Mag. Weber'],
  [5, '10:00', '11:30', 'Informatik Web-Engineering & Next.js', 'INF', 'EDV-Labor 1', 'DI Gruber'],
  [5, '12:00', '13:30', 'Sport & Fitness (Teamspiele)', 'SP', 'Große Sporthalle', 'Mag. Berger'],
];

function demoLessons(): LessonInput[] {
  const { monday } = getSchoolWeek();
  return DEMO_LESSONS.map(([day, start, end, title, code, room, teacher, note], idx) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + (day - 1));
    return {
      date,
      dayOfWeek: day,
      startTime: start,
      endTime: end,
      title,
      subjectCode: code,
      subjectName: DEMO_SUBJECTS[code].name,
      room,
      teacher,
      substitutionNote: note ?? null,
      isCancelled: false,
      externalUntisId: `untis-demo-${idx + 1}`,
      studentGroup: null,
      isExam: false,
    };
  });
}

function demoHomework(): HomeworkInput[] {
  const inDays = (days: number, hour = 8) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  return [
    {
      subject: 'M',
      title: 'Mathe: Vektorrechnung Buch S. 84 Nr. 3 & 4',
      description: 'Schriftlich ins Heft lösen und Skizzen mit Geodreieck zeichnen.',
      dueDate: inDays(1),
      estimatedMinutes: 45,
      priority: 'urgent',
    },
    {
      subject: 'INF',
      title: 'Informatik: Python Tree Traversierung',
      description: 'Binary Search Tree Traversierung mit In-Order rekursiv implementieren.',
      dueDate: inDays(2),
      estimatedMinutes: 60,
      priority: 'high',
    },
    {
      subject: 'PH',
      title: 'Physik: Versuchsprotokoll Pendelbewegung',
      description: 'Messdaten in Diagramm einzeichnen und Auswertung schreiben.',
      dueDate: inDays(1),
      estimatedMinutes: 30,
      priority: 'urgent',
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Config as sent to the browser: never includes the stored password. */
export function parseStringList(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    // ignore malformed data, fall back to no filter
    return [];
  }
}

export function toSafeUntisConfig<
  T extends { password: string | null; userId: string; selectedGroups: string; hiddenLessons: string; rotatingLessons: string },
>(config: T | null) {
  if (!config) return null;
  const { password, userId: _userId, selectedGroups, hiddenLessons, rotatingLessons, ...rest } = config;
  return {
    ...rest,
    hasPassword: !!password,
    selectedGroups: parseStringList(selectedGroups),
    hiddenLessons: parseStringList(hiddenLessons),
    rotatingLessons: parseRotations(rotatingLessons),
  };
}

interface FilterableLesson {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectCode?: string | null;
  studentGroup?: string | null;
}

/**
 * Identifies a lesson across syncs (block ids are recreated on every sync). Day, start time,
 * subject and group stay stable as long as the timetable itself doesn't change.
 */
export function lessonKey(lesson: FilterableLesson) {
  return `${lesson.dayOfWeek}|${lesson.startTime}|${lesson.subjectCode ?? ''}|${lesson.studentGroup ?? ''}`;
}

/** A slot that alternates week by week, e.g. one week Weixlbaum, the next Schreiber. */
export interface LessonRotation {
  /** Lesson keys taking turns, in rotation order. */
  keys: string[];
  /** Monday (yyyy-MM-dd) of the week in which anchorKey was the lesson that took place. */
  anchorMonday: string;
  anchorKey: string;
}

export function parseRotations(value: string | null | undefined): LessonRotation[] {
  try {
    const parsed = JSON.parse(value ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is LessonRotation =>
        !!r &&
        Array.isArray(r.keys) &&
        r.keys.length > 1 &&
        r.keys.every((k: unknown) => typeof k === 'string') &&
        typeof r.anchorMonday === 'string' &&
        typeof r.anchorKey === 'string'
    );
  } catch {
    return [];
  }
}

const mondayOf = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
  return d;
};

/** Lesson keys of rotating slots that are not on this week's turn. */
export function rotationHiddenKeys(rotations: LessonRotation[], reference = new Date()): string[] {
  const thisMonday = mondayOf(reference);
  const hidden: string[] = [];
  for (const rotation of rotations) {
    const anchor = mondayOf(new Date(`${rotation.anchorMonday}T12:00:00`));
    if (Number.isNaN(anchor.getTime())) continue;
    const weeks = Math.round((thisMonday.getTime() - anchor.getTime()) / (7 * 86_400_000));
    const start = Math.max(0, rotation.keys.indexOf(rotation.anchorKey));
    const active = rotation.keys[(((start + weeks) % rotation.keys.length) + rotation.keys.length) % rotation.keys.length];
    for (const key of rotation.keys) if (key !== active) hidden.push(key);
  }
  return hidden;
}

/**
 * Keeps only the lessons the user actually attends:
 * - tagged lessons of a group they aren't in are dropped (Gruppe 1/2, Religion, Schwerpunkt),
 * - lessons they explicitly marked as "not mine" for parallel slots WebUntis leaves untagged,
 * - and for slots that alternate weekly, everything except this week's turn.
 */
export function filterByGroups<T extends FilterableLesson>(
  schedule: T[],
  selectedGroups: string[],
  hiddenLessons: string[] = [],
  rotations: LessonRotation[] = [],
  reference = new Date()
): T[] {
  const hidden = new Set(hiddenLessons);

  // Weekly rotations only kick in while both variants are actually in the week's data. WebUntis
  // often delivers just the lesson that really takes place – then there is nothing to hide, and
  // hiding by turn would wrongly empty the slot.
  const rotationHidden = rotationHiddenKeys(rotations, reference);
  for (const rotation of rotations) {
    const present = schedule.filter((l) => rotation.keys.includes(lessonKey(l)));
    if (present.length <= 1) continue;
    for (const key of rotationHidden) if (rotation.keys.includes(key)) hidden.add(key);
  }

  // If one lesson of a parallel slot carries a group of the user's, the lessons running against
  // it can't be theirs – not even untagged ones. Saves picking those slots by hand. Slots the
  // user decided themselves (fixed choice or weekly rotation) are left alone.
  if (selectedGroups.length > 0) {
    const decided = new Set([...hiddenLessons, ...rotations.flatMap((r) => r.keys)]);
    for (const slot of findParallelSlots(schedule)) {
      const keys = slot.lessons.map(lessonKey);
      if (keys.some((k) => decided.has(k))) continue;
      if (!slot.lessons.some((l) => l.studentGroup && selectedGroups.includes(l.studentGroup))) continue;
      for (const lesson of slot.lessons) {
        if (!lesson.studentGroup || !selectedGroups.includes(lesson.studentGroup)) hidden.add(lessonKey(lesson));
      }
    }
  }

  return schedule.filter((b) => {
    if (hidden.has(lessonKey(b))) return false;
    if (selectedGroups.length === 0 || !b.studentGroup) return true;
    return selectedGroups.includes(b.studentGroup);
  });
}

/** Overlapping lessons of the same day – the slots where the user has to pick their half. */
export function findParallelSlots<T extends FilterableLesson>(schedule: T[]) {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const byDay = new Map<number, T[]>();
  for (const b of schedule) byDay.set(b.dayOfWeek, [...(byDay.get(b.dayOfWeek) ?? []), b]);

  const slots: { day: number; startTime: string; endTime: string; lessons: T[] }[] = [];
  for (const [day, lessons] of byDay) {
    const sorted = [...lessons].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    let cluster: T[] = [];
    let clusterEnd = -1;
    const flush = () => {
      if (cluster.length > 1) {
        slots.push({
          day,
          startTime: cluster[0].startTime,
          endTime: cluster.reduce((latest, l) => (toMin(l.endTime) > toMin(latest) ? l.endTime : latest), cluster[0].endTime),
          lessons: cluster,
        });
      }
      cluster = [];
    };
    for (const lesson of sorted) {
      if (cluster.length > 0 && toMin(lesson.startTime) >= clusterEnd) flush();
      cluster.push(lesson);
      clusterEnd = Math.max(clusterEnd, toMin(lesson.endTime));
    }
    flush();
  }
  return slots.sort((a, b) => a.day - b.day || toMin(a.startTime) - toMin(b.startTime));
}

export async function testUntisConnection(input: {
  server?: string;
  school?: string;
  username?: string;
  password?: string | null;
  icalUrl?: string | null;
}): Promise<UntisTestResult> {
  const { server, school, username, password, icalUrl } = input;
  try {
    if (school === DEMO_SCHOOL) {
      return { success: true, source: 'demo', message: 'Demo-Schule aktiv – es wird ein Beispiel-Stundenplan geladen.' };
    }
    if (server && school && username && password) {
      const session = await login(server, school, username, password);
      await logout(server, school, session.sessionId);
      return { success: true, source: 'api', message: `Anmeldung bei WebUntis (${school}) erfolgreich.` };
    }
    if (icalUrl) {
      const events = await fetchIcalEvents(icalUrl);
      return { success: true, source: 'ical', message: `iCal-Feed erreichbar: ${events.length} Termine gefunden.` };
    }
    return {
      success: false,
      message: 'Bitte Server, Schul-Kürzel, Benutzername und Passwort ausfüllen – oder einen iCal-Link angeben.',
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen.' };
  }
}

export interface WeekLesson {
  id: string;
  title: string;
  subjectCode: string;
  subjectId: string | null;
  dayOfWeek: number;
  date: string;
  startTime: string;
  endTime: string;
  room: string | null;
  teacher: string | null;
  colorHex: string;
  isCancelled: boolean;
  substitutionNote: string | null;
  studentGroup: string | null;
  isExam: boolean;
}

/**
 * Loads any week straight from WebUntis for browsing back and forth, without touching the
 * stored timetable. The user's group filters apply, and weekly rotations are resolved for
 * exactly that week – so a week in the future shows the teacher whose turn it will be.
 */
export async function fetchWeekForUser(userId: string, monday: Date): Promise<{ lessons: WeekLesson[]; schoolName: string }> {
  const config = await db.webUntisConfig.findUnique({ where: { userId } });
  if (!config) throw new Error('WebUntis ist noch nicht eingerichtet.');
  if (config.school === DEMO_SCHOOL || !config.password) {
    throw new Error('Andere Wochen können nur mit einer echten WebUntis-Anmeldung geladen werden.');
  }

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const session = await login(config.server, config.school, config.username, config.password);
  let lessons: LessonInput[];
  try {
    const scope: TimetableScope = config.timetableScope === 'class' ? 'class' : 'personal';
    lessons = (await fetchApiLessons(config.server, config.school, session, monday, friday, scope)).lessons;
  } finally {
    await logout(config.server, config.school, session.sessionId);
  }

  const filtered = filterByGroups(
    lessons,
    parseStringList(config.selectedGroups),
    parseStringList(config.hiddenLessons),
    parseRotations(config.rotatingLessons),
    monday
  );

  // Reuse the stored subject colours so a browsed week looks like the current one.
  const subjects = await db.subject.findMany({ where: { userId }, select: { id: true, name: true, untisCode: true, colorHex: true } });
  const subjectFor = (code: string, name: string) =>
    subjects.find((s) => s.untisCode?.toLowerCase() === code.trim().toLowerCase()) ??
    subjects.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());

  return {
    schoolName: config.schoolName,
    lessons: filtered.map((lesson) => {
      const subject = subjectFor(lesson.subjectCode, lesson.subjectName);
      return {
        id: lesson.externalUntisId,
        title: lesson.title,
        subjectCode: lesson.subjectCode,
        subjectId: subject?.id ?? null,
        dayOfWeek: lesson.dayOfWeek,
        date: lesson.date.toISOString(),
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        room: lesson.room,
        teacher: lesson.teacher,
        colorHex: subject?.colorHex ?? colorForName(lesson.subjectCode),
        isCancelled: lesson.isCancelled,
        substitutionNote: lesson.substitutionNote,
        studentGroup: lesson.studentGroup,
        isExam: lesson.isExam,
      };
    }),
  };
}

export async function syncWebUntisData(userId: string): Promise<WebUntisSyncResult> {
  const config = await db.webUntisConfig.findUnique({ where: { userId } });
  if (!config) throw new Error('WebUntis ist noch nicht eingerichtet – trag zuerst deine Schule und Zugangsdaten ein.');

  let source: UntisSource;
  let lessons: LessonInput[];
  let homework: HomeworkInput[] = [];
  let announcedExams: ExamInput[] = [];
  let usedScope: TimetableScope | null = null;

  try {
    if (config.school !== DEMO_SCHOOL && config.password) {
      source = 'api';
      const { monday, friday } = getSchoolWeek();
      const session = await login(config.server, config.school, config.username, config.password);
      try {
        const scope: TimetableScope = config.timetableScope === 'class' ? 'class' : 'personal';
        const result = await fetchApiLessons(config.server, config.school, session, monday, friday, scope);
        lessons = result.lessons;
        usedScope = result.usedScope;
        const until = new Date();
        until.setDate(until.getDate() + 21);
        homework = await fetchApiHomework(config.server, config.school, session.sessionId, new Date(), until);
        // Exams are announced much further ahead than homework.
        const examsUntil = new Date();
        examsUntil.setDate(examsUntil.getDate() + 120);
        announcedExams = await fetchApiExams(config.server, config.school, session.sessionId, session.personId, monday, examsUntil);
      } finally {
        await logout(config.server, config.school, session.sessionId);
      }
    } else if (config.icalUrl) {
      source = 'ical';
      lessons = icalEventsToLessons(await fetchIcalEvents(config.icalUrl));
    } else if (config.school === DEMO_SCHOOL) {
      source = 'demo';
      lessons = demoLessons();
      // Demo homework only on the very first sync, so deleted demo tasks stay deleted.
      homework = config.lastSyncAt ? [] : demoHomework();
    } else {
      throw new Error('Für eine echte Schule wird ein Passwort oder ein iCal-Link benötigt.');
    }
  } catch (error) {
    await db.webUntisConfig.update({ where: { id: config.id }, data: { isConnected: false } });
    throw error;
  }

  // Subjects: match by Untis code, then by name; create missing ones.
  const subjects = await db.subject.findMany({ where: { userId } });
  const findSubject = (key: string) => {
    const needle = key.trim().toLowerCase();
    return (
      subjects.find((s) => s.untisCode?.toLowerCase() === needle) ??
      subjects.find((s) => s.name.toLowerCase() === needle)
    );
  };

  const subjectByCode = new Map<string, (typeof subjects)[number]>();
  for (const lesson of lessons) {
    if (subjectByCode.has(lesson.subjectCode)) continue;
    let subject = findSubject(lesson.subjectCode) ?? findSubject(lesson.subjectName);
    if (!subject) {
      const demo = source === 'demo' ? DEMO_SUBJECTS[lesson.subjectCode] : undefined;
      subject = await db.subject.create({
        data: {
          userId,
          name: demo?.name ?? lesson.subjectName,
          untisCode: lesson.subjectCode,
          colorHex: demo?.colorHex ?? colorForName(lesson.subjectCode),
          icon: demo?.icon ?? 'book',
        },
      });
      subjects.push(subject);
    } else if (!subject.untisCode) {
      subject = await db.subject.update({ where: { id: subject.id }, data: { untisCode: lesson.subjectCode } });
    }
    subjectByCode.set(lesson.subjectCode, subject);
  }

  // Replace previously synced lessons atomically; manual blocks stay untouched.
  await db.$transaction([
    db.scheduleBlock.deleteMany({ where: { userId, externalUntisId: { not: null } } }),
    db.scheduleBlock.createMany({
      data: lessons.map((lesson) => {
        const subject = subjectByCode.get(lesson.subjectCode);
        return {
          userId,
          subjectId: subject?.id ?? null,
          title: lesson.title,
          subjectCode: lesson.subjectCode,
          dayOfWeek: lesson.dayOfWeek,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          room: lesson.room,
          teacher: lesson.teacher,
          colorHex: subject?.colorHex ?? colorForName(lesson.subjectCode),
          isCancelled: lesson.isCancelled,
          substitutionNote: lesson.substitutionNote,
          externalUntisId: lesson.externalUntisId,
          studentGroup: lesson.studentGroup,
          isExam: lesson.isExam,
        };
      }),
    }),
  ]);

  // Exams: from the announcement API plus any timetable entry flagged as an exam. Matched by
  // externalUntisId so a re-sync updates the same entry (dates move) instead of duplicating it.
  // Exams the user deleted stay deleted as long as WebUntis keeps reporting the same id.
  const examInputs: ExamInput[] = [
    ...announcedExams,
    ...lessons
      .filter((l) => l.isExam)
      .map((l) => ({
        externalUntisId: l.externalUntisId,
        subjectCode: l.subjectCode,
        title: l.title && l.title !== l.subjectName ? l.title : `${l.subjectName} – Prüfung`,
        date: l.date,
        note: l.room,
        grade: null,
      })),
  ];

  let examCount = 0;
  for (const input of examInputs) {
    const subject = subjectByCode.get(input.subjectCode) ?? findSubject(input.subjectCode);
    const existing = await db.exam.findFirst({ where: { userId, externalUntisId: input.externalUntisId } });
    if (existing) {
      await db.exam.update({
        where: { id: existing.id },
        data: { date: input.date, subjectId: subject?.id ?? existing.subjectId },
      });
    } else {
      await db.exam.create({
        data: {
          userId,
          subjectId: subject?.id ?? null,
          title: input.title,
          kind: guessExamKindFromText(input.title),
          date: input.date,
          // "Stoff" stays empty – that field belongs to the user's own checklist.
          isUntisSync: true,
          externalUntisId: input.externalUntisId,
        },
      });
      examCount++;
    }
  }

  let homeworkCount = 0;
  for (const hw of homework) {
    const exists = await db.task.findFirst({ where: { userId, title: hw.title, isUntisSync: true } });
    if (exists) continue;
    const subjectId = findSubject(hw.subject)?.id ?? null;
    await db.task.create({
      data: {
        userId,
        subjectId,
        scheduleBlockId: await findScheduleBlockId(userId, subjectId, hw.dueDate),
        title: hw.title,
        description: hw.description,
        dueDate: hw.dueDate,
        estimatedMinutes: hw.estimatedMinutes,
        priority: hw.priority,
        status: 'backlog',
        isUntisSync: true,
      },
    });
    homeworkCount++;
  }

  // Deleting old blocks unlinked their tasks – attach them to the fresh lessons.
  const unlinkedTasks = await db.task.findMany({
    where: { userId, scheduleBlockId: null, subjectId: { not: null }, status: { notIn: ['done', 'archived'] } },
    select: { id: true, subjectId: true, dueDate: true },
  });
  for (const task of unlinkedTasks) {
    const blockId = await findScheduleBlockId(userId, task.subjectId, task.dueDate);
    if (blockId) await db.task.update({ where: { id: task.id }, data: { scheduleBlockId: blockId } });
  }

  await db.webUntisConfig.update({
    where: { id: config.id },
    data: { lastSyncAt: new Date(), isConnected: true },
  });

  const sourceLabel = { api: 'WebUntis', ical: 'iCal-Feed', demo: 'Demo-Stundenplan' }[source];
  return {
    success: true,
    schoolName: config.schoolName,
    syncedLessonsCount: lessons.length,
    syncedHomeworkCount: homeworkCount,
    syncedExamsCount: examCount,
    source,
    message:
      lessons.length === 0
        ? `${sourceLabel}: Keine Unterrichtsstunden in dieser Woche gefunden.`
        : `${sourceLabel} synchronisiert: ${lessons.length} Stunden${homeworkCount ? ` & ${homeworkCount} neue Hausaufgaben` : ''}${
            examCount ? ` & ${examCount} neue Prüfungen erkannt` : ''
          } übernommen.${
            usedScope && usedScope !== config.timetableScope
              ? usedScope === 'class'
                ? ' Dir sind in WebUntis keine eigenen Stunden zugewiesen – es wird der Klassenplan angezeigt.'
                : ' Der Klassenplan war nicht verfügbar – es wird dein persönlicher Plan angezeigt.'
              : ''
          }`,
  };
}
