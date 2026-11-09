import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Task } from '../types';
import { ThemeColors, lightTheme } from '../theme';

const colors: Record<string, string> = {
  baixa: '#64748B',
  media: '#2563EB',
  alta: '#D97706',
  urgente: '#DC2626'
};

export function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  onPostpone,
  onSubtasks,
  theme = lightTheme
}: {
  task: Task;
  onComplete: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onPostpone: (t: Task) => void;
  onSubtasks: (t: Task) => void;
  theme?: ThemeColors;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const overdue = !task.completed && new Date(task.dueAt).getTime() < Date.now();
  let reminderCount = 0;
  try {
    reminderCount = JSON.parse(task.notificationIds || '[]').length;
  } catch {}
  const date = new Date(task.dueAt);

  const handleToggleComplete = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true })
    ]).start(() => {
      onComplete(task);
    });
  };

  return (
    <Animated.View
      style={[
        s.glassCard,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder
        },
        !!task.completed && {
          opacity: 0.62,
          backgroundColor: theme.isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(248, 250, 252, 0.75)'
        },
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <Pressable onPress={handleToggleComplete} style={s.checkBtn} hitSlop={10}>
        <Feather
          name={task.completed ? 'check-circle' : 'circle'}
          size={23}
          color={task.completed ? theme.success : theme.subText}
        />
      </Pressable>

      <Pressable style={{ flex: 1 }} onPress={() => onEdit(task)}>
        <Text
          style={[
            s.title,
            { color: theme.text },
            !!task.completed && [s.strike, { color: theme.textMuted }]
          ]}
        >
          {task.title}
        </Text>
        <Text style={[s.meta, { color: theme.subText }]}>
          {task.category} · {date.toLocaleDateString('pt-BR')} às{' '}
          {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={s.tags}>
          <View style={[s.priority, { backgroundColor: colors[task.priority] + '22' }]}>
            <Text style={{ color: colors[task.priority], fontSize: 10, fontWeight: '800' }}>
              {task.priority.toUpperCase()}
            </Text>
          </View>
          {overdue && <Text style={[s.overdue, { color: theme.danger }]}>ATRASADA</Text>}
          {task.repeat !== 'nenhuma' && (
            <Feather name="repeat" size={13} color={theme.textMuted} />
          )}
          {reminderCount > 0 && (
            <Text style={[s.reminders, { color: theme.primary }]}>🔔 {reminderCount}</Text>
          )}
        </View>
      </Pressable>

      <View style={s.actions}>
        <Pressable onPress={() => onSubtasks(task)} hitSlop={8} style={s.actionBtn}>
          <Feather name="list" size={17} color={theme.textMuted} />
        </Pressable>
        {overdue && (
          <Pressable onPress={() => onPostpone(task)} hitSlop={8} style={s.actionBtn}>
            <Feather name="clock" size={17} color={theme.warning} />
          </Pressable>
        )}
        <Pressable onPress={() => onEdit(task)} hitSlop={8} style={s.actionBtn}>
          <Feather name="edit-2" size={17} color={theme.textMuted} />
        </Pressable>
        <Pressable onPress={() => onDelete(task)} hitSlop={8} style={s.actionBtn}>
          <Feather name="trash-2" size={17} color={theme.danger} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  checkBtn: {
    paddingRight: 12,
    paddingLeft: 2
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
    letterSpacing: -0.2
  },
  strike: {
    textDecorationLine: 'line-through'
  },
  meta: {
    fontSize: 12,
    marginBottom: 7,
    fontWeight: '500'
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap'
  },
  priority: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6
  },
  overdue: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  reminders: {
    fontSize: 11,
    fontWeight: '700'
  },
  actions: {
    flexDirection: 'row',
    gap: 2,
    paddingLeft: 4
  },
  actionBtn: {
    padding: 6
  }
});
