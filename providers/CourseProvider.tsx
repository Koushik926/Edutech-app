import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Course,
  CourseContext,
  loadBookmarks,
  loadCachedCourses,
  loadEnrolled,
  saveBookmarks,
  saveCachedCourses,
  saveEnrolled,
} from '../store/courseStore';
import { useAuth } from '../store/authStore';
import { sendBookmarkNotification } from '../utils/notifications';

const BOOKMARK_MILESTONE = 5;

function toggled(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function CourseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?._id ?? null;

  const [courses, setCoursesState] = useState<Course[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [enrolled, setEnrolled] = useState<string[]>([]);

  // Refs mirror the latest lists so the toggles stay referentially stable
  // (memoized cards don't re-render) and side effects run outside setState.
  const bookmarksRef = useRef<string[]>([]);
  const enrolledRef = useRef<string[]>([]);

  useEffect(() => {
    loadCachedCourses().then((cached) => {
      setCoursesState((current) => (current.length === 0 ? cached : current));
    });
  }, []);

  useEffect(() => {
    bookmarksRef.current = [];
    enrolledRef.current = [];
    setBookmarks([]);
    setEnrolled([]);
    if (!userId) return;

    let active = true;
    Promise.all([loadBookmarks(userId), loadEnrolled(userId)]).then(([b, e]) => {
      if (!active) return;
      bookmarksRef.current = b;
      enrolledRef.current = e;
      setBookmarks(b);
      setEnrolled(e);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const setCourses = useCallback((next: Course[]) => {
    setCoursesState(next);
    saveCachedCourses(next);
  }, []);

  const toggleBookmark = useCallback(
    (id: string) => {
      if (!userId) return;
      const adding = !bookmarksRef.current.includes(id);
      const next = toggled(bookmarksRef.current, id);
      bookmarksRef.current = next;
      setBookmarks(next);
      saveBookmarks(userId, next);
      if (adding && next.length === BOOKMARK_MILESTONE) {
        sendBookmarkNotification(BOOKMARK_MILESTONE).catch(() => {});
      }
    },
    [userId]
  );

  const toggleEnroll = useCallback(
    (id: string) => {
      if (!userId) return;
      const next = toggled(enrolledRef.current, id);
      enrolledRef.current = next;
      setEnrolled(next);
      saveEnrolled(userId, next);
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      courses,
      bookmarks,
      enrolled,
      setCourses,
      toggleBookmark,
      toggleEnroll,
    }),
    [courses, bookmarks, enrolled, setCourses, toggleBookmark, toggleEnroll]
  );

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}
