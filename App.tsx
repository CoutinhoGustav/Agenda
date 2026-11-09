import './src/bootstrap';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  LogBox,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { isRunningInExpoGo } from 'expo';
import { Task, TaskInput, Subtask } from './src/types';
import {
  addSubtask,
  createTask,
  deleteTask,
  getDailyGoal,
  getSetting,
  getSubtasks,
  getTasks,
  removeSubtask,
  setDailyGoal,
  setSetting,
  setTaskCompleted,
  toggleSubtask,
  updateTask
} from './src/services/database';
import {
  cancelReminders,
  checkNotificationPermissions,
  requestPushNotificationPermissions,
  scheduleReminders,
  sendInstantTestNotification
} from './src/services/notifications';
import { nextOccurrence } from './src/services/recurrence';
import { TaskCard } from './src/components/TaskCard';
import { TaskForm } from './src/screens/TaskForm';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { CalendarAppIcon } from './src/components/CalendarAppIcon';
import { LoadingScreen } from './src/components/LoadingScreen';
import { ThemeColors, ThemeMode, lightTheme, darkTheme } from './src/theme';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'SafeAreaView has been deprecated'
]);

type Tab = 'inicio' | 'calendario' | 'tarefas' | 'historico' | 'ajustes';
type Filter = 'todas' | 'pendentes' | 'concluidas' | 'atrasadas';
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inExpoGo = isRunningInExpoGo();

function AgendaApp() {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('sistema');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<Tab>('inicio');
  const [filter, setFilter] = useState<Filter>('todas');
  const [editing, setEditing] = useState<Task | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [search, setSearch] = useState('');
  const [goal, setGoal] = useState(5);
  const [subtaskTask, setSubtaskTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  const fabScale = useRef(new Animated.Value(1)).current;
  const deleteModalScale = useRef(new Animated.Value(0.85)).current;
  const subtaskModalScale = useRef(new Animated.Value(0.85)).current;

  // Active theme calculation
  const theme: ThemeColors = useMemo(() => {
    if (themeMode === 'claro') return lightTheme;
    if (themeMode === 'escuro') return darkTheme;
    return systemColorScheme === 'dark' ? darkTheme : lightTheme;
  }, [themeMode, systemColorScheme]);

  const refresh = useCallback(async () => setTasks(await getTasks()), []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
        setGoal(await getDailyGoal());
      } catch (e) {
        console.warn('Erro ao inicializar banco de dados:', e);
      }

      try {
        const savedTheme = await getSetting('theme_mode');
        if (savedTheme === 'claro' || savedTheme === 'escuro' || savedTheme === 'sistema') {
          setThemeMode(savedTheme as ThemeMode);
        }
      } catch (e) {
        console.warn('Erro ao carregar tema:', e);
      }

      try {
        const isGranted = await checkNotificationPermissions();
        setNotificationsEnabled(isGranted);
        const promptShown = await getSetting('notification_prompt_shown');
        if (!promptShown && !isGranted) {
          setPermissionModalVisible(true);
        }
      } catch (e) {
        console.warn('Erro ao inicializar notificações:', e);
      } finally {
        // Small delay so the user can appreciate the polished loading animation
        setTimeout(() => setReady(true), 400);
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (deletingTask) {
      deleteModalScale.setValue(0.85);
      Animated.spring(deleteModalScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
    }
  }, [deletingTask, deleteModalScale]);

  useEffect(() => {
    if (subtaskTask) {
      subtaskModalScale.setValue(0.85);
      Animated.spring(subtaskModalScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
    }
  }, [subtaskTask, subtaskModalScale]);

  const today = dayKey(new Date());
  const counts = useMemo(() => {
    const pending = tasks.filter(t => !t.completed);
    return {
      today: pending.filter(t => dayKey(new Date(t.dueAt)) === today).length,
      doneToday: tasks.filter(t => !!t.completed && dayKey(new Date(t.dueAt)) === today).length,
      overdue: pending.filter(t => new Date(t.dueAt).getTime() < Date.now()).length,
      completed: tasks.filter(t => !!t.completed).length
    };
  }, [tasks, today]);

  const handleSelectTheme = async (mode: ThemeMode) => {
    setThemeMode(mode);
    await setSetting('theme_mode', mode);
  };

  const handleGrantNotifications = async () => {
    const result = await requestPushNotificationPermissions();
    await setSetting('notification_prompt_shown', 'true');
    if (result.token) {
      await setSetting('push_token', result.token);
    }
    setNotificationsEnabled(result.granted);
    setPermissionModalVisible(false);
    if (result.granted) {
      await sendInstantTestNotification();
    }
  };

  const handleDismissNotificationPrompt = async () => {
    await setSetting('notification_prompt_shown', 'true');
    setPermissionModalVisible(false);
  };

  const handleTestNotification = async () => {
    if (!notificationsEnabled) {
      const res = await requestPushNotificationPermissions();
      setNotificationsEnabled(res.granted);
      if (!res.granted) {
        Alert.alert(
          'Permissão necessária',
          'Para receber lembretes pontuais, permita as notificações nas configurações do seu celular.'
        );
        return;
      }
    }
    await sendInstantTestNotification();
    Alert.alert('🔔 Notificação enviada!', 'Uma notificação foi disparada com sucesso no seu aparelho.');
  };

  const remindersFor = async (input: TaskInput) =>
    notificationsEnabled ? scheduleReminders(input.title, input.dueAt, input.reminders) : [];

  const saveTask = async (input: TaskInput) => {
    const ids = await remindersFor(input);
    if (editing) {
      await cancelReminders(editing.notificationIds);
      await updateTask(editing.id, input, ids);
    } else {
      await createTask(input, ids);
    }
    setFormVisible(false);
    setEditing(null);
    await refresh();
  };

  const completeTask = async (task: Task) => {
    const done = !task.completed;
    await cancelReminders(task.notificationIds);
    await setTaskCompleted(task.id, done);
    if (done && task.repeat !== 'nenhuma') {
      let days: number[] = [];
      try {
        days = JSON.parse(task.repeatDays || '[]');
      } catch {}
      const next = nextOccurrence(task.dueAt, task.repeat, days);
      if (next) {
        let rem = [10];
        try {
          rem = JSON.parse(task.reminderOffsets || '[10]');
        } catch {}
        const input: TaskInput = {
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          dueAt: next,
          repeat: task.repeat,
          repeatDays: days,
          reminders: rem
        };
        await createTask(input, await remindersFor(input));
      }
    }
    await refresh();
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    await cancelReminders(deletingTask.notificationIds);
    await deleteTask(deletingTask.id);
    setDeletingTask(null);
    await refresh();
  };

  const postpone = async (task: Task) => {
    const d = new Date(task.dueAt);
    d.setDate(d.getDate() + 1);
    let rem = [10];
    try {
      rem = JSON.parse(task.reminderOffsets || '[10]');
    } catch {}
    let days: number[] = [];
    try {
      days = JSON.parse(task.repeatDays || '[]');
    } catch {}
    const input: TaskInput = {
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      dueAt: d.toISOString(),
      repeat: task.repeat,
      repeatDays: days,
      reminders: rem
    };
    await cancelReminders(task.notificationIds);
    await updateTask(task.id, input, await remindersFor(input));
    await refresh();
  };

  const openSubtasks = async (task: Task) => {
    setSubtaskTask(task);
    setSubtasks(await getSubtasks(task.id));
    setNewSubtask('');
  };

  const addSubtaskNow = async () => {
    if (!subtaskTask || !newSubtask.trim()) return;
    await addSubtask(subtaskTask.id, newSubtask);
    setNewSubtask('');
    setSubtasks(await getSubtasks(subtaskTask.id));
  };

  const animateFabAndOpen = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true })
    ]).start(() => {
      setEditing(null);
      setFormVisible(true);
    });
  };

  const visibleTasks = useMemo(() => {
    let result = [...tasks];
    if (tab === 'historico' || filter === 'concluidas') result = result.filter(t => !!t.completed);
    else if (filter === 'pendentes') result = result.filter(t => !t.completed);
    else if (filter === 'atrasadas')
      result = result.filter(t => !t.completed && new Date(t.dueAt).getTime() < Date.now());
    else if (tab === 'inicio') result = result.filter(t => !t.completed && dayKey(new Date(t.dueAt)) === today);
    if (search.trim())
      result = result.filter(t =>
        `${t.title} ${t.description} ${t.category}`.toLowerCase().includes(search.toLowerCase())
      );
    return result;
  }, [tasks, tab, filter, search, today]);

  const nav: { id: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: 'inicio', label: 'Início', icon: 'home' },
    { id: 'calendario', label: 'Calendário', icon: 'calendar' },
    { id: 'tarefas', label: 'Tarefas', icon: 'check-square' },
    { id: 'historico', label: 'Histórico', icon: 'clock' },
    { id: 'ajustes', label: 'Ajustes', icon: 'settings' }
  ];

  const title = ({
    inicio: 'Minha Agenda',
    calendario: 'Calendário',
    tarefas: 'Minhas tarefas',
    historico: 'Histórico',
    ajustes: 'Configurações'
  } as Record<Tab, string>)[tab];

  // Modern Animated Loading Screen
  if (!ready) {
    return <LoadingScreen theme={theme} />;
  }

  const goalPercent = Math.min(100, Math.round((counts.doneToday / Math.max(goal, 1)) * 100));

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <ExpoStatusBar style={theme.isDark ? 'light' : 'dark'} translucent={true} />
      <StatusBar
        backgroundColor="transparent"
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        translucent={true}
      />

      {/* Glass Header */}
      <View
        style={[
          s.glassHeader,
          {
            backgroundColor: theme.glassBg,
            borderColor: theme.glassBorder
          }
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.date, { color: theme.subText }]}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={[s.heading, { color: theme.text }]}>{title}</Text>
        </View>
        <View style={[s.headerIcon, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}>
          <Feather name="calendar" size={22} color={theme.primary} />
        </View>
      </View>

      {/* Main Content Area */}
      <View style={s.mainBody}>
        {tab === 'inicio' && (
          <FlatList
            data={visibleTasks}
            keyExtractor={t => String(t.id)}
            contentContainerStyle={s.listWithHeader}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={{ marginBottom: 10, paddingHorizontal: 20 }}>
                {/* Glass Summary Cards */}
                <View style={s.summary}>
                  <View
                    style={[
                      s.statGlass,
                      {
                        backgroundColor: theme.statTodayBg,
                        borderColor: theme.cardBorder
                      }
                    ]}
                  >
                    <Text style={[s.statNum, { color: theme.primary }]}>{counts.today}</Text>
                    <Text style={[s.statLabel, { color: theme.textMuted }]}>Hoje</Text>
                  </View>
                  <View
                    style={[
                      s.statGlass,
                      {
                        backgroundColor: theme.statDoneBg,
                        borderColor: theme.cardBorder
                      }
                    ]}
                  >
                    <Text style={[s.statNum, { color: theme.success }]}>{counts.doneToday}</Text>
                    <Text style={[s.statLabel, { color: theme.textMuted }]}>Feitas hoje</Text>
                  </View>
                  <View
                    style={[
                      s.statGlass,
                      {
                        backgroundColor: theme.statOverdueBg,
                        borderColor: theme.cardBorder
                      }
                    ]}
                  >
                    <Text style={[s.statNum, { color: theme.danger }]}>{counts.overdue}</Text>
                    <Text style={[s.statLabel, { color: theme.textMuted }]}>Atrasadas</Text>
                  </View>
                </View>

                {/* Glass Goal Card */}
                <Pressable
                  style={[
                    s.glassGoalCard,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.cardBorder
                    }
                  ]}
                  onPress={() => setGoalModalVisible(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.goalTitle, { color: theme.text }]}>Meta diária</Text>
                      <Text style={[s.goalSub, { color: theme.subText }]}>
                        {Math.min(counts.doneToday, goal)} de {goal} tarefas concluídas
                      </Text>
                    </View>
                    <View
                      style={[
                        s.goalBadge,
                        {
                          backgroundColor: theme.primaryLight,
                          borderColor: theme.primaryLight
                        }
                      ]}
                    >
                      <Text style={[s.goalBadgeText, { color: theme.primary }]}>{goalPercent}%</Text>
                    </View>
                  </View>
                  <View style={[s.track, { backgroundColor: theme.border }]}>
                    <View style={[s.fill, { width: `${goalPercent}%`, backgroundColor: theme.primary }]} />
                  </View>
                </Pressable>

                <Text style={[s.section, { color: theme.text }]}>Atividades de hoje</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 20 }}>
                <TaskCard
                  task={item}
                  theme={theme}
                  onComplete={completeTask}
                  onEdit={t => {
                    setEditing(t);
                    setFormVisible(true);
                  }}
                  onDelete={t => setDeletingTask(t)}
                  onPostpone={postpone}
                  onSubtasks={openSubtasks}
                />
              </View>
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Feather name="inbox" size={38} color={theme.subText} />
                <Text style={[s.emptyTitle, { color: theme.text }]}>Nada pendente para hoje</Text>
                <Text style={[s.muted, { color: theme.subText }]}>
                  Aproveite o seu dia ou adicione uma nova atividade.
                </Text>
              </View>
            }
          />
        )}

        {tab === 'calendario' && (
          <CalendarScreen
            tasks={tasks}
            theme={theme}
            onEdit={t => {
              setEditing(t);
              setFormVisible(true);
            }}
          />
        )}

        {(tab === 'tarefas' || tab === 'historico') && (
          <View style={{ flex: 1 }}>
            <View style={s.filters}>
              {(['todas', 'pendentes', 'concluidas', 'atrasadas'] as Filter[]).map(f => {
                const isActive = filter === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[
                      s.filterGlass,
                      {
                        backgroundColor: isActive ? theme.primary : theme.chipBg,
                        borderColor: isActive ? theme.primary : theme.chipBorder
                      }
                    ]}
                  >
                    <Text
                      style={[
                        s.filterText,
                        { color: isActive ? '#FFFFFF' : theme.chipText },
                        isActive && s.filterTextOn
                      ]}
                    >
                      {f}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View
              style={[
                s.searchWrap,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder
                }
              ]}
            >
              <Feather name="search" size={17} color={theme.subText} style={{ marginRight: 8 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar tarefa, descrição ou categoria..."
                placeholderTextColor={theme.subText}
                style={[s.searchInput, { color: theme.text }]}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Feather name="x-circle" size={16} color={theme.subText} />
                </Pressable>
              )}
            </View>
            <FlatList
              data={visibleTasks}
              keyExtractor={t => String(t.id)}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TaskCard
                  task={item}
                  theme={theme}
                  onComplete={completeTask}
                  onEdit={t => {
                    setEditing(t);
                    setFormVisible(true);
                  }}
                  onDelete={t => setDeletingTask(t)}
                  onPostpone={postpone}
                  onSubtasks={openSubtasks}
                />
              )}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Feather name="inbox" size={38} color={theme.subText} />
                  <Text style={[s.emptyTitle, { color: theme.text }]}>Nenhuma atividade encontrada</Text>
                  <Text style={[s.muted, { color: theme.subText }]}>
                    Tente buscar outro termo ou alterar os filtros.
                  </Text>
                </View>
              }
            />
          </View>
        )}

        {tab === 'ajustes' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.settings}
            showsVerticalScrollIndicator={false}
          >
            {/* Card de Apresentação Oficial do App com o Ícone 3D Glass */}
            <View
              style={[
                s.appPresentationCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder
                }
              ]}
            >
              <View style={s.appPresentationContent}>
                <View style={s.iconWrapper}>
                  <CalendarAppIcon size={78} isDark={theme.isDark} />
                </View>
                <View style={{ flex: 1, paddingLeft: 16 }}>
                  <View style={s.badgeWrap}>
                    <Text style={[s.versionBadge, { backgroundColor: theme.primaryLight, color: theme.primary }]}>
                      v2.0 Glass Edition
                    </Text>
                  </View>
                  <Text style={[s.appName, { color: theme.text }]}>Agenda Inteligente</Text>
                  <Text style={[s.appTagline, { color: theme.subText }]}>
                    Design Glassmorphic, SQLite offline nativo e notificações ativas no aparelho.
                  </Text>
                </View>
              </View>
            </View>

            {/* SELETOR DE MODO CLARO / ESCURO / SISTEMA */}
            <View
              style={[
                s.settingBox,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder
                }
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[s.settingIcon, { backgroundColor: theme.primaryLight }]}>
                  <Feather name={theme.isDark ? 'moon' : 'sun'} size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.settingTitle, { color: theme.text }]}>Aparência e Tema</Text>
                  <Text style={[s.settingDesc, { color: theme.subText }]}>
                    Escolha entre modo claro, modo escuro ou sincronizar com o sistema.
                  </Text>
                </View>
              </View>

              {/* Theme Selector Buttons with Glassmorphic styling */}
              <View style={s.themeRow}>
                {(
                  [
                    { id: 'claro', label: 'Claro', icon: 'sun' },
                    { id: 'escuro', label: 'Escuro', icon: 'moon' },
                    { id: 'sistema', label: 'Sistema', icon: 'smartphone' }
                  ] as { id: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }[]
                ).map(item => {
                  const active = themeMode === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        s.themeButton,
                        {
                          backgroundColor: active ? theme.primary : theme.chipBg,
                          borderColor: active ? theme.primary : theme.chipBorder
                        }
                      ]}
                      onPress={() => handleSelectTheme(item.id)}
                    >
                      <Feather
                        name={item.icon}
                        size={17}
                        color={active ? '#FFFFFF' : theme.textMuted}
                        style={{ marginBottom: 4 }}
                      />
                      <Text
                        style={[
                          s.themeButtonText,
                          { color: active ? '#FFFFFF' : theme.textMuted },
                          active && { fontWeight: '800' }
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Banco de Dados Local */}
            <View
              style={[
                s.settingCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder
                }
              ]}
            >
              <View style={[s.settingIcon, { backgroundColor: theme.primaryLight }]}>
                <Feather name="database" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.settingTitle, { color: theme.text }]}>Banco de dados local</Text>
                <Text style={[s.settingDesc, { color: theme.subText }]}>
                  SQLite nativo. Seus dados e atividades ficam salvos offline no aparelho.
                </Text>
              </View>
              <View style={s.tagActive}>
                <Text style={s.ok}>Ativo</Text>
              </View>
            </View>

            {/* Lembretes e Notificações */}
            <View
              style={[
                s.settingCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder
                }
              ]}
            >
              <View style={[s.settingIcon, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="bell" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.settingTitle, { color: theme.text }]}>Lembretes e Notificações</Text>
                <Text style={[s.settingDesc, { color: theme.subText }]}>
                  {inExpoGo
                    ? 'Rodando no Expo Go. Lembretes locais e notificações ativas no aparelho.'
                    : 'Notificações locais e push salvas no aparelho.'}
                </Text>
              </View>
              <View style={notificationsEnabled ? s.tagActive : s.tagOff}>
                <Text style={notificationsEnabled ? s.ok : s.off}>
                  {notificationsEnabled ? 'Ativas' : 'Desativadas'}
                </Text>
              </View>
            </View>

            {/* Botão de teste rápido de notificação */}
            <Pressable
              style={[
                s.testNotifBtn,
                {
                  backgroundColor: theme.primaryLight,
                  borderColor: theme.border
                }
              ]}
              onPress={handleTestNotification}
            >
              <Feather name="bell" size={17} color={theme.primary} />
              <Text style={[s.testNotifBtnText, { color: theme.primary }]}>
                {notificationsEnabled ? 'Testar Envio de Notificação Agora' : 'Ativar e Testar Notificações'}
              </Text>
              <Feather name="chevron-right" size={16} color={theme.primary} style={{ marginLeft: 'auto' }} />
            </Pressable>

            {/* Meta diária */}
            <View
              style={[
                s.settingBox,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder
                }
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[s.settingIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Feather name="target" size={20} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.settingTitle, { color: theme.text }]}>Meta diária de conclusão</Text>
                  <Text style={[s.settingDesc, { color: theme.subText }]}>
                    Quantas atividades você planeja finalizar a cada dia.
                  </Text>
                </View>
              </View>
              <View
                style={[
                  s.goalControls,
                  {
                    backgroundColor: theme.chipBg,
                    borderColor: theme.chipBorder
                  }
                ]}
              >
                <Pressable
                  style={[s.goalBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
                  onPress={async () => {
                    const n = Math.max(1, goal - 1);
                    setGoal(n);
                    await setDailyGoal(n);
                  }}
                  hitSlop={8}
                >
                  <Feather name="minus" color={theme.primary} size={20} />
                </Pressable>
                <View style={s.goalCenter}>
                  <Text style={[s.goalValue, { color: theme.text }]}>{goal}</Text>
                  <Text style={[s.goalUnit, { color: theme.subText }]}>tarefas/dia</Text>
                </View>
                <Pressable
                  style={[s.goalBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
                  onPress={async () => {
                    const n = Math.min(30, goal + 1);
                    setGoal(n);
                    await setDailyGoal(n);
                  }}
                  hitSlop={8}
                >
                  <Feather name="plus" color={theme.primary} size={20} />
                </Pressable>
              </View>
            </View>

            <View
              style={[
                s.infoBox,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder
                }
              ]}
            >
              <Feather name="info" size={18} color={theme.subText} />
              <Text style={[s.infoText, { color: theme.subText }]}>
                Agenda Inteligente · Versão 2.0{'\n'}Design moderno com Glassmorphism, alternância de tema e modo
                imersivo sem conflito com barras de navegação.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Floating Action Button (Nova Atividade) */}
      {(tab === 'inicio' || tab === 'tarefas' || tab === 'historico') && (
        <Animated.View style={[s.fabWrapper, { transform: [{ scale: fabScale }] }]}>
          <Pressable style={[s.fab, { backgroundColor: theme.primary }]} onPress={animateFabAndOpen}>
            <Feather name="plus" size={20} color="#FFF" />
            <Text style={s.fabText}>Nova atividade</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Modern Glassmorphic Navigation Menu - Pinned in the exact same position across all tabs */}
      <View style={s.glassNavWrapper} pointerEvents="box-none">
        <View
          style={[
            s.glassNav,
            {
              backgroundColor: theme.navBg,
              borderColor: theme.navBorder
            }
          ]}
        >
          {nav.map(item => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                style={[
                  s.glassNavItem,
                  active && [s.glassNavItemActive, { backgroundColor: theme.navItemActive }]
                ]}
                onPress={() => {
                  setTab(item.id);
                  setFilter('todas');
                  setSearch('');
                }}
              >
                <Feather name={item.icon} size={20} color={active ? theme.primary : theme.textMuted} />
                <Text
                  style={[
                    s.glassNavLabel,
                    { color: active ? theme.primary : theme.textMuted },
                    active && s.glassNavLabelActive
                  ]}
                >
                  {item.label}
                </Text>
                {active && <View style={[s.activeDot, { backgroundColor: theme.primary }]} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* MODAL 1: Form de Criação/Edição de Tarefas */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setFormVisible(false);
          setEditing(null);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'left', 'right']}>
          <TaskForm
            task={editing}
            theme={theme}
            onSave={saveTask}
            onCancel={() => {
              setFormVisible(false);
              setEditing(null);
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* MODAL 2: Confirmação de Exclusão */}
      <Modal
        visible={!!deletingTask}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeletingTask(null)}
      >
        <View style={[s.backdrop, { backgroundColor: theme.modalBackdrop }]}>
          <Animated.View
            style={[
              s.confirmCard,
              {
                backgroundColor: theme.modalBg,
                borderColor: theme.cardBorder,
                transform: [{ scale: deleteModalScale }]
              }
            ]}
          >
            <View style={s.deleteIconWrap}>
              <Feather name="trash-2" size={26} color="#DC2626" />
            </View>
            <Text style={[s.confirmTitle, { color: theme.text }]}>Excluir atividade?</Text>
            <Text style={[s.confirmDesc, { color: theme.subText }]}>
              Deseja realmente remover &quot;
              <Text style={{ fontWeight: '700', color: theme.text }}>{deletingTask?.title}</Text>
              &quot;? Todas as subtarefas e lembretes associados serão excluídos.
            </Text>
            <View style={s.confirmActions}>
              <Pressable
                style={[s.btnCancel, { backgroundColor: theme.chipBg }]}
                onPress={() => setDeletingTask(null)}
              >
                <Text style={[s.btnCancelText, { color: theme.textMuted }]}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.btnDelete} onPress={confirmDelete}>
                <Text style={s.btnDeleteText}>Sim, excluir</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* MODAL 3: Subtarefas */}
      <Modal
        visible={!!subtaskTask}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSubtaskTask(null)}
      >
        <View style={[s.backdrop, { backgroundColor: theme.modalBackdrop }]}>
          <Animated.View
            style={[
              s.modalCard,
              {
                backgroundColor: theme.modalBg,
                borderColor: theme.cardBorder,
                transform: [{ scale: subtaskModalScale }]
              }
            ]}
          >
            <View style={s.modalHead}>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalTitle, { color: theme.text }]}>Subtarefas</Text>
                <Text style={[s.modalSub, { color: theme.subText }]} numberOfLines={1}>
                  {subtaskTask?.title}
                </Text>
              </View>
              <Pressable
                onPress={() => setSubtaskTask(null)}
                hitSlop={10}
                style={[s.closeCircle, { backgroundColor: theme.chipBg }]}
              >
                <Feather name="x" size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            {/* Mini Progress */}
            {subtasks.length > 0 && (
              <View style={s.subProgress}>
                <View style={[s.subProgressBar, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      s.subProgressFill,
                      {
                        width: `${(subtasks.filter(x => !!x.completed).length / Math.max(subtasks.length, 1)) * 100}%`
                      }
                    ]}
                  />
                </View>
                <Text style={[s.helper, { color: theme.subText }]}>
                  {subtasks.filter(x => !!x.completed).length} de {subtasks.length} etapas concluídas
                </Text>
              </View>
            )}

            <ScrollView
              style={{ maxHeight: 250 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {subtasks.length === 0 ? (
                <Text style={[s.emptySub, { color: theme.subText }]}>
                  Nenhuma subtarefa criada ainda. Adicione uma etapa abaixo!
                </Text>
              ) : (
                subtasks.map(x => (
                  <View key={x.id} style={[s.subRow, { borderBottomColor: theme.border }]}>
                    <Pressable
                      onPress={async () => {
                        await toggleSubtask(x.id, !x.completed);
                        setSubtasks(await getSubtasks(subtaskTask!.id));
                      }}
                      hitSlop={8}
                    >
                      <Feather
                        name={x.completed ? 'check-square' : 'square'}
                        size={20}
                        color={x.completed ? theme.success : theme.subText}
                      />
                    </Pressable>
                    <Text
                      style={[
                        s.subText,
                        { color: theme.text },
                        !!x.completed && [s.strike, { color: theme.textMuted }]
                      ]}
                    >
                      {x.title}
                    </Text>
                    <Pressable
                      onPress={async () => {
                        await removeSubtask(x.id);
                        setSubtasks(await getSubtasks(subtaskTask!.id));
                      }}
                      hitSlop={8}
                    >
                      <Feather name="trash-2" size={16} color={theme.danger} />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={s.addRow}>
              <TextInput
                value={newSubtask}
                onChangeText={setNewSubtask}
                placeholder="Adicionar uma etapa..."
                placeholderTextColor={theme.subText}
                style={[
                  s.subInput,
                  {
                    color: theme.inputText,
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder
                  }
                ]}
                onSubmitEditing={addSubtaskNow}
              />
              <Pressable style={[s.addBtn, { backgroundColor: theme.primary }]} onPress={addSubtaskNow}>
                <Feather name="plus" color="#FFF" size={20} />
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* MODAL 4: Meta Diária e Estatísticas */}
      <Modal
        visible={goalModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={[s.backdrop, { backgroundColor: theme.modalBackdrop }]}>
          <View
            style={[
              s.goalModalCard,
              {
                backgroundColor: theme.modalBg,
                borderColor: theme.cardBorder
              }
            ]}
          >
            <View style={s.trophyIconWrap}>
              <Feather name="award" size={32} color="#D97706" />
            </View>
            <Text style={[s.goalModalTitle, { color: theme.text }]}>
              {counts.doneToday >= goal ? 'Parabéns! Meta Atingida! 🎉' : 'Meta Diária em Andamento'}
            </Text>
            <Text style={[s.goalModalDesc, { color: theme.subText }]}>
              Você concluiu {counts.doneToday} de {goal} tarefas planejadas para hoje ({goalPercent}% concluído).
            </Text>

            <View style={[s.goalModalTrack, { backgroundColor: theme.border }]}>
              <View style={[s.fill, { width: `${goalPercent}%`, backgroundColor: theme.primary }]} />
            </View>

            <View style={s.goalModalStats}>
              <View
                style={[
                  s.miniStat,
                  {
                    backgroundColor: theme.chipBg,
                    borderColor: theme.chipBorder
                  }
                ]}
              >
                <Text style={[s.miniStatNum, { color: theme.text }]}>{counts.doneToday}</Text>
                <Text style={[s.miniStatLabel, { color: theme.subText }]}>Concluídas</Text>
              </View>
              <View
                style={[
                  s.miniStat,
                  {
                    backgroundColor: theme.chipBg,
                    borderColor: theme.chipBorder
                  }
                ]}
              >
                <Text style={[s.miniStatNum, { color: theme.text }]}>{counts.today}</Text>
                <Text style={[s.miniStatLabel, { color: theme.subText }]}>Pendentes</Text>
              </View>
              <View
                style={[
                  s.miniStat,
                  {
                    backgroundColor: theme.chipBg,
                    borderColor: theme.chipBorder
                  }
                ]}
              >
                <Text style={[s.miniStatNum, { color: theme.text }]}>{counts.overdue}</Text>
                <Text style={[s.miniStatLabel, { color: theme.subText }]}>Atrasadas</Text>
              </View>
            </View>

            <Pressable
              style={[s.btnDismiss, { backgroundColor: theme.primary }]}
              onPress={() => setGoalModalVisible(false)}
            >
              <Text style={s.btnDismissText}>Continuar Organizando</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: Permissão de Notificações no Início do App */}
      <Modal
        visible={permissionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDismissNotificationPrompt}
      >
        <View style={[s.backdrop, { backgroundColor: theme.modalBackdrop }]}>
          <View
            style={[
              s.permissionCard,
              {
                backgroundColor: theme.modalBg,
                borderColor: theme.cardBorder
              }
            ]}
          >
            <View style={[s.bellIconWrap, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}>
              <Feather name="bell" size={34} color={theme.primary} />
            </View>
            <Text style={[s.permissionTitle, { color: theme.text }]}>Permitir Notificações?</Text>
            <Text style={[s.permissionDesc, { color: theme.subText }]}>
              Ative as notificações para receber lembretes pontuais de cada tarefa e nunca mais perder prazos
              importantes.
            </Text>

            <View
              style={[
                s.benefitList,
                {
                  backgroundColor: theme.chipBg,
                  borderColor: theme.chipBorder
                }
              ]}
            >
              <View style={s.benefitItem}>
                <Feather name="check-circle" size={18} color={theme.success} style={{ marginRight: 9 }} />
                <Text style={[s.benefitText, { color: theme.text }]}>Alertas no horário programado da tarefa</Text>
              </View>
              <View style={s.benefitItem}>
                <Feather name="check-circle" size={18} color={theme.success} style={{ marginRight: 9 }} />
                <Text style={[s.benefitText, { color: theme.text }]}>Lembretes mesmo com o app fechado</Text>
              </View>
              <View style={s.benefitItem}>
                <Feather name="check-circle" size={18} color={theme.success} style={{ marginRight: 9 }} />
                <Text style={[s.benefitText, { color: theme.text }]}>Avisos antecipados personalizáveis</Text>
              </View>
            </View>

            <Pressable
              style={[s.btnGrant, { backgroundColor: theme.primary }]}
              onPress={handleGrantNotifications}
            >
              <Text style={s.btnGrantText}>Permitir Notificações</Text>
            </Pressable>

            <Pressable style={s.btnSkip} onPress={handleDismissNotificationPrompt}>
              <Text style={[s.btnSkipText, { color: theme.textMuted }]}>Agora não</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AgendaApp />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  /* Glass Header */
  glassHeader: {
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  date: { fontSize: 12, textTransform: 'capitalize', marginBottom: 3, fontWeight: '600' },
  heading: { fontSize: 24, fontWeight: '800' },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },

  mainBody: { flex: 1 },

  summary: { flexDirection: 'row', gap: 9, marginBottom: 12 },
  statGlass: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 3, fontWeight: '600' },

  glassGoalCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  goalTitle: { fontSize: 14, fontWeight: '800' },
  goalSub: { fontSize: 11, marginTop: 3, fontWeight: '500' },
  goalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  goalBadgeText: { fontSize: 12, fontWeight: '800' },

  track: { height: 8, borderRadius: 6, marginTop: 12, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 6 },
  section: { fontSize: 16, fontWeight: '800', marginBottom: 8 },

  list: { paddingHorizontal: 20, paddingBottom: 130, flexGrow: 1 },
  listWithHeader: { paddingBottom: 130, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 12, marginTop: 5 },

  fabWrapper: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 110 : 98,
    zIndex: 10
  },
  fab: {
    borderRadius: 28,
    paddingHorizontal: 18,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6
  },
  fabText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  /* Fixed Floating Navigation Menu */
  glassNavWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 28,
    left: 18,
    right: 18,
    zIndex: 30,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 10
  },
  glassNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 30,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    overflow: 'hidden'
  },
  glassNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 20,
    position: 'relative'
  },
  glassNavItemActive: {},
  glassNavLabel: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600'
  },
  glassNavLabelActive: {
    fontWeight: '800'
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2
  },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 20, marginBottom: 10 },
  filterGlass: {
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1
  },
  filterText: { fontSize: 11, textTransform: 'capitalize', fontWeight: '600' },
  filterTextOn: { fontWeight: '800' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  searchInput: { flex: 1, fontSize: 14 },

  /* Ajustes Styles */
  settings: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 130, gap: 12 },

  /* App Presentation Card */
  appPresentationCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  appPresentationContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconWrapper: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8
  },
  badgeWrap: {
    alignSelf: 'flex-start',
    marginBottom: 4
  },
  versionBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    overflow: 'hidden'
  },
  appName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3
  },
  appTagline: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16
  },

  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  testNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5
  },
  testNotifBtnText: { fontWeight: '700', fontSize: 13 },
  settingBox: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14
  },
  settingIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontSize: 14, fontWeight: '800' },
  settingDesc: { fontSize: 11, marginTop: 3, lineHeight: 16 },
  tagActive: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tagOff: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  ok: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  off: { fontSize: 10, fontWeight: '800', color: '#DC2626' },

  /* Theme selection buttons */
  themeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4
  },
  themeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '700'
  },

  goalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1
  },
  goalBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  goalCenter: { alignItems: 'center' },
  goalValue: { fontSize: 24, fontWeight: '900' },
  goalUnit: { fontSize: 10, fontWeight: '600' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    marginTop: 6
  },
  infoText: { fontSize: 11, lineHeight: 17, flex: 1 },

  /* Modal Shared Backdrops & Cards */
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalSub: { fontSize: 12, marginTop: 3 },
  closeCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  subProgress: { marginVertical: 12 },
  subProgressBar: { height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  subProgressFill: { height: 6, borderRadius: 4, backgroundColor: '#16A34A' },

  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
  subText: { flex: 1, fontSize: 14, fontWeight: '500' },
  strike: { textDecorationLine: 'line-through' },
  emptySub: { paddingVertical: 20, textAlign: 'center', fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  subInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8
  },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  helper: { fontSize: 11, fontWeight: '600' },

  /* Delete Confirmation Modal */
  confirmCard: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12
  },
  deleteIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  confirmTitle: { fontSize: 19, fontWeight: '800', marginBottom: 8 },
  confirmDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  btnCancelText: { fontWeight: '700', fontSize: 14 },
  btnDelete: {
    flex: 1.2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
  },
  btnDeleteText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  /* Goal Modal */
  goalModalCard: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12
  },
  trophyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  goalModalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  goalModalDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  goalModalTrack: { height: 8, borderRadius: 4, width: '100%', overflow: 'hidden', marginBottom: 18 },
  goalModalStats: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 20 },
  miniStat: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  miniStatNum: { fontSize: 18, fontWeight: '800' },
  miniStatLabel: { fontSize: 10, marginTop: 2, fontWeight: '600' },
  btnDismiss: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnDismissText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  /* Permission Prompt Modal (Startup) */
  permissionCard: {
    borderRadius: 26,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 26,
    elevation: 12
  },
  bellIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5
  },
  permissionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  permissionDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 18, paddingHorizontal: 6 },
  benefitList: { width: '100%', gap: 10, marginBottom: 24, padding: 14, borderRadius: 16, borderWidth: 1 },
  benefitItem: { flexDirection: 'row', alignItems: 'center' },
  benefitText: { fontSize: 12, fontWeight: '600' },
  btnGrant: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 10
  },
  btnGrantText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  btnSkip: { paddingVertical: 10, alignItems: 'center' },
  btnSkipText: { fontWeight: '700', fontSize: 13 }
});
