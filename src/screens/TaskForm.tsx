import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { Task, TaskInput, Priority, RepeatType } from '../types';
import { ThemeColors, lightTheme } from '../theme';

const categories = ['Pessoal', 'Faculdade', 'Trabalho', 'Igreja', 'Esporte', 'Saúde', 'Outros'];
const reminderOptions = [
  { label: 'Na hora', v: 0 },
  { label: '5 min', v: 5 },
  { label: '10 min', v: 10 },
  { label: '15 min', v: 15 },
  { label: '30 min', v: 30 },
  { label: '1 hora', v: 60 },
  { label: '1 dia', v: 1440 }
];
const week = [
  { n: 'Dom', v: 0 },
  { n: 'Seg', v: 1 },
  { n: 'Ter', v: 2 },
  { n: 'Qua', v: 3 },
  { n: 'Qui', v: 4 },
  { n: 'Sex', v: 5 },
  { n: 'Sáb', v: 6 }
];

type Props = {
  task: Task | null;
  onSave: (input: TaskInput) => Promise<void>;
  onCancel: () => void;
  theme?: ThemeColors;
};

export function TaskForm({ task, onSave, onCancel, theme = lightTheme }: Props) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [category, setCategory] = useState(task?.category ?? 'Pessoal');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'media');
  const [repeat, setRepeat] = useState<RepeatType>(task?.repeat ?? 'nenhuma');
  const [repeatDays, setRepeatDays] = useState<number[]>(() => {
    try {
      return JSON.parse(task?.repeatDays ?? '[]');
    } catch {
      return [];
    }
  });
  const [reminders, setReminders] = useState<number[]>(() => {
    try {
      return task ? JSON.parse(task.reminderOffsets || '[10]') : [10];
    } catch {
      return [10];
    }
  });
  const [due, setDue] = useState(task ? new Date(task.dueAt) : new Date(Date.now() + 3600000));
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (v: number, arr: number[], set: (a: number[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v].sort((a, b) => a - b));

  const chip = (label: string, active: boolean, fn: () => void) => (
    <Pressable
      key={label}
      onPress={fn}
      style={[
        s.chip,
        {
          backgroundColor: active ? theme.primaryLight : theme.chipBg,
          borderColor: active ? theme.primary : theme.chipBorder
        }
      ]}
    >
      <Text
        style={[
          s.chipText,
          { color: active ? theme.primary : theme.chipText },
          active && { fontWeight: '800' }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const save = async () => {
    if (!title.trim()) return Alert.alert('Campo obrigatório', 'Informe o nome da atividade.');
    if (due.getTime() <= Date.now() && !task) return Alert.alert('Data inválida', 'Escolha um horário futuro.');
    if (repeat === 'dias_especificos' && !repeatDays.length)
      return Alert.alert('Escolha os dias', 'Marque ao menos um dia da semana.');
    setSaving(true);
    try {
      await onSave({ title, description, category, priority, dueAt: due.toISOString(), repeat, repeatDays, reminders });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[s.modalWrapper, { backgroundColor: theme.bg }]}>
      <View style={[s.handleBar, { backgroundColor: theme.border }]} />
      <View
        style={[
          s.modalHeader,
          {
            backgroundColor: theme.glassBg,
            borderBottomColor: theme.border
          }
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.heading, { color: theme.text }]}>
            {task ? 'Editar atividade' : 'Nova atividade'}
          </Text>
          <Text style={[s.headingSub, { color: theme.subText }]}>
            {task ? 'Altere as informações da tarefa' : 'Preencha os detalhes para agendar'}
          </Text>
        </View>
        <Pressable
          onPress={onCancel}
          style={[s.closeBtn, { backgroundColor: theme.chipBg }]}
          hitSlop={10}
        >
          <Feather name="x" size={22} color={theme.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.label, { color: theme.text }]}>Nome da atividade *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: Estudar programação, Reunião de equipe..."
          placeholderTextColor={theme.subText}
          style={[
            s.input,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.inputText
            }
          ]}
          maxLength={90}
        />

        <Text style={[s.label, { color: theme.text }]}>Descrição ou anotações</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Detalhes, local, links ou observações importantes..."
          placeholderTextColor={theme.subText}
          style={[
            s.input,
            s.multiline,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.inputText
            }
          ]}
          multiline
        />

        <Text style={[s.label, { color: theme.text }]}>Categoria</Text>
        <View style={s.chips}>
          {categories.map(c => chip(c, category === c, () => setCategory(c)))}
        </View>

        <Text style={[s.label, { color: theme.text }]}>Prioridade</Text>
        <View style={s.chips}>
          {(['baixa', 'media', 'alta', 'urgente'] as Priority[]).map(p =>
            chip(p, priority === p, () => setPriority(p))
          )}
        </View>

        <Text style={[s.label, { color: theme.text }]}>Data e horário</Text>
        <View style={s.row}>
          <Pressable
            style={[
              s.date,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder
              }
            ]}
            onPress={() => setPicker('date')}
          >
            <Feather name="calendar" size={17} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[s.dateText, { color: theme.inputText }]}>{due.toLocaleDateString('pt-BR')}</Text>
          </Pressable>
          <Pressable
            style={[
              s.date,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder
              }
            ]}
            onPress={() => setPicker('time')}
          >
            <Feather name="clock" size={17} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[s.dateText, { color: theme.inputText }]}>
              {due.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Pressable>
        </View>

        {picker && (
          <DateTimePicker
            value={due}
            mode={picker}
            is24Hour={true}
            onChange={(_, d) => {
              setPicker(null);
              if (d) {
                const next = new Date(due);
                if (picker === 'date') {
                  next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                } else {
                  next.setHours(d.getHours(), d.getMinutes(), 0, 0);
                }
                setDue(next);
              }
            }}
          />
        )}

        <Text style={[s.label, { color: theme.text }]}>Lembretes automáticos</Text>
        <Text style={[s.helper, { color: theme.subText }]}>
          Selecione quando você deseja ser notificado no aparelho.
        </Text>
        <View style={s.chips}>
          {reminderOptions.map(o =>
            chip(o.label, reminders.includes(o.v), () => toggle(o.v, reminders, setReminders))
          )}
        </View>

        <Text style={[s.label, { color: theme.text }]}>Repetição automática</Text>
        <View style={s.chips}>
          {([
            { v: 'nenhuma', l: 'Não repetir' },
            { v: 'diaria', l: 'Diariamente' },
            { v: 'semanal', l: 'Semanalmente' },
            { v: 'mensal', l: 'Mensalmente' },
            { v: 'dias_especificos', l: 'Dias específicos' }
          ] as { v: RepeatType; l: string }[]).map(x =>
            chip(x.l, repeat === x.v, () => setRepeat(x.v))
          )}
        </View>

        {repeat === 'dias_especificos' && (
          <View style={[s.chips, { marginTop: 8 }]}>
            {week.map(d => chip(d.n, repeatDays.includes(d.v), () => toggle(d.v, repeatDays, setRepeatDays)))}
          </View>
        )}

        <View style={s.footer}>
          <Pressable
            style={[s.cancel, { backgroundColor: theme.chipBg }]}
            onPress={onCancel}
            disabled={saving}
          >
            <Text style={[s.cancelText, { color: theme.textMuted }]}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[s.save, { backgroundColor: theme.primary }]}
            onPress={save}
            disabled={saving}
          >
            <Text style={s.saveText}>{saving ? 'Salvando...' : 'Salvar atividade'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  modalWrapper: { flex: 1 },
  handleBar: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  heading: { fontSize: 22, fontWeight: '800' },
  headingSub: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  container: { padding: 20, paddingBottom: 50 },
  label: { fontWeight: '700', marginBottom: 8, marginTop: 16, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  date: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1
  },
  dateText: { fontWeight: '600', fontSize: 14 },
  helper: { fontSize: 11, lineHeight: 16, marginBottom: 8 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 20 },
  cancel: { flex: 1, padding: 15, borderRadius: 14, alignItems: 'center' },
  cancelText: { fontWeight: '700', fontSize: 14 },
  save: {
    flex: 1.6,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
  },
  saveText: { color: '#FFF', fontWeight: '800', fontSize: 14 }
});
