/**
 * Serviço de notificações locais para Agenda Inteligente.
 *
 * Estratégia:
 * - Expo Go / Android SDK 53+: Push remoto foi removido do Expo Go.
 *   Usamos APENAS notificações locais agendadas (scheduleNotificationAsync).
 * - getExpoPushTokenAsync() só funciona em development builds com projectId
 *   configurado no eas.json. Em Expo Go ele lança CodedError, então é ignorado.
 * - trigger: null dispara imediatamente em qualquer ambiente.
 * - trigger TIME_INTERVAL com seconds >= 1 é a forma mais confiável de
 *   disparar uma notificação quase imediata no Expo Go / Android.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Handler de foreground ────────────────────────────────────────────────────
// Precisa estar no módulo-raiz, executado antes de qualquer agendamento.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

// ─── Canal Android ────────────────────────────────────────────────────────────
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('lembretes', {
      name: 'Lembretes da Agenda',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      enableLights: true,
      lightColor: '#2563EB'
    });
  } catch (e) {
    console.warn('[Notif] Erro ao criar canal Android:', e);
  }
}

// ─── Verificar permissão (sem pedir) ──────────────────────────────────────────
export async function checkNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

// ─── Pedir permissão ─────────────────────────────────────────────────────────
// Retorna granted + token (somente se disponível em dev build; em Expo Go = null).
export async function requestPushNotificationPermissions(): Promise<{
  granted: boolean;
  token: string | null;
}> {
  if (Platform.OS === 'web') return { granted: false, token: null };

  try {
    await ensureAndroidChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { granted: false, token: null };
    }

    // Token Expo Push: só funciona em development builds com projectId.
    // Em Expo Go lança CodedError — capturamos silenciosamente.
    let token: string | null = null;
    try {
      const result = await Notifications.getExpoPushTokenAsync();
      token = result.data;
    } catch {
      // Silencioso: notificações locais continuam funcionando normalmente.
    }

    return { granted: true, token };
  } catch (e) {
    console.warn('[Notif] Erro ao solicitar permissões:', e);
    return { granted: false, token: null };
  }
}

// ─── Notificação imediata de teste ───────────────────────────────────────────
// Usa TIME_INTERVAL de 1 segundo — mais confiável que trigger:null no Android.
export async function sendInstantTestNotification(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await ensureAndroidChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Agenda Inteligente',
        body: 'Notificações ativadas! Você receberá lembretes no horário de cada atividade.',
        sound: 'default',
        // Dados extras para identificação
        data: { type: 'test' }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        ...(Platform.OS === 'android' ? { channelId: 'lembretes' } : {})
      } as any
    });
    return true;
  } catch (e) {
    console.warn('[Notif] Erro ao enviar notificação de teste:', e);
    // Fallback: tenta trigger:null (funciona em iOS)
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Agenda Inteligente',
          body: 'Notificações ativas! Seus lembretes serão entregues pontualmente.',
          sound: 'default'
        },
        trigger: null
      });
      return true;
    } catch (e2) {
      console.warn('[Notif] Fallback também falhou:', e2);
      return false;
    }
  }
}

// ─── Agendar lembretes para uma tarefa ───────────────────────────────────────
export async function scheduleReminders(
  title: string,
  dueAt: string,
  offsets: number[]
): Promise<string[]> {
  if (Platform.OS === 'web') return [];

  await ensureAndroidChannel();

  const due = new Date(dueAt);
  const ids: string[] = [];

  for (const minutes of offsets) {
    const fireAt = new Date(due.getTime() - minutes * 60_000);
    const secondsFromNow = Math.floor((fireAt.getTime() - Date.now()) / 1000);

    // Ignora datas no passado (menos de 5 segundos de margem)
    if (secondsFromNow < 5) continue;

    const body =
      minutes === 0
        ? 'Sua atividade está começando agora! ⏰'
        : minutes === 1440
        ? 'Lembrete: sua atividade está programada para amanhã.'
        : minutes >= 60
        ? `Lembrete: sua atividade começa em ${Math.round(minutes / 60)} hora(s).`
        : `Lembrete: sua atividade começa em ${minutes} minutos.`;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📋 ${title}`,
          body,
          sound: 'default',
          data: { title, dueAt, type: 'reminder' }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsFromNow,
          ...(Platform.OS === 'android' ? { channelId: 'lembretes' } : {})
        } as any
      });
      ids.push(id);
    } catch (e) {
      // Fallback: tenta com DATE trigger
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `📋 ${title}`,
            body,
            sound: 'default',
            data: { title, dueAt, type: 'reminder' }
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
            ...(Platform.OS === 'android' ? { channelId: 'lembretes' } : {})
          } as any
        });
        ids.push(id);
      } catch (e2) {
        console.warn(`[Notif] Falha ao agendar lembrete para "${title}" (${minutes}min):`, e2);
      }
    }
  }

  return ids;
}

// ─── Cancelar lembretes de uma tarefa ────────────────────────────────────────
export async function cancelReminders(raw: string | null | undefined): Promise<void> {
  if (Platform.OS === 'web' || !raw) return;

  let ids: string[] = [];
  try {
    const v = JSON.parse(raw);
    ids = Array.isArray(v) ? v : [raw];
  } catch {
    ids = [raw];
  }

  await Promise.all(
    ids
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
      .map(async id => {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {
          // Ignora se a notificação já foi disparada ou não existe
        }
      })
  );
}

// ─── Utilitário: preparar notificações (alias para compatibilidade) ───────────
export async function prepareNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await ensureAndroidChannel();
    const { granted } = await Notifications.getPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}
