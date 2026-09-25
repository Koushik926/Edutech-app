import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useToday } from '../../hooks/useToday';
import { useCourses } from '../../store/courseStore';
import { useStudyPlans } from '../../store/studyPlanStore';
import { sessionStatus, studyStreak, summarizePlan } from '../../utils/studyPlan';
import OfflineBanner from '../../components/OfflineBanner';
import ProgressBar from '../../components/study-plan/ProgressBar';
import SessionRow from '../../components/study-plan/SessionRow';

export default function LearningScreen() {
  const router = useRouter();
  const today = useToday();
  const { courses, enrolled } = useCourses();
  const { plans, toggleSession } = useStudyPlans();

  const planList = useMemo(() => Object.values(plans), [plans]);
  const streak = useMemo(() => studyStreak(planList, today), [planList, today]);

  // Everything that needs attention now: overdue first, then today's sessions.
  // Sessions ticked off today stay visible (checked) so progress feels tangible.
  const agenda = useMemo(
    () =>
      planList
        .flatMap((plan) =>
          plan.sessions
            .filter((s) => {
              const status = sessionStatus(s, today);
              return status === 'overdue' || status === 'today' || s.completedOn === today;
            })
            .map((session) => ({ plan, session }))
        )
        .sort((a, b) => a.session.dueDate.localeCompare(b.session.dueDate)),
    [planList, today]
  );
  const doneToday = agenda.filter(({ session }) => session.completedOn === today).length;

  const enrolledCourses = useMemo(
    () =>
      enrolled.map((id) => {
        const course = courses.find((c) => String(c.id) === id);
        return { id, title: plans[id]?.courseTitle ?? course?.title ?? `Course #${id}`, plan: plans[id] };
      }),
    [enrolled, courses, plans]
  );

  if (enrolledCourses.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <OfflineBanner />
        <View className="flex-1 items-center justify-center p-10">
          <Text className="text-5xl mb-3">🎯</Text>
          <Text className="text-lg font-bold text-foreground mb-2">Start your learning journey</Text>
          <Text className="text-sm text-muted text-center leading-5 mb-5">
            Enroll in a course, then build a study plan with reminders to keep your streak going.
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-[10px] px-6 py-3"
            onPress={() => router.navigate('/(tabs)')}
            accessibilityRole="button"
          >
            <Text className="text-white font-bold">Browse courses</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <OfflineBanner />
      <ScrollView contentContainerClassName="p-4 pb-10" showsVerticalScrollIndicator={false}>
        <View className="bg-primary rounded-xl p-4 mb-4 flex-row items-center gap-4">
          <Text className="text-4xl">🔥</Text>
          <View className="flex-1">
            <Text className="text-white text-2xl font-extrabold">
              {streak} day{streak === 1 ? '' : 's'}
            </Text>
            <Text className="text-white/80 text-xs mt-0.5">
              {streak > 0 ? 'Study streak — keep it alive!' : 'Complete a session to start a streak'}
            </Text>
          </View>
          {agenda.length > 0 && (
            <View className="items-center">
              <Text className="text-white text-lg font-extrabold">
                {doneToday}/{agenda.length}
              </Text>
              <Text className="text-white/80 text-[11px]">today</Text>
            </View>
          )}
        </View>

        <Text className="text-sm font-bold text-muted uppercase tracking-wide mb-2">Today</Text>
        <View className="bg-surface rounded-xl border border-border overflow-hidden mb-5">
          {agenda.length === 0 ? (
            <Text className="text-sm text-muted p-4">
              {planList.length === 0 ? 'No study plans yet — create one below.' : 'Nothing due today. Enjoy the break! ✨'}
            </Text>
          ) : (
            agenda.map(({ plan, session }) => (
              <SessionRow
                key={session.id}
                session={session}
                today={today}
                subtitle={plan.courseTitle}
                onToggle={(sessionId) => toggleSession(plan.courseId, sessionId)}
              />
            ))
          )}
        </View>

        <Text className="text-sm font-bold text-muted uppercase tracking-wide mb-2">My courses</Text>
        {enrolledCourses.map(({ id, title, plan }) => {
          const summary = plan ? summarizePlan(plan, today) : null;
          return (
            <TouchableOpacity
              key={id}
              className="bg-surface rounded-xl border border-border p-3.5 mb-3"
              onPress={() => router.push(`/study-plan/${id}`)}
              accessibilityRole="button"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[15px] font-bold text-foreground flex-1 mr-2" numberOfLines={1}>
                  {title}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </View>
              {summary ? (
                <>
                  <ProgressBar progress={summary.progress} done={summary.finished} />
                  <Text className={`text-xs mt-2 ${summary.overdue > 0 ? 'text-error font-semibold' : 'text-muted'}`}>
                    {summary.finished
                      ? '🎉 Completed'
                      : `${summary.completed}/${summary.total} sessions${
                          summary.overdue > 0 ? ` · ${summary.overdue} overdue — tap to catch up` : ''
                        }`}
                  </Text>
                </>
              ) : (
                <Text className="text-xs text-primary font-semibold">+ Create a study plan</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
