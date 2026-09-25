import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DateKey, StudySession, formatDateKey, sessionStatus } from '../../utils/studyPlan';

interface Props {
  session: StudySession;
  today: DateKey;
  subtitle?: string;
  onToggle: (sessionId: string) => void;
}

function SessionRow({ session, today, subtitle, onToggle }: Props) {
  const status = sessionStatus(session, today);
  const dateLabel =
    status === 'done'
      ? `Done · ${formatDateKey(session.completedOn!, today)}`
      : status === 'overdue'
      ? `Overdue · was ${formatDateKey(session.dueDate, today)}`
      : formatDateKey(session.dueDate, today);

  const dateColor =
    status === 'overdue' ? 'text-error' : status === 'today' ? 'text-primary' : status === 'done' ? 'text-success' : 'text-muted';

  return (
    <Pressable
      className={`flex-row items-center gap-3 px-3.5 py-3 border-b border-border ${
        status === 'overdue' ? 'bg-error/5' : ''
      }`}
      onPress={() => onToggle(session.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: status === 'done' }}
      accessibilityLabel={`${session.title}, ${dateLabel}`}
    >
      <Ionicons
        name={status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={status === 'done' ? Colors.success : status === 'overdue' ? Colors.error : Colors.textLight}
      />
      <View className="flex-1">
        {subtitle ? (
          <Text className="text-[11px] text-muted font-semibold uppercase" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text
          className={`text-sm font-semibold ${status === 'done' ? 'text-muted line-through' : 'text-foreground'}`}
          numberOfLines={2}
        >
          {session.title}
        </Text>
        <Text className={`text-xs mt-0.5 font-medium ${dateColor}`}>{dateLabel}</Text>
      </View>
    </Pressable>
  );
}

export default memo(SessionRow);
