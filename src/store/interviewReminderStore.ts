import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  cancelScheduledNotification,
  isScheduledNotification,
  scheduleInterviewReminderNotification,
} from '@/src/lib/notifications';
import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';

type InterviewReminder = {
  id: string;
  ownerUserId: string | null;
  notificationId: string;
  scheduledAt: string;
  title: string;
  createdAt: string;
};

type InterviewReminderState = {
  reminders: InterviewReminder[];
  scheduleReminder: (params: { scheduledAt: string; title: string }) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  cancelReminder: () => Promise<void>;
  resetReminders: () => void;
  clearExpiredReminder: () => void;
};

function createReminderId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function currentOwnerUserId() {
  if (!hasSupabaseConfig()) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export const useInterviewReminderStore = create<InterviewReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],
      scheduleReminder: async ({ scheduledAt, title }) => {
        const id = createReminderId();
        const ownerUserId = await currentOwnerUserId();
        const notificationId = await scheduleInterviewReminderNotification({
          reminderId: id,
          scheduledAt,
          title,
        });
        const isRegistered = await isScheduledNotification(notificationId);
        if (!isRegistered) {
          throw new Error('Reminder could not be registered on this device.');
        }

        set((state) => ({
          reminders: [
            {
              id,
              ownerUserId,
              notificationId,
              scheduledAt,
              title,
              createdAt: new Date().toISOString(),
            },
            ...state.reminders,
          ],
        }));
      },
      deleteReminder: async (id) => {
        const current = get().reminders.find((reminder) => reminder.id === id);
        await cancelScheduledNotification(current?.notificationId ?? null);
        set((state) => ({
          reminders: state.reminders.filter((reminder) => reminder.id !== id),
        }));
      },
      cancelReminder: async () => {
        const reminders = get().reminders;
        await Promise.all(
          reminders.map((reminder) => cancelScheduledNotification(reminder.notificationId))
        );
        set({ reminders: [] });
      },
      resetReminders: () => set({ reminders: [] }),
      clearExpiredReminder: () => {},
    }),
    {
      name: 'aicoche-interview-reminder',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as
          | { reminders?: InterviewReminder[]; reminder?: Omit<InterviewReminder, 'id' | 'createdAt'> }
          | undefined;
        if (!state?.reminder) return persistedState;

        return {
          ...state,
          reminders: [
            {
              ...state.reminder,
              id: createReminderId(),
              ownerUserId: null,
              createdAt: new Date().toISOString(),
            },
            ...(state.reminders ?? []),
          ],
          reminder: null,
        };
      },
    }
  )
);

export type { InterviewReminder };
