import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../store/authStore';
import {
  PlansByCourse,
  StudyPlanContext,
  loadStudyPlans,
  saveStudyPlans,
} from '../store/studyPlanStore';
import {
  CreatePlanInput,
  StudyPlan,
  catchUp as catchUpPlan,
  createPlan as buildPlan,
  toDateKey,
  toggleSession as togglePlanSession,
} from '../utils/studyPlan';
import {
  cancelAllStudyReminders,
  cancelStudyReminders,
  syncStudyReminders,
} from '../utils/notifications';

export default function StudyPlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?._id ?? null;
  const [plans, setPlans] = useState<PlansByCourse>({});
  const plansRef = useRef<PlansByCourse>({});

  // Reminders belong to the signed-in user: drop them on logout, restore on login.
  useEffect(() => {
    plansRef.current = {};
    setPlans({});
    if (!userId) {
      cancelAllStudyReminders().catch(() => {});
      return;
    }

    let active = true;
    loadStudyPlans(userId).then((loaded) => {
      if (!active) return;
      plansRef.current = loaded;
      setPlans(loaded);
      Object.values(loaded).forEach((p) => syncStudyReminders(p).catch(() => {}));
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const commit = useCallback(
    (next: PlansByCourse) => {
      plansRef.current = next;
      setPlans(next);
      if (userId) saveStudyPlans(userId, next);
    },
    [userId]
  );

  const updatePlan = useCallback(
    (courseId: string, change: (plan: StudyPlan) => StudyPlan) => {
      const current = plansRef.current[courseId];
      if (!current) return;
      const updated = change(current);
      commit({ ...plansRef.current, [courseId]: updated });
      syncStudyReminders(updated).catch(() => {});
    },
    [commit]
  );

  const createPlan = useCallback(
    (input: Omit<CreatePlanInput, 'today'>) => {
      const plan = buildPlan({ ...input, today: toDateKey(new Date()) });
      commit({ ...plansRef.current, [plan.courseId]: plan });
      syncStudyReminders(plan).catch(() => {});
      return plan;
    },
    [commit]
  );

  const toggleSession = useCallback(
    (courseId: string, sessionId: string) =>
      updatePlan(courseId, (p) => togglePlanSession(p, sessionId, toDateKey(new Date()))),
    [updatePlan]
  );

  const catchUp = useCallback(
    (courseId: string) => updatePlan(courseId, (p) => catchUpPlan(p, toDateKey(new Date()))),
    [updatePlan]
  );

  const deletePlan = useCallback(
    (courseId: string) => {
      if (!plansRef.current[courseId]) return;
      const { [courseId]: _removed, ...rest } = plansRef.current;
      commit(rest);
      cancelStudyReminders(courseId).catch(() => {});
    },
    [commit]
  );

  const value = useMemo(
    () => ({ plans, createPlan, toggleSession, catchUp, deletePlan }),
    [plans, createPlan, toggleSession, catchUp, deletePlan]
  );

  return <StudyPlanContext.Provider value={value}>{children}</StudyPlanContext.Provider>;
}
