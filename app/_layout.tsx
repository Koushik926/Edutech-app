import 'react-native-gesture-handler';
import '../global.css';
import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import * as Notifications from 'expo-notifications';
import AuthProvider from '../providers/AuthProvider';
import CourseProvider from '../providers/CourseProvider';
import StudyPlanProvider from '../providers/StudyPlanProvider';
import { useAuth } from '../store/authStore';
import { requestNotificationPermission, scheduleReminderNotification } from '../utils/notifications';
import { Colors } from '../constants/colors';

cssInterop(Image, { className: 'style' });

/** Opens the screen a tapped notification points to (e.g. a study reminder -> its plan). */
function useNotificationNavigation(enabled: boolean) {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !response) return;
    const id = response.notification.request.identifier + response.notification.date;
    if (handled.current === id) return;
    handled.current = id;
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') router.push(url as never);
  }, [enabled, response, router]);
}

function RootNavigator() {
  const { isLoading, token } = useAuth();

  useEffect(() => {
    requestNotificationPermission()
      .then(() => scheduleReminderNotification())
      .catch(() => {});
  }, []);

  useNotificationNavigation(!isLoading && !!token);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" redirect={!!token} />
      <Stack.Screen name="(tabs)" redirect={!token} />
      <Stack.Screen
        name="course/[id]"
        redirect={!token}
        options={{ headerShown: true, title: 'Course Details', headerTintColor: Colors.primary }}
      />
      <Stack.Screen
        name="study-plan/[courseId]"
        redirect={!token}
        options={{ headerShown: true, title: 'Study Plan', headerTintColor: Colors.primary }}
      />
      <Stack.Screen
        name="webview"
        redirect={!token}
        options={{ headerShown: true, title: 'Course Content', headerTintColor: Colors.primary }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CourseProvider>
        <StudyPlanProvider>
          <RootNavigator />
        </StudyPlanProvider>
      </CourseProvider>
    </AuthProvider>
  );
}
