import { RepeatType } from '../types';

// Calcula a próxima ocorrência futura, pulando datas recorrentes que já passaram.
export function nextOccurrence(iso: string, repeat: RepeatType, days: number[]) {
  if (repeat === 'nenhuma') return null;
  const original = new Date(iso);
  const now = new Date();

  if (repeat === 'dias_especificos') {
    if (!days.length) return null;
    const candidate = new Date(original);
    for (let i = 1; i <= 14; i++) {
      candidate.setDate(candidate.getDate() + 1);
      if (days.includes(candidate.getDay()) && candidate.getTime() > now.getTime()) {
        return candidate.toISOString();
      }
    }
    return null;
  }

  const candidate = new Date(original);
  for (let attempts = 0; attempts < 120; attempts++) {
    if (repeat === 'diaria') candidate.setDate(candidate.getDate() + 1);
    if (repeat === 'semanal') candidate.setDate(candidate.getDate() + 7);
    if (repeat === 'mensal') {
      const day = original.getDate();
      candidate.setDate(1);
      candidate.setMonth(candidate.getMonth() + 1);
      candidate.setDate(Math.min(day, new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate()));
    }
    if (candidate.getTime() > now.getTime()) return candidate.toISOString();
  }
  return null;
}
