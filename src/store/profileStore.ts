import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CareerGoal, ExperienceLevel, ProfessionalProfile } from '@/src/types/user';

type ProfileActionKey =
  | 'setOnboardingField'
  | 'updateProfessionalProfile'
  | 'replaceProfessionalProfile'
  | 'completeOnboarding'
  | 'finishOnboarding'
  | 'reset'
  | 'addSkill'
  | 'removeSkill'
  | 'addTool'
  | 'removeTool'
  | 'addProject'
  | 'removeProject';

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
  professionalProfile: ProfessionalProfile;
  setOnboardingField: (patch: Partial<Omit<ProfileState, ProfileActionKey>>) => void;
  updateProfessionalProfile: (patch: Partial<ProfessionalProfile>) => void;
  replaceProfessionalProfile: (profile: ProfessionalProfile) => void;
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

export const emptyProfessionalProfile: ProfessionalProfile = {
  fullName: '',
  headline: '',
  bio: '',
  experiences: [],
  currentCompany: '',
  currentDesignation: '',
  employmentStatus: '',
  technicalSkills: [],
  softSkills: [],
  certifications: [],
  source: null,
  updatedAt: null,
};

const initial: Omit<
  ProfileState,
  ProfileActionKey
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
  professionalProfile: emptyProfessionalProfile,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...initial,
      setOnboardingField: (patch) => set((s) => ({ ...s, ...patch })),
      updateProfessionalProfile: (patch) =>
        set((s) => ({
          professionalProfile: {
            ...s.professionalProfile,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        })),
      replaceProfessionalProfile: (profile) =>
        set({
          professionalProfile: {
            ...emptyProfessionalProfile,
            ...profile,
            updatedAt: new Date().toISOString(),
          },
        }),
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
