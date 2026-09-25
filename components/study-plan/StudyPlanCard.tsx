import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useToday } from '../../hooks/useToday';
import { useStudyPlans } from '../../store/studyPlanStore';
import { formatDateKey, summarizePlan } from '../../utils/studyPlan';
import ProgressBar from './ProgressBar';

/** Course-detail entry point for the Smart Study Planner (shown once enrolled). */
export default function StudyPlanCard({ courseId }: { courseId: string }) {
  const router = useRouter();
  const today = useToday();
  const { plans } = useStudyPlans();
  const plan = plans[courseId];
  const open = () => router.push(`/study-plan/${courseId}`);

  if (!plan) {
    return (
      <TouchableOpacity
        className="bg-surface border border-dashed border-primary rounded-xl p-3.5 mb-3 flex-row items-center gap-3"
        onPress={open}
        accessibilityRole="button"
      >
        <Ionicons name="calendar-outline" size={26} color={Colors.primary} />
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-foreground">Build a study plan</Text>
          <Text className="text-xs text-muted mt-0.5">
            Pick your days & time — we&apos;ll schedule sessions and remind you.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  const s = summarizePlan(plan, today);
  const headline = s.finished
    ? '🎉 Plan complete!'
    : s.overdue > 0
    ? `${s.overdue} session${s.overdue > 1 ? 's' : ''} behind`
    : s.nextSession
    ? `Next: ${formatDateKey(s.nextSession.dueDate, today)}`
    : '';

  return (
    <TouchableOpacity
      className="bg-surface border border-border rounded-xl p-3.5 mb-3"
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Study plan, ${s.completed} of ${s.total} sessions done. ${headline}`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar" size={18} color={Colors.primary} />
          <Text className="text-[15px] font-bold text-foreground">Your study plan</Text>
        </View>
        <Text className={`text-xs font-bold ${s.overdue > 0 ? 'text-error' : 'text-primary'}`}>{headline}</Text>
      </View>
      <ProgressBar progress={s.progress} done={s.finished} />
      <Text className="text-xs text-muted mt-2">
        {s.completed}/{s.total} sessions done
        {s.nextSession && !s.finished ? ` · Up next: ${s.nextSession.title}` : ''}
      </Text>
    </TouchableOpacity>
  );
}
