export type Priority = 'baixa' | 'media' | 'alta' | 'urgente';
export type RepeatType = 'nenhuma' | 'diaria' | 'semanal' | 'mensal' | 'dias_especificos';
export type Task = {
  id: number; title: string; description: string; category: string; priority: Priority;
  dueAt: string; completed: number; notificationId: string | null; notificationIds: string;
  reminderOffsets: string;
  repeat: RepeatType; repeatDays: string; createdAt: string;
};
export type TaskInput = {
  title: string; description: string; category: string; priority: Priority; dueAt: string;
  repeat: RepeatType; repeatDays: number[]; reminders: number[];
};
export type Subtask = { id: number; taskId: number; title: string; completed: number };
