import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useCourses } from '../../store/courseStore';
import { useStudyPlans } from '../../store/studyPlanStore';
import { CourseInsights, generateCourseInsights } from '@/utils/ai';
import StudyPlanCard from '../../components/study-plan/StudyPlanCard';

type AiStatus = 'loading' | 'ready' | 'unavailable';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { courses, bookmarks, enrolled, toggleBookmark, toggleEnroll } = useCourses();
  const { plans, deletePlan } = useStudyPlans();

  const course = courses.find((c) => String(c.id) === id);

  // All hooks run before any early return (Rules of Hooks): previously the
  // "Course not found" branch returned before useState/useEffect, which
  // crashes with "Rendered more hooks than during the previous render" as
  // soon as the course list loads while this screen is open.
  const [aiInsights, setAiInsights] = useState<CourseInsights | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>('loading');
  const courseRef = useRef(course);
  courseRef.current = course;
  const requestId = useRef(0);

  const loadAIInsights = useCallback(async () => {
    const current = courseRef.current;
    if (!current) return;
    const thisRequest = ++requestId.current;
    setAiStatus('loading');
    const result = await generateCourseInsights(current);
    if (thisRequest !== requestId.current) return; // a newer request (or unmount) superseded this one
    setAiInsights(result);
    setAiStatus(result ? 'ready' : 'unavailable');
  }, []);

  const courseId = course ? String(course.id) : null;
  useEffect(() => {
    if (!courseId) return;
    loadAIInsights();
    return () => {
      requestId.current += 1;
    };
  }, [courseId, loadAIInsights]);

  if (!course || !courseId) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-6">
        <Text className="text-muted text-base text-center">Course not found</Text>
      </View>
    );
  }

  const isBookmarked = bookmarks.includes(courseId);
  const isEnrolled = enrolled.includes(courseId);

  const handleEnroll = () => {
    if (!isEnrolled) {
      toggleEnroll(courseId);
      Alert.alert('Enrolled! 🎉', `You are now enrolled in "${course.title}". Build a study plan to stay on track.`);
      return;
    }
    const hasPlan = !!plans[courseId];
    Alert.alert(
      'Unenroll from this course?',
      hasPlan ? 'Your study plan, progress and reminders for this course will also be deleted.' : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unenroll',
          style: 'destructive',
          onPress: () => {
            toggleEnroll(courseId);
            deletePlan(courseId);
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      <Image
        source={{ uri: course.thumbnail }}
        className="w-full h-[220px] bg-border"
        contentFit="cover"
      />

      <View className="p-4">
        <View className="self-start bg-primary-light rounded-md px-2.5 py-1 mb-2.5">
          <Text className="text-primary text-xs font-bold capitalize">{course.category}</Text>
        </View>

        <Text className="text-xl font-extrabold text-foreground mb-3.5 leading-[26px]">
          {course.title}
        </Text>

        <View className="flex-row items-center gap-2.5 mb-3">
          <Image
            source={course.instructorAvatar ? { uri: course.instructorAvatar } : undefined}
            className="w-11 h-11 rounded-full bg-border"
            contentFit="cover"
          />
          <View>
            <Text className="text-[11px] text-muted">Instructor</Text>
            <Text className="text-sm font-bold text-foreground">{course.instructorName}</Text>
          </View>
        </View>

        <View className="flex-row gap-4 mb-4">
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={16} color={Colors.warning} />
            <Text className="text-sm text-muted font-semibold">
              {course.rating?.toFixed(1)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="pricetag-outline" size={16} color={Colors.textSecondary} />
            <Text className="text-sm text-muted font-semibold">
              ${course.price.toFixed(2)}
            </Text>
          </View>
        </View>

        <Text className="text-base font-bold text-foreground mb-2">Description</Text>
        <Text className="text-sm text-muted leading-[22px] mb-5">{course.description}</Text>

        <View className="bg-primary-light rounded-xl p-3.5 mb-4">
          <View className="flex-row items-center gap-1.5 mb-2.5">
            <Ionicons name="sparkles-outline" size={18} color={Colors.primary} />
            <Text className="text-base font-extrabold text-primary">AI Course Insights</Text>
          </View>

          {aiStatus === 'loading' ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text className="text-[13px] text-muted leading-5">Generating AI summary...</Text>
            </View>
          ) : aiStatus === 'ready' && aiInsights ? (
            <>
              <Text className="text-sm font-bold text-foreground mt-2 mb-1">
                What you will learn
              </Text>
              {aiInsights.whatYouWillLearn.map((item, index) => (
                <Text key={index} className="text-[13px] text-muted leading-5">
                  • {item}
                </Text>
              ))}

              <Text className="text-sm font-bold text-foreground mt-2 mb-1">
                Best suited for
              </Text>
              <Text className="text-[13px] text-muted leading-5">{aiInsights.bestFor}</Text>

              <Text className="text-sm font-bold text-foreground mt-2 mb-1">Summary</Text>
              <Text className="text-[13px] text-muted leading-5">{aiInsights.aiSummary}</Text>
            </>
          ) : (
            <>
              <Text className="text-[13px] text-muted leading-5 mb-2.5">
                AI insights are unavailable right now (the AI service may be busy or you may be offline).
              </Text>
              <TouchableOpacity
                className="bg-primary rounded-lg py-2.5 items-center"
                onPress={loadAIInsights}
                accessibilityRole="button"
              >
                <Text className="text-white text-sm font-bold">Try again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {isEnrolled && <StudyPlanCard courseId={courseId} />}

        <View className="flex-row gap-3 mb-3">
          <TouchableOpacity
            className={`flex-1 rounded-[10px] py-3.5 items-center ${
              isEnrolled ? 'bg-success' : 'bg-primary'
            }`}
            onPress={handleEnroll}
            accessibilityRole="button"
            accessibilityHint={isEnrolled ? 'Asks to confirm unenrolling' : undefined}
          >
            <Text className="text-white text-base font-bold">
              {isEnrolled ? '✓ Enrolled' : 'Enroll Now'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-[50px] bg-primary-light rounded-[10px] justify-center items-center"
            onPress={() => toggleBookmark(courseId)}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark course'}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isBookmarked ? Colors.bookmark : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-secondary rounded-[10px] py-3.5 flex-row items-center justify-center gap-2"
          onPress={() =>
            router.push({
              pathname: '/webview',
              params: {
                title: course.title,
                instructor: course.instructorName,
                price: String(course.price),
                description: course.description,
                thumbnail: course.thumbnail,
              },
            })
          }
        >
          <Ionicons name="play-circle-outline" size={20} color="#fff" />
          <Text className="text-white text-[15px] font-bold">View Course Content</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
