import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CareerGoal, ExperienceLevel } from '@/src/types/user';

type ProfileState = {
  onboardingComplete: boolean;
  professionKey: string;
  professionLabel: string;
  experience: ExperienceLevel | null;
  goal: CareerGoal | null;
  language: string;
  skills: string[];
  tools: string[];
  projects: string[];
  setOnboardingField: (patch: Partial<Omit<ProfileState, 'setOnboardingField' | 'reset' | 'completeOnboarding' | 'finishOnboarding' | 'addSkill' | 'removeSkill' | 'addTool' | 'removeTool' | 'addProject' | 'removeProject'>>) => void;
  completeOnboarding: () => void;
  /** Single atomic update: avoids race where index reads before `onboardingComplete` is set */
  finishOnboarding: (fields: {
    professionKey: string;
    professionLabel: string;
    experience: ExperienceLevel;
    goal: CareerGoal;
    language: string;
  }) => void;
  reset: () => void;
  addSkill: (s: string) => void;
  removeSkill: (s: string) => void;
  addTool: (s: string) => void;
  removeTool: (s: string) => void;
  addProject: (s: string) => void;
  removeProject: (s: string) => void;
};

const initial: Omit<
  ProfileState,
  | 'setOnboardingField'
  | 'completeOnboarding'
  | 'finishOnboarding'
  | 'reset'
  | 'addSkill'
  | 'removeSkill'
  | 'addTool'
  | 'removeTool'
  | 'addProject'
  | 'removeProject'
> = {
  onboardingComplete: false,
  professionKey: '',
  professionLabel: '',
  experience: null,
  goal: null,
  language: 'English',
  skills: [],
  tools: [],
  projects: [],
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...initial,
      setOnboardingField: (patch) => set((s) => ({ ...s, ...patch })),
      completeOnboarding: () => set({ onboardingComplete: true }),
      finishOnboarding: (fields) =>
        set((s) => ({
          ...s,
          ...fields,
          onboardingComplete: true,
        })),
      reset: () => set({ ...initial }),
      addSkill: (s) => {
        const t = s.trim();
        if (!t) return;
        const arr = get().skills;
        if (arr.includes(t)) return;
        set({ skills: [...arr, t] });
      },
      removeSkill: (s) => set({ skills: get().skills.filter((x) => x !== s) }),
      addTool: (s) => {
        const t = s.trim();
        if (!t) return;
        const arr = get().tools;
        if (arr.includes(t)) return;
        set({ tools: [...arr, t] });
      },
      removeTool: (s) => set({ tools: get().tools.filter((x) => x !== s) }),
      addProject: (s) => {
        const t = s.trim();
        if (!t) return;
        const arr = get().projects;
        if (arr.includes(t)) return;
        set({ projects: [...arr, t] });
      },
      removeProject: (s) =>
        set({ projects: get().projects.filter((x) => x !== s) }),
    }),
    { name: 'aicoche-profile', storage: createJSONStorage(() => AsyncStorage) }
  )
);
