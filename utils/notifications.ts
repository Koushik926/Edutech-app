import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { StudyPlan, formatTime, summarizePlan, toDateKey } from './studyPlan';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const INACTIVITY_REMINDER_ID = 'inactivity-reminder';
const INACTIVITY_DELAY_SECONDS = 24 * 60 * 60;
const STUDY_CHANNEL_ID = 'study-reminders';
const STUDY_REMINDER_PREFIX = 'study:';

/**
 * Android 13+ only shows the permission prompt once a channel exists, so
 * channels are created first.
 */
async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
    Notifications.setNotificationChannelAsync(STUDY_CHANNEL_ID, {
      name: 'Study reminders',
      importance: Notifications.AndroidImportance.HIGH,
    }),
  ]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

export async function sendBookmarkNotification(count: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎉 Great job!',
      body: `You've bookmarked ${count} courses. Keep exploring!`,
    },
    trigger: null,
  });
}

/**
 * "Remind me if I haven't opened the app for 24h": each launch pushes the
 * reminder 24h into the future (the previous one is cancelled first), so it
 * only fires if the app really goes unopened for a day.
 */
export async function scheduleReminderNotification() {
  await Notifications.cancelScheduledNotificationAsync(INACTIVITY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: INACTIVITY_REMINDER_ID,
    content: {
      title: '📚 Miss learning?',
      body: "You haven't opened EduTech in a while. Come back and continue!",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: INACTIVITY_DELAY_SECONDS,
    },
  });
}

// ---------- Smart Study Planner reminders ----------

function studyReminderId(courseId: string, weekday: number) {
  return `${STUDY_REMINDER_PREFIX}${courseId}:${weekday}`;
}

export async function cancelStudyReminders(courseId: string) {
  await Promise.all(
    [0, 1, 2, 3, 4, 5, 6].map((d) =>
      Notifications.cancelScheduledNotificationAsync(studyReminderId(courseId, d)).catch(() => {})
    )
  );
}

export async function cancelAllStudyReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(STUDY_REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/**
 * One weekly repeating reminder per study day at the plan's reminder time.
 * Re-run after every plan change so the body names the current next session;
 * finished plans get their reminders removed.
 */
export async function syncStudyReminders(plan: StudyPlan) {
  await cancelStudyReminders(plan.courseId);

  const { nextSession, finished } = summarizePlan(plan, toDateKey(new Date()));
  if (finished || !nextSession) return;

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  await ensureChannels();
  await Promise.all(
    plan.studyDays.map((weekday) =>
      Notifications.scheduleNotificationAsync({
        identifier: studyReminderId(plan.courseId, weekday),
        content: {
          title: `📖 Study time · ${formatTime(plan.reminder)}`,
          body: `${plan.courseTitle} — next up: ${nextSession.title}`,
          data: { url: `/study-plan/${plan.courseId}` },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: STUDY_CHANNEL_ID,
          weekday: weekday + 1, // expo: 1 = Sunday
          hour: plan.reminder.hour,
          minute: plan.reminder.minute,
        },
      })
    )
  );
}
