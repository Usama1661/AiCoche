import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';
import { useMetricsStore } from '@/src/store/metricsStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useUsageStore } from '@/src/store/usageStore';

type SignupResult = {
  needsEmailConfirmation: boolean;
};

const EMPTY_SESSION = {
  hasSeenAuthSplash: false,
  isAuthenticated: false,
  userId: '',
  email: '',
  displayName: '',
};

type SessionState = {
  hasSeenAuthSplash: boolean;
  isAuthenticated: boolean;
  userId: string;
  email: string;
  displayName: string;
  setHasSeenAuthSplash: (v: boolean) => void;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<SignupResult>;
  logout: () => Promise<void>;
};

function displayNameFor(user: User): string {
  const fullName = user.user_metadata?.full_name;
  const displayName = user.user_metadata?.display_name;
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim();
  if (typeof displayName === 'string' && displayName.trim()) return displayName.trim();
  return user.email?.split('@')[0] || 'User';
}

function sessionFromUser(user: User): Pick<
  SessionState,
  'hasSeenAuthSplash' | 'isAuthenticated' | 'userId' | 'email' | 'displayName'
> {
  return {
    hasSeenAuthSplash: true,
    isAuthenticated: true,
    userId: user.id,
    email: user.email ?? '',
    displayName: displayNameFor(user),
  };
}

function resetUserScopedStores() {
  useProfileStore.getState().reset();
  useMetricsStore.getState().resetMetrics();
  useUsageStore.getState().resetAllUsage();
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      ...EMPTY_SESSION,
      setHasSeenAuthSplash: (v) => set({ hasSeenAuthSplash: v }),
      refreshSession: async () => {
        if (!hasSupabaseConfig()) {
          set((state) => ({ ...EMPTY_SESSION, hasSeenAuthSplash: state.hasSeenAuthSplash }));
          return;
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session?.user) {
          resetUserScopedStores();
          set((state) => ({ ...EMPTY_SESSION, hasSeenAuthSplash: state.hasSeenAuthSplash }));
          return;
        }

        const previousUserId = get().userId;
        if (previousUserId && previousUserId !== session.user.id) {
          resetUserScopedStores();
        }
        set(sessionFromUser(session.user));
        await useProfileStore.getState().loadRemoteProfile();
      },
      login: async (email, password) => {
        if (!hasSupabaseConfig()) {
          throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        if (!data.user) throw new Error('No user returned from Supabase.');

        const previousUserId = get().userId;
        if (previousUserId !== data.user.id) {
          resetUserScopedStores();
        }
        set(sessionFromUser(data.user));
        await useProfileStore.getState().loadRemoteProfile();
      },
      signup: async (email, password, name) => {
        if (!hasSupabaseConfig()) {
          throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
        }

        const fullName = name?.trim() || email.trim().split('@')[0] || 'User';
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName,
              display_name: fullName,
            },
          },
        });

        if (error) throw error;
        if (!data.session || !data.user) {
          set({ ...EMPTY_SESSION, hasSeenAuthSplash: true });
          return { needsEmailConfirmation: true };
        }

        const previousUserId = get().userId;
        if (previousUserId !== data.user.id) {
          resetUserScopedStores();
        }
        set(sessionFromUser(data.user));
        await useProfileStore.getState().loadRemoteProfile();
        return { needsEmailConfirmation: false };
      },
      logout: async () => {
        if (hasSupabaseConfig()) {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        }
        resetUserScopedStores();
        set({ ...EMPTY_SESSION, hasSeenAuthSplash: true });
      },
    }),
    { name: 'aicoche-session', storage: createJSONStorage(() => AsyncStorage) }
  )
);
