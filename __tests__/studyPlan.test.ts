import {
  addDays,
  buildSessionTitles,
  catchUp,
  createPlan,
  formatDateKey,
  formatTime,
  nextStudyDates,
  sessionStatus,
  studyStreak,
  summarizePlan,
  toggleSession,
  weekdayOf,
} from '../utils/studyPlan';

// 2026-09-21 is a Monday.
const MON = '2026-09-21';
const MWF = [1, 3, 5];

const basePlan = (overrides: Partial<Parameters<typeof createPlan>[0]> = {}) =>
  createPlan({
    courseId: '7',
    courseTitle: 'React Basics',
    topics: ['Components', 'Hooks'],
    studyDays: MWF,
    minutesPerSession: 30,
    reminder: { hour: 18, minute: 0 },
    today: MON,
    ...overrides,
  });

describe('dates', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('finds upcoming study days, including today when it is one', () => {
    expect(weekdayOf(MON)).toBe(1);
    expect(nextStudyDates(MON, MWF, 4)).toEqual(['2026-09-21', '2026-09-23', '2026-09-25', '2026-09-28']);
    expect(nextStudyDates('2026-09-22', MWF, 1)).toEqual(['2026-09-23']);
    expect(nextStudyDates(MON, [], 3)).toEqual([]);
  });
});

describe('createPlan', () => {
  it('builds learn/practice sessions from AI topics, bookended by kick-off and review', () => {
    const titles = buildSessionTitles('React Basics', ['Components', 'Hooks']);
    expect(titles).toEqual([
      'Kick-off: skim the overview of React Basics',
      'Learn: Components',
      'Practice: Components',
      'Learn: Hooks',
      'Practice: Hooks',
      'Review & recap your notes',
      'Self-check: explain it back in your own words',
    ]);
  });

  it('falls back to a standard path without topics and caps long topic lists', () => {
    expect(buildSessionTitles('X', [])).toHaveLength(3 + 3 * 2);
    expect(buildSessionTitles('X', ['a', 'b', 'c', 'd', 'e', 'f'])).toHaveLength(3 + 4 * 2);
  });

  it('schedules one session per study day in order', () => {
    const plan = basePlan();
    expect(plan.sessions.map((s) => s.dueDate)).toEqual(nextStudyDates(MON, MWF, 7));
    expect(new Set(plan.sessions.map((s) => s.id)).size).toBe(plan.sessions.length);
  });

  it('dedupes/sorts study days and rejects an empty selection', () => {
    expect(basePlan({ studyDays: [5, 1, 5] }).studyDays).toEqual([1, 5]);
    expect(() => basePlan({ studyDays: [] })).toThrow();
  });
});

describe('progress', () => {
  it('classifies sessions relative to today', () => {
    const plan = basePlan();
    const wed = '2026-09-23';
    expect(sessionStatus(plan.sessions[0], wed)).toBe('overdue');
    expect(sessionStatus(plan.sessions[1], wed)).toBe('today');
    expect(sessionStatus(plan.sessions[2], wed)).toBe('upcoming');
    const done = toggleSession(plan, plan.sessions[0].id, wed);
    expect(sessionStatus(done.sessions[0], wed)).toBe('done');
    expect(toggleSession(done, plan.sessions[0].id, wed).sessions[0].completedOn).toBeUndefined();
  });

  it('summarizes progress and projects the finish date', () => {
    let plan = basePlan();
    plan = toggleSession(plan, plan.sessions[0].id, MON);
    const s = summarizePlan(plan, MON);
    expect(s).toMatchObject({ total: 7, completed: 1, overdue: 0, finished: false, remainingMinutes: 180 });
    expect(s.nextSession?.id).toBe(plan.sessions[1].id);
    expect(s.projectedFinish).toBe(plan.sessions[6].dueDate);
  });

  it('marks a plan finished when every session is done', () => {
    let plan = basePlan();
    plan.sessions.forEach((x) => (plan = toggleSession(plan, x.id, MON)));
    expect(summarizePlan(plan, MON)).toMatchObject({ finished: true, projectedFinish: null, nextSession: null });
  });
});

describe('catchUp', () => {
  it('re-flows only unfinished sessions onto study days from today, preserving order', () => {
    let plan = basePlan();
    plan = toggleSession(plan, plan.sessions[0].id, MON);
    const later = '2026-10-02'; // Friday, 2 weeks on: sessions 2-5 are overdue
    expect(summarizePlan(plan, later).overdue).toBeGreaterThan(0);

    const caught = catchUp(plan, later);
    expect(caught.sessions[0]).toEqual(plan.sessions[0]); // completed history untouched
    expect(caught.sessions.slice(1).map((s) => s.dueDate)).toEqual(nextStudyDates(later, MWF, 6));
    expect(summarizePlan(caught, later).overdue).toBe(0);
    expect(summarizePlan(plan, later).projectedFinish).toBe(summarizePlan(caught, later).projectedFinish);
  });
});

describe('studyStreak', () => {
  const withCompletions = (dates: string[]) => {
    let plan = basePlan();
    dates.forEach((d, i) => (plan = toggleSession(plan, plan.sessions[i].id, d)));
    return plan;
  };

  it('counts consecutive study days and skips rest days', () => {
    // Mon, Wed, Fri done -> 3, even though Tue/Thu had nothing.
    expect(studyStreak([withCompletions(['2026-09-21', '2026-09-23', '2026-09-25'])], '2026-09-25')).toBe(3);
  });

  it("doesn't break on an unfinished today, but breaks on a missed study day", () => {
    const plan = withCompletions(['2026-09-21', '2026-09-23']);
    expect(studyStreak([plan], '2026-09-25')).toBe(2); // Friday not done yet
    expect(studyStreak([plan], '2026-09-28')).toBe(0); // Friday was missed
  });

  it('counts extra-day study too, and is zero without plans', () => {
    expect(studyStreak([withCompletions(['2026-09-21', '2026-09-22'])], '2026-09-22')).toBe(2);
    expect(studyStreak([], MON)).toBe(0);
  });
});

describe('formatting', () => {
  it('formats relative dates and times', () => {
    expect(formatDateKey(MON, MON)).toBe('Today');
    expect(formatDateKey('2026-09-22', MON)).toBe('Tomorrow');
    expect(formatDateKey('2026-09-30', MON)).toBe('Wed, Sep 30');
    expect(formatTime({ hour: 0, minute: 5 })).toBe('12:05 AM');
    expect(formatTime({ hour: 18, minute: 30 })).toBe('6:30 PM');
  });
});
