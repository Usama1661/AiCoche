import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const INTERVIEW_REMINDER_ROUTE = '/(tabs)/interview';
const INTERVIEW_REMINDER_CHANNEL_ID = 'interview-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return false;

  await ensureNotificationChannel();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(INTERVIEW_REMINDER_CHANNEL_ID, {
    name: 'Interview reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#B266FF',
  });
}

export async function scheduleInterviewReminderNotification(params: {
  reminderId: string;
  title: string;
  scheduledAt: string;
}) {
  const granted = await requestNotificationPermission();
  if (!granted) {
    throw new Error('Notification permission is required to schedule interview reminders.');
  }

  const date = new Date(params.scheduledAt);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    throw new Error('Choose a future time for the reminder.');
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time for your mock interview',
      body: `You have interview on ${formatNotificationDate(date)}. ${params.title}`,
      sound: 'default',
      data: {
        reminderId: params.reminderId,
        route: INTERVIEW_REMINDER_ROUTE,
        type: 'interview-reminder',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: INTERVIEW_REMINDER_CHANNEL_ID,
    },
  });
}

function formatNotificationDate(date: Date) {
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export async function cancelScheduledNotification(notificationId: string | null) {
  if (!notificationId || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export function addInterviewReminderResponseListener(
  onReminderPress: () => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      type?: string;
      route?: string;
    };
    if (data.type === 'interview-reminder') {
      onReminderPress();
    }
  });
}

export function addInterviewReminderReceivedListener(
  onReminderReceive: (notification: { title: string; body: string }) => void
) {
  return Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as {
      type?: string;
      route?: string;
    };
    if (data.type !== 'interview-reminder') return;

    onReminderReceive({
      title: notification.request.content.title ?? 'Interview reminder',
      body: notification.request.content.body ?? 'Time for your mock interview.',
    });
  });
}

export async function isScheduledNotification(notificationId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((notification) => notification.identifier === notificationId);
}

export async function getLastInterviewReminderResponse() {
  const response = await Notifications.getLastNotificationResponseAsync();
  const data = response?.notification.request.content.data as
    | { type?: string; route?: string }
    | undefined;
  return data?.type === 'interview-reminder' ? data : null;
}
