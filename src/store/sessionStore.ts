import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useProfileStore } from '@/src/store/profileStore';

type SessionState = {
  hasSeenAuthSplash: boolean;
  isAuthenticated: boolean;
  email: string;
  displayName: string;
  setHasSeenAuthSplash: (v: boolean) => void;
  login: (email: string, password: string, name?: string) => void;
  logout: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      hasSeenAuthSplash: false,
      isAuthenticated: false,
      email: '',
      displayName: '',
      setHasSeenAuthSplash: (v) => set({ hasSeenAuthSplash: v }),
      login: (email, _password, name) =>
        set({
          isAuthenticated: true,
          email,
          displayName: name?.trim() || email.split('@')[0] || 'User',
        }),
      logout: () => {
        useProfileStore.getState().reset();
        set({
          isAuthenticated: false,
          email: '',
          displayName: '',
        });
      },
    }),
    { name: 'aicoche-session', storage: createJSONStorage(() => AsyncStorage) }
  )
);
