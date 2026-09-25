import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext } from 'react';

export interface Course {
  id: string | number;
  title: string;
  description: string;
  price: number;
  category: string;
  thumbnail: string;
  rating: number;
  difficulty?: string;
  instructorName?: string;
  instructorAvatar?: string;
}

const BOOKMARKS_KEY = 'bookmarked_courses';
const ENROLLED_KEY = 'enrolled_courses';
const COURSES_CACHE_KEY = 'courses_cache';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Bookmarks/enrollments are stored per user so a second account on the same
 * device doesn't inherit them. Data saved by older builds under the global
 * key is migrated to the first user who logs in.
 */
async function loadUserList(baseKey: string, userId: string): Promise<string[]> {
  const userKey = `${baseKey}:${userId}`;
  const own = await AsyncStorage.getItem(userKey).catch(() => null);
  if (own) return readJson<string[]>(userKey, []);

  const legacy = await readJson<string[]>(baseKey, []);
  if (legacy.length > 0) {
    await AsyncStorage.setItem(userKey, JSON.stringify(legacy)).catch(() => {});
    await AsyncStorage.removeItem(baseKey).catch(() => {});
  }
  return legacy;
}

function saveUserList(baseKey: string, userId: string, ids: string[]): Promise<void> {
  return AsyncStorage.setItem(`${baseKey}:${userId}`, JSON.stringify(ids)).catch(() => {});
}

export const loadBookmarks = (userId: string) => loadUserList(BOOKMARKS_KEY, userId);
export const saveBookmarks = (userId: string, ids: string[]) => saveUserList(BOOKMARKS_KEY, userId, ids);
export const loadEnrolled = (userId: string) => loadUserList(ENROLLED_KEY, userId);
export const saveEnrolled = (userId: string, ids: string[]) => saveUserList(ENROLLED_KEY, userId, ids);

/** Last successfully fetched catalog, so bookmarks and details work offline. */
export const loadCachedCourses = () => readJson<Course[]>(COURSES_CACHE_KEY, []);
export function saveCachedCourses(courses: Course[]): Promise<void> {
  return AsyncStorage.setItem(COURSES_CACHE_KEY, JSON.stringify(courses)).catch(() => {});
}

/** The API's thumbnail URLs 404, so each course gets a stable, id-seeded placeholder. */
export function courseThumbnail(id: string | number): string {
  return `https://picsum.photos/seed/course-${id}/400/250`;
}

export interface CourseContextType {
  courses: Course[];
  bookmarks: string[];
  enrolled: string[];
  setCourses: (courses: Course[]) => void;
  toggleBookmark: (id: string) => void;
  toggleEnroll: (id: string) => void;
}

export const CourseContext = createContext<CourseContextType | null>(null);

export function useCourses() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error('useCourses must be used inside CourseProvider');
  return ctx;
}
