import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Course, courseThumbnail, useCourses } from '../../store/courseStore';
import { fetchCourses, fetchInstructors } from '../../utils/api';
import CourseCard from '../../components/CourseCard';
import SearchBar from '../../components/SearchBar';
import OfflineBanner from '../../components/OfflineBanner';
import { Colors } from '../../constants/colors';

interface ApiProduct {
  id: number | string;
  title: string;
  description: string;
  price: number;
  category: string;
  thumbnail: string;
  rating?: number | { rate?: number };
}

interface ApiUser {
  name?: { first?: string; last?: string } | string;
  picture?: { thumbnail?: string; medium?: string };
}

interface ProductsResponse {
  data: { data: ApiProduct[] };
}

interface UsersResponse {
  data: { data: ApiUser[] };
}

function buildCourses(products: ApiProduct[], users: ApiUser[]): Course[] {
  return products.map((p, i) => {
    const user = users[i % users.length];
    const name = user?.name;
    const instructorName =
      typeof name === 'string'
        ? name
        : name
        ? `${name.first ?? ''} ${name.last ?? ''}`.trim()
        : 'Unknown';
    const instructorAvatar =
      user?.picture?.thumbnail ?? user?.picture?.medium ?? '';
    const rating =
      typeof p.rating === 'number'
        ? p.rating
        : typeof p.rating === 'object' && p.rating?.rate !== undefined
        ? p.rating.rate
        : 0;
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      category: p.category,
      thumbnail: courseThumbnail(p.id),
      rating,
      instructorName,
      instructorAvatar,
    };
  });
}

export default function CoursesScreen() {
  const { courses, setCourses, bookmarks, toggleBookmark } = useCourses();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [products, users] = await Promise.all([
        fetchCourses() as Promise<ProductsResponse>,
        fetchInstructors() as Promise<UsersResponse>,
      ]);
      const built = buildCourses(products.data.data, users.data.data);
      setCourses(built);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [setCourses]);

  // Always fetch once on mount; cached courses (if any) stay visible meanwhile.
  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.instructorName ?? '').toLowerCase().includes(q)
    );
  }, [courses, search]);

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  const renderItem = useCallback(
    ({ item }: { item: Course }) => (
      <CourseCard
        course={item}
        isBookmarked={bookmarkSet.has(String(item.id))}
        onToggleBookmark={toggleBookmark}
      />
    ),
    [bookmarkSet, toggleBookmark]
  );

  return (
    <View className="flex-1 bg-background">
      <OfflineBanner />
      {loadError && courses.length > 0 && (
        <View className="bg-warning/15 px-4 py-2">
          <Text className="text-foreground text-xs text-center">
            Couldn&apos;t refresh courses — showing your last saved list.
          </Text>
        </View>
      )}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={
          <SearchBar value={search} onChangeText={setSearch} />
        }
        ListEmptyComponent={
          loading && !refreshing ? (
            <View className="items-center p-10">
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : loadError ? (
            <View className="items-center p-10">
              <Text className="text-error text-sm text-center mb-3">{loadError}</Text>
              <TouchableOpacity className="bg-primary rounded-lg px-5 py-2.5" onPress={loadData}>
                <Text className="text-white font-bold text-sm">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center p-10">
              <Text className="text-muted text-sm">No courses found</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        contentContainerClassName="pt-3 pb-6"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
