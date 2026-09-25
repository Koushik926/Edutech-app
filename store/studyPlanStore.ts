import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext } from 'react';
import { CreatePlanInput, StudyPlan } from '../utils/studyPlan';

const STUDY_PLANS_KEY = 'study_plans';

export type PlansByCourse = Record<string, StudyPlan>;

export async function loadStudyPlans(userId: string): Promise<PlansByCourse> {
  try {
    const raw = await AsyncStorage.getItem(`${STUDY_PLANS_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as PlansByCourse) : {};
  } catch {
    return {};
  }
}

export function saveStudyPlans(userId: string, plans: PlansByCourse): Promise<void> {
  return AsyncStorage.setItem(`${STUDY_PLANS_KEY}:${userId}`, JSON.stringify(plans)).catch(() => {});
}

export interface StudyPlanContextType {
  plans: PlansByCourse;
  createPlan: (input: Omit<CreatePlanInput, 'today'>) => StudyPlan;
  toggleSession: (courseId: string, sessionId: string) => void;
  catchUp: (courseId: string) => void;
  deletePlan: (courseId: string) => void;
}

export const StudyPlanContext = createContext<StudyPlanContextType | null>(null);

export function useStudyPlans() {
  const ctx = useContext(StudyPlanContext);
  if (!ctx) throw new Error('useStudyPlans must be used inside StudyPlanProvider');
  return ctx;
}
