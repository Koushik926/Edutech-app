import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useToday } from '../../hooks/useToday';
import { useCourses } from '../../store/courseStore';
import { useStudyPlans } from '../../store/studyPlanStore';
import { getCachedInsights } from '../../utils/ai';
import { requestNotificationPermission } from '../../utils/notifications';
import {
  ReminderTime,
  StudyPlan,
  createPlan,
  formatDateKey,
  formatMinutes,
  formatTime,
  studyStreak,
  summarizePlan,
} from '../../utils/studyPlan';
import ProgressBar from '../../components/study-plan/ProgressBar';
import SessionRow from '../../components/study-plan/SessionRow';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SESSION_LENGTHS = [15, 30, 45, 60];
const REMINDER_PRESETS: ReminderTime[] = [
  { hour: 7, minute: 0 },
  { hour: 12, minute: 30 },
  { hour: 18, minute: 0 },
  { hour: 21, minute: 0 },
];

function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3.5 py-2 rounded-full border ${selected ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-foreground'}`}>{label}</Text>
    </Pressable>
  );
}

function PlanSetup({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const today = useToday();
  const { createPlan: savePlan } = useStudyPlans();
  const [studyDays, setStudyDays] = useState<number[]>([1, 3, 5]);
  const [minutes, setMinutes] = useState(30);
  const [reminder, setReminder] = useState<ReminderTime>(REMINDER_PRESETS[2]);
  const [topics, setTopics] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Sessions are built from the AI "What you will learn" outcomes when the
  // course detail screen has already generated them; otherwise a standard path.
  useEffect(() => {
    getCachedInsights(courseId).then((insights) => setTopics(insights?.whatYouWillLearn ?? []));
  }, [courseId]);

  const toggleDay = (day: number) =>
    setStudyDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const preview = useMemo(
    () =>
      studyDays.length === 0
        ? null
        : createPlan({ courseId, courseTitle, topics, studyDays, minutesPerSession: minutes, reminder, today }),
    [courseId, courseTitle, topics, studyDays, minutes, reminder, today]
  );

  const onCreate = async () => {
    if (!preview || saving) return;
    setSaving(true);
    const granted = await requestNotificationPermission().catch(() => false);
    savePlan({ courseId, courseTitle, topics, studyDays, minutesPerSession: minutes, reminder });
    if (!granted) {
      Alert.alert(
        'Plan created',
        'Notifications are off, so you won’t get study reminders. You can enable them in system settings.'
      );
    }
  };

  const summary = preview ? summarizePlan(preview, today) : null;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-10">
      <Text className="text-xl font-extrabold text-foreground">Plan your learning</Text>
      <Text className="text-sm text-muted mt-1 mb-5" numberOfLines={2}>
        {courseTitle}
      </Text>

      <Text className="text-sm font-bold text-foreground mb-2">Which days can you study?</Text>
      <View className="flex-row justify-between mb-5">
        {WEEKDAYS.map((label, day) => (
          <Chip
            key={day}
            label={label}
            selected={studyDays.includes(day)}
            onPress={() => toggleDay(day)}
            accessibilityLabel={WEEKDAY_NAMES[day]}
          />
        ))}
      </View>

      <Text className="text-sm font-bold text-foreground mb-2">Session length</Text>
      <View className="flex-row flex-wrap gap-2 mb-5">
        {SESSION_LENGTHS.map((m) => (
          <Chip key={m} label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </View>

      <Text className="text-sm font-bold text-foreground mb-2">Remind me at</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {REMINDER_PRESETS.map((t) => (
          <Chip
            key={formatTime(t)}
            label={formatTime(t)}
            selected={reminder.hour === t.hour && reminder.minute === t.minute}
            onPress={() => setReminder(t)}
          />
        ))}
      </View>

      <View className="bg-primary-light rounded-xl p-4 mb-5">
        {preview && summary ? (
          <>
            <Text className="text-base font-extrabold text-primary mb-1">
              {summary.total} sessions · {formatMinutes(summary.remainingMinutes)} total
            </Text>
            <Text className="text-[13px] text-foreground">
              Starts {formatDateKey(preview.sessions[0].dueDate, today)} · finishes{' '}
              {formatDateKey(summary.projectedFinish!, today)}
            </Text>
            <Text className="text-xs text-muted mt-2">
              {topics.length > 0
                ? '✨ Sessions are built from this course’s AI learning outcomes.'
                : 'Sessions follow a standard learn → practice → review path. Generate AI insights on the course page for a tailored plan.'}
            </Text>
          </>
        ) : (
          <Text className="text-sm text-error font-semibold">Pick at least one study day.</Text>
        )}
      </View>

      <TouchableOpacity
        className={`bg-primary rounded-[10px] py-3.5 items-center ${!preview || saving ? 'opacity-50' : ''}`}
        onPress={onCreate}
        disabled={!preview || saving}
        accessibilityRole="button"
      >
        <Text className="text-white text-base font-bold">Create plan & reminders</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function PlanDetail({ plan }: { plan: StudyPlan }) {
  const router = useRouter();
  const today = useToday();
  const { plans, toggleSession, catchUp, deletePlan } = useStudyPlans();
  const summary = summarizePlan(plan, today);
  const streak = useMemo(() => studyStreak(Object.values(plans), today), [plans, today]);

  const onToggle = useCallback((sessionId: string) => toggleSession(plan.courseId, sessionId), [plan.courseId, toggleSession]);

  const onDelete = () =>
    Alert.alert('Delete study plan?', 'Your progress and reminders for this course will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePlan(plan.courseId);
          router.back();
        },
      },
    ]);

  const schedule = `${plan.studyDays.map((d) => WEEKDAY_NAMES[d]).join(' · ')} at ${formatTime(plan.reminder)} · ${plan.minutesPerSession} min`;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-10">
      <View className="bg-surface rounded-xl p-4 border border-border mb-3">
        <Text className="text-base font-extrabold text-foreground mb-1" numberOfLines={2}>
          {plan.courseTitle}
        </Text>
        <Text className="text-xs text-muted mb-3">{schedule}</Text>
        <ProgressBar progress={summary.progress} done={summary.finished} />
        <Text className="text-xs text-muted mt-2">
          {summary.completed}/{summary.total} sessions · {Math.round(summary.progress * 100)}% complete
        </Text>

        <View className="flex-row mt-4 gap-2">
          {[
            { icon: '🔥', value: `${streak}`, label: 'Day streak' },
            { icon: '⏱', value: formatMinutes(summary.remainingMinutes), label: 'Remaining' },
            {
              icon: '🏁',
              value: summary.projectedFinish ? formatDateKey(summary.projectedFinish, today) : 'Done',
              label: 'Finish',
            },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 bg-background rounded-lg py-2.5 items-center">
              <Text className="text-base">{stat.icon}</Text>
              <Text className="text-sm font-extrabold text-foreground mt-0.5" numberOfLines={1}>
                {stat.value}
              </Text>
              <Text className="text-[11px] text-muted">{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {summary.finished ? (
        <View className="bg-success/10 rounded-xl p-4 mb-3 items-center">
          <Text className="text-3xl mb-1">🎉</Text>
          <Text className="text-base font-extrabold text-foreground">You finished this plan!</Text>
          <Text className="text-xs text-muted mt-1 text-center">Reminders for this course have been turned off.</Text>
        </View>
      ) : summary.overdue > 0 ? (
        <View className="bg-error/10 border border-error/30 rounded-xl p-4 mb-3">
          <View className="flex-row items-center gap-2 mb-1">
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text className="text-[15px] font-extrabold text-error">
              {summary.overdue} session{summary.overdue > 1 ? 's' : ''} behind
            </Text>
          </View>
          <Text className="text-xs text-foreground mb-3">
            Catch up reschedules everything left onto your next study days, starting today. New finish:{' '}
            {formatDateKey(summary.projectedFinish!, today)}.
          </Text>
          <TouchableOpacity
            className="bg-error rounded-lg py-2.5 items-center"
            onPress={() => catchUp(plan.courseId)}
            accessibilityRole="button"
          >
            <Text className="text-white text-sm font-bold">Catch up — reschedule</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
        <View className="flex-row items-baseline justify-between px-3.5 pt-3.5 pb-2">
          <Text className="text-sm font-bold text-muted uppercase tracking-wide">Sessions</Text>
          {!summary.finished ? <Text className="text-[11px] text-muted">Tap to mark done</Text> : null}
        </View>
        {plan.sessions.map((s) => (
          <SessionRow key={s.id} session={s} today={today} onToggle={onToggle} />
        ))}
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 bg-primary-light rounded-[10px] py-3 items-center"
          onPress={() => router.push(`/course/${plan.courseId}`)}
          accessibilityRole="button"
        >
          <Text className="text-primary text-sm font-bold">Open course</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 border border-error rounded-[10px] py-3 items-center"
          onPress={onDelete}
          accessibilityRole="button"
        >
          <Text className="text-error text-sm font-bold">Delete plan</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function StudyPlanScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { courses } = useCourses();
  const { plans } = useStudyPlans();

  const plan = courseId ? plans[courseId] : undefined;
  const course = courses.find((c) => String(c.id) === courseId);
  const courseTitle = plan?.courseTitle ?? course?.title;

  if (!courseId || !courseTitle) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-6">
        <Stack.Screen options={{ title: 'Study Plan' }} />
        <Text className="text-muted text-base text-center">Course not found. Refresh the course list and try again.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: plan ? 'Study Plan' : 'New Study Plan' }} />
      {plan ? <PlanDetail plan={plan} /> : <PlanSetup courseId={courseId} courseTitle={courseTitle} />}
    </>
  );
}
