import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CvAnalysis } from '@/src/types/cv';

type MetricsState = {
  lastCvScore: number | null;
  lastInterviewScore: number | null;
  lastQuizScore: number | null;
  lastQuizLevel: string | null;
  lastQuizDate: string | null;
  lastCvFileName: string | null;
  lastCvUri: string | null;
  lastCvText: string;
  lastAnalysis: CvAnalysis | null;
  setLastCv: (fileName: string | null, uri: string | null) => void;
  setLastCvText: (t: string) => void;
  setLastAnalysis: (a: CvAnalysis | null) => void;
  setLastCvScore: (n: number | null) => void;
  setLastInterviewScore: (n: number | null) => void;
  setLastQuizResult: (score: number, level: string) => void;
};

export const useMetricsStore = create<MetricsState>()(
  persist(
    (set) => ({
      lastCvScore: null,
      lastInterviewScore: null,
      lastQuizScore: null,
      lastQuizLevel: null,
      lastQuizDate: null,
      lastCvFileName: null,
      lastCvUri: null,
      lastCvText: '',
      lastAnalysis: null,
      setLastCv: (fileName, uri) =>
        set({
          lastCvFileName: fileName,
          lastCvUri: uri,
          lastAnalysis: null,
          lastCvScore: null,
        }),
      setLastCvText: (t) => set({ lastCvText: t }),
      setLastAnalysis: (a) => set({ lastAnalysis: a }),
      setLastCvScore: (n) => set({ lastCvScore: n }),
      setLastInterviewScore: (n) => set({ lastInterviewScore: n }),
      setLastQuizResult: (score, level) =>
        set({
          lastQuizScore: score,
          lastQuizLevel: level,
          lastQuizDate: new Date().toISOString(),
        }),
    }),
    { name: 'aicoche-metrics', storage: createJSONStorage(() => AsyncStorage) }
  )
);
