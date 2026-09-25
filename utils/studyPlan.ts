/**
 * Smart Study Planner — pure scheduling logic (no React / native imports, so
 * it is fully unit-testable). Dates are local calendar days as 'YYYY-MM-DD'.
 */

export type DateKey = string;

export interface StudySession {
  id: string;
  title: string;
  dueDate: DateKey;
  completedOn?: DateKey;
}

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface StudyPlan {
  courseId: string;
  courseTitle: string;
  createdOn: DateKey;
  /** Weekdays to study on, 0 = Sunday … 6 = Saturday. */
  studyDays: number[];
  minutesPerSession: number;
  reminder: ReminderTime;
  sessions: StudySession[];
}

export type SessionStatus = 'done' | 'overdue' | 'today' | 'upcoming';

export interface PlanSummary {
  total: number;
  completed: number;
  overdue: number;
  dueToday: number;
  progress: number;
  nextSession: StudySession | null;
  /** When the last pending session lands if the user catches up from today. */
  projectedFinish: DateKey | null;
  finished: boolean;
  remainingMinutes: number;
}

const MAX_TOPICS = 4;
const FALLBACK_TOPICS = ['Core concepts', 'Key techniques', 'Real-world application'];

// ---------- dates ----------

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function weekdayOf(key: DateKey): number {
  return fromDateKey(key).getDay();
}

/** The next `count` dates (starting at and including `from`) that fall on a study day. */
export function nextStudyDates(from: DateKey, studyDays: number[], count: number): DateKey[] {
  if (studyDays.length === 0 || count <= 0) return [];
  const days = new Set(studyDays);
  const dates: DateKey[] = [];
  let cursor = from;
  while (dates.length < count) {
    if (days.has(weekdayOf(cursor))) dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

// ---------- plan creation ----------

/**
 * Turns a course's learning outcomes (from AI insights when available) into a
 * learn → practice progression bookended by a kick-off and a review.
 */
export function buildSessionTitles(courseTitle: string, topics: string[]): string[] {
  const cleaned = topics.map((t) => t.trim()).filter(Boolean).slice(0, MAX_TOPICS);
  const chosen = cleaned.length > 0 ? cleaned : FALLBACK_TOPICS;
  return [
    `Kick-off: skim the overview of ${courseTitle}`,
    ...chosen.flatMap((topic) => [`Learn: ${topic}`, `Practice: ${topic}`]),
    'Review & recap your notes',
    'Self-check: explain it back in your own words',
  ];
}

export interface CreatePlanInput {
  courseId: string;
  courseTitle: string;
  topics: string[];
  studyDays: number[];
  minutesPerSession: number;
  reminder: ReminderTime;
  today: DateKey;
}

export function createPlan(input: CreatePlanInput): StudyPlan {
  const studyDays = [...new Set(input.studyDays)].sort((a, b) => a - b);
  if (studyDays.length === 0) throw new Error('Pick at least one study day');

  const titles = buildSessionTitles(input.courseTitle, input.topics);
  const dates = nextStudyDates(input.today, studyDays, titles.length);

  return {
    courseId: input.courseId,
    courseTitle: input.courseTitle,
    createdOn: input.today,
    studyDays,
    minutesPerSession: input.minutesPerSession,
    reminder: input.reminder,
    sessions: titles.map((title, i) => ({
      id: `${input.courseId}-${i + 1}`,
      title,
      dueDate: dates[i],
    })),
  };
}

// ---------- progress ----------

export function sessionStatus(session: StudySession, today: DateKey): SessionStatus {
  if (session.completedOn) return 'done';
  if (session.dueDate < today) return 'overdue';
  if (session.dueDate === today) return 'today';
  return 'upcoming';
}

export function toggleSession(plan: StudyPlan, sessionId: string, today: DateKey): StudyPlan {
  return {
    ...plan,
    sessions: plan.sessions.map((s) =>
      s.id !== sessionId ? s : s.completedOn ? { ...s, completedOn: undefined } : { ...s, completedOn: today }
    ),
  };
}

/**
 * Re-flows every unfinished session onto the next study days starting today,
 * preserving order. Completed sessions keep their history.
 */
export function catchUp(plan: StudyPlan, today: DateKey): StudyPlan {
  const pending = plan.sessions.filter((s) => !s.completedOn);
  const dates = nextStudyDates(today, plan.studyDays, pending.length);
  const newDue = new Map(pending.map((s, i) => [s.id, dates[i]]));
  return {
    ...plan,
    sessions: plan.sessions.map((s) => (newDue.has(s.id) ? { ...s, dueDate: newDue.get(s.id)! } : s)),
  };
}

export function summarizePlan(plan: StudyPlan, today: DateKey): PlanSummary {
  const statuses = plan.sessions.map((s) => sessionStatus(s, today));
  const total = plan.sessions.length;
  const completed = statuses.filter((s) => s === 'done').length;
  const overdue = statuses.filter((s) => s === 'overdue').length;
  const pending = plan.sessions.filter((s) => !s.completedOn);

  let projectedFinish: DateKey | null = null;
  if (pending.length > 0) {
    projectedFinish =
      overdue > 0
        ? nextStudyDates(today, plan.studyDays, pending.length).at(-1) ?? null
        : pending[pending.length - 1].dueDate;
  }

  return {
    total,
    completed,
    overdue,
    dueToday: statuses.filter((s) => s === 'today').length,
    progress: total === 0 ? 0 : completed / total,
    nextSession: pending[0] ?? null,
    projectedFinish,
    finished: total > 0 && completed === total,
    remainingMinutes: pending.length * plan.minutesPerSession,
  };
}

/**
 * Consecutive study-day streak across all plans. Only scheduled study days
 * count, so a Mon/Wed/Fri learner doesn't lose their streak on Tuesday; an
 * unfinished *today* doesn't break it either (the day isn't over yet).
 */
export function studyStreak(plans: StudyPlan[], today: DateKey): number {
  if (plans.length === 0) return 0;

  const studyDays = new Set(plans.flatMap((p) => p.studyDays));
  const activeDays = new Set(
    plans.flatMap((p) => p.sessions.map((s) => s.completedOn).filter((d): d is DateKey => !!d))
  );
  const earliest = plans.reduce((min, p) => (p.createdOn < min ? p.createdOn : min), today);

  let streak = 0;
  for (let day = today; day >= earliest; day = addDays(day, -1)) {
    if (activeDays.has(day)) {
      streak += 1;
    } else if (studyDays.has(weekdayOf(day)) && day !== today) {
      break;
    }
  }
  return streak;
}

// ---------- formatting ----------

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateKey(key: DateKey, today: DateKey): string {
  if (key === today) return 'Today';
  if (key === addDays(today, 1)) return 'Tomorrow';
  if (key === addDays(today, -1)) return 'Yesterday';
  const date = fromDateKey(key);
  return `${WEEKDAY_SHORT[date.getDay()]}, ${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

export function formatTime({ hour, minute }: ReminderTime): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
