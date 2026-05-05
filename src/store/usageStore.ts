import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Plan = 'free' | 'pro';

const FREE_CHAT_LIMIT = 10;
const FREE_CV_LIMIT = 1;

type UsageState = {
  plan: Plan;
  chatsUsed: number;
  cvAnalysesUsed: number;
  setPlan: (p: Plan) => void;
  incrementChat: () => void;
  incrementCvAnalysis: () => void;
  canStartChat: () => boolean;
  canAnalyzeCv: () => boolean;
  resetUsage: () => void;
  resetAllUsage: () => void;
};

const initialUsage = {
  plan: 'free' as Plan,
  chatsUsed: 0,
  cvAnalysesUsed: 0,
};

export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      ...initialUsage,
      setPlan: (p) => set({ plan: p }),
      incrementChat: () => set((s) => ({ chatsUsed: s.chatsUsed + 1 })),
      incrementCvAnalysis: () =>
        set((s) => ({ cvAnalysesUsed: s.cvAnalysesUsed + 1 })),
      canStartChat: () => {
        const { plan, chatsUsed } = get();
        if (plan === 'pro') return true;
        return chatsUsed < FREE_CHAT_LIMIT;
      },
      canAnalyzeCv: () => {
        const { plan, cvAnalysesUsed } = get();
        if (plan === 'pro') return true;
        return cvAnalysesUsed < FREE_CV_LIMIT;
      },
      resetUsage: () => set({ chatsUsed: 0, cvAnalysesUsed: 0 }),
      resetAllUsage: () => set({ ...initialUsage }),
    }),
    { name: 'aicoche-usage', storage: createJSONStorage(() => AsyncStorage) }
  )
);

export { FREE_CHAT_LIMIT, FREE_CV_LIMIT };
