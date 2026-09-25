import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { Course } from '../store/courseStore';

interface Props {
  course: Course;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}

// Bookmark state comes in as props (not from context) so memo() can skip
// re-rendering every card when a single bookmark changes.
function CourseCard({ course, isBookmarked, onToggleBookmark }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      className="bg-surface rounded-xl mx-4 mb-3.5 overflow-hidden shadow-md elevation-3"
      onPress={() => router.push(`/course/${course.id}`)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${course.title}, by ${course.instructorName ?? 'Unknown'}`}
    >
      <Image
        source={{ uri: course.thumbnail }}
        className="w-full h-40 bg-border"
        contentFit="cover"
        transition={200}
        recyclingKey={String(course.id)}
      />
      <View className="p-3">
        <View className="flex-row items-center mb-1.5">
          <Image
            source={course.instructorAvatar ? { uri: course.instructorAvatar } : undefined}
            className="w-6 h-6 rounded-full mr-1.5 bg-border"
            contentFit="cover"
          />
          <Text className="text-xs text-primary font-semibold flex-1" numberOfLines={1}>
            {course.instructorName ?? 'Unknown'}
          </Text>
        </View>
        <Text className="text-[15px] font-bold text-foreground mb-1" numberOfLines={2}>
          {course.title}
        </Text>
        <Text className="text-[13px] text-muted leading-[18px] mb-2" numberOfLines={2}>
          {course.description}
        </Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-[15px] font-bold text-secondary">
            ${course.price.toFixed(2)}
          </Text>
          <Pressable
            onPress={() => onToggleBookmark(String(course.id))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark course'}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isBookmarked ? Colors.bookmark : Colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default memo(CourseCard);
