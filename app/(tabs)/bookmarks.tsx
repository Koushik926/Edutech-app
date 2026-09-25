import React, { useCallback, useMemo } from 'react';
import { FlatList, View, Text } from 'react-native';
import { Course, useCourses } from '../../store/courseStore';
import CourseCard from '../../components/CourseCard';
import OfflineBanner from '../../components/OfflineBanner';

export default function BookmarksScreen() {
  const { courses, bookmarks, toggleBookmark } = useCourses();
  const bookmarkedCourses = useMemo(() => {
    const ids = new Set(bookmarks);
    return courses.filter((c) => ids.has(String(c.id)));
  }, [courses, bookmarks]);

  const renderItem = useCallback(
    ({ item }: { item: Course }) => (
      <CourseCard course={item} isBookmarked onToggleBookmark={toggleBookmark} />
    ),
    [toggleBookmark]
  );

  return (
    <View className="flex-1 bg-background">
      <OfflineBanner />
      <FlatList
        data={bookmarkedCourses}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={
          <View className="items-center p-12">
            <Text className="text-5xl mb-3">🔖</Text>
            <Text className="text-lg font-bold text-foreground mb-2">No bookmarks yet</Text>
            <Text className="text-sm text-muted text-center leading-5">
              Bookmark courses to save them here for later
            </Text>
          </View>
        }
        contentContainerClassName="pt-3 pb-6"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
