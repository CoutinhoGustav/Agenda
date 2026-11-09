import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Task } from '../types';
import { ThemeColors, lightTheme } from '../theme';

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const colors: Record<string, string> = {
  baixa: '#64748B',
  media: '#2563EB',
  alta: '#D97706',
  urgente: '#DC2626'
};

export function CalendarScreen({
  tasks,
  onEdit,
  theme = lightTheme
}: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  theme?: ThemeColors;
}) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12, 0, 0));
  const [selected, setSelected] = useState(key(new Date()));
  const [mode, setMode] = useState<'mes' | 'semana'>('mes');

  const days = useMemo(() => {
    let start = new Date(month.getFullYear(), month.getMonth(), 1, 12, 0, 0);
    if (mode === 'semana') {
      start = new Date(selected + 'T12:00:00');
      start.setDate(start.getDate() - start.getDay());
    } else {
      start.setDate(1 - start.getDay());
    }
    return Array.from({ length: mode === 'mes' ? 42 : 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month, selected, mode]);

  const selectedTasks = tasks
    .filter(t => key(new Date(t.dueAt)) === selected)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
      {/* Glass Month Selector Bar */}
      <View
        style={[
          s.glassBar,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder
          }
        ]}
      >
        <Pressable
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12, 0, 0))}
          style={s.navArrow}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={theme.text} />
        </Pressable>
        <View style={s.monthTitleWrap}>
          <Feather name="calendar" size={16} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[s.month, { color: theme.text }]}>
            {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <Pressable
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12, 0, 0))}
          style={s.navArrow}
          hitSlop={10}
        >
          <Feather name="chevron-right" size={22} color={theme.text} />
        </Pressable>
      </View>

      {/* Glass Mode Switcher */}
      <View style={s.modes}>
        {(['mes', 'semana'] as const).map(m => {
          const isActive = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[
                s.mode,
                {
                  backgroundColor: isActive ? theme.primary : theme.chipBg,
                  borderColor: isActive ? theme.primary : theme.chipBorder
                }
              ]}
            >
              <Text style={isActive ? s.activeText : [s.modeText, { color: theme.textMuted }]}>
                {m === 'mes' ? 'Mês' : 'Semana'}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[
            s.todayBtn,
            {
              backgroundColor: theme.statTodayBg,
              borderColor: theme.chipBorder
            }
          ]}
          onPress={() => {
            const d = new Date();
            setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0));
            setSelected(key(d));
          }}
        >
          <Feather name="clock" size={13} color={theme.primary} style={{ marginRight: 4 }} />
          <Text style={[s.today, { color: theme.primary }]}>Hoje</Text>
        </Pressable>
      </View>

      {/* Glass Calendar Grid */}
      <View
        style={[
          s.glassGrid,
          {
            backgroundColor: theme.glassBg,
            borderColor: theme.glassBorder
          }
        ]}
      >
        <View style={s.weekRow}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((x, i) => (
            <Text key={i} style={[s.week, { color: theme.subText }]}>
              {x}
            </Text>
          ))}
        </View>
        <View style={s.daysWrap}>
          {days.map((d, i) => {
            const k = key(d);
            const active = k === selected;
            const has = tasks.some(t => key(new Date(t.dueAt)) === k);
            return (
              <Pressable
                key={i}
                onPress={() => {
                  setSelected(k);
                  setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0));
                }}
                style={[
                  s.day,
                  active && [s.dayActive, { backgroundColor: theme.primary }],
                  mode === 'mes' && d.getMonth() !== month.getMonth() && s.dim
                ]}
              >
                <Text
                  style={[
                    s.dayText,
                    { color: theme.text },
                    active && s.white
                  ]}
                >
                  {d.getDate()}
                </Text>
                {has && (
                  <View
                    style={[
                      s.dot,
                      { backgroundColor: theme.primary },
                      active && s.dotActive
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Agenda Heading */}
      <View style={s.agendaHead}>
        <Text style={[s.agenda, { color: theme.text }]}>Atividades do Dia</Text>
        <Text style={[s.agendaDate, { color: theme.subText }]}>
          {new Date(selected + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
        </Text>
      </View>

      {/* Event Cards with Glassmorphism */}
      {selectedTasks.length === 0 ? (
        <View
          style={[
            s.emptyGlass,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder
            }
          ]}
        >
          <Feather name="coffee" size={32} color={theme.subText} />
          <Text style={[s.empty, { color: theme.text }]}>Nenhuma atividade neste dia</Text>
          <Text style={[s.emptySub, { color: theme.subText }]}>Aproveite o tempo livre ou planeje uma tarefa.</Text>
        </View>
      ) : (
        selectedTasks.map(t => {
          const d = new Date(t.dueAt);
          return (
            <Pressable
              key={t.id}
              style={[
                s.glassEvent,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder
                }
              ]}
              onPress={() => onEdit(t)}
            >
              <View style={[s.stripe, { backgroundColor: colors[t.priority] || theme.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.eventTitle, { color: theme.text }, !!t.completed && s.strike]}>
                  {t.title}
                </Text>
                <Text style={[s.meta, { color: theme.subText }]}>
                  {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {t.category}
                </Text>
              </View>
              <View
                style={[
                  s.eventCheck,
                  { backgroundColor: t.completed ? theme.success + '22' : theme.eventCheckBg }
                ]}
              >
                <Feather
                  name={t.completed ? 'check-circle' : 'clock'}
                  size={16}
                  color={t.completed ? theme.success : theme.subText}
                />
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: {
    padding: 20,
    paddingBottom: 130
  },
  glassBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  navArrow: {
    padding: 8,
    borderRadius: 12
  },
  monthTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  month: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize'
  },
  modes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  },
  mode: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1
  },
  modeText: { fontSize: 12, fontWeight: '700' },
  activeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  todayBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1
  },
  today: { fontWeight: '800', fontSize: 12 },

  glassGrid: {
    borderRadius: 24,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2
  },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  week: { width: '14.2857%', textAlign: 'center', paddingVertical: 6, fontWeight: '800', fontSize: 11 },
  daysWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayActive: {
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4
  },
  dim: { opacity: 0.28 },
  dayText: { fontSize: 13, fontWeight: '700' },
  white: { color: '#FFFFFF', fontWeight: '800' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotActive: { backgroundColor: '#FFFFFF' },

  agendaHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 12 },
  agenda: { fontSize: 17, fontWeight: '800' },
  agendaDate: { fontSize: 12, fontWeight: '600' },

  emptyGlass: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 8
  },
  empty: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 12 },

  glassEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  stripe: { width: 4, height: 36, borderRadius: 4 },
  eventTitle: { fontWeight: '800', fontSize: 14 },
  strike: { textDecorationLine: 'line-through' },
  meta: { fontSize: 11, marginTop: 4 },
  eventCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }
});
