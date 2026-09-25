import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { toDateKey } from '../utils/studyPlan';

/** Today's date key, refreshed when the app returns to the foreground (e.g. after midnight). */
export function useToday() {
  const [today, setToday] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(toDateKey(new Date()));
    });
    return () => sub.remove();
  }, []);

  return today;
}
