import React from 'react';
import { View } from 'react-native';

export default function ProgressBar({ progress, done }: { progress: number; done?: boolean }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <View
      className="h-2 rounded-full bg-border overflow-hidden"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View className={`h-full rounded-full ${done ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
    </View>
  );
}
