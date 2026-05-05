import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  loadProfileSnapshot,
  saveProfileSnapshot,
  type ProfileSnapshot,
} from '@/src/lib/profilePersistence';
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
  | 'removeProject'
  | 'setAvatarUrl'
  | 'loadRemoteProfile';

export type { ProfileSnapshot };

type ProfileState = ProfileSnapshot & {
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
  setAvatarUrl: (url: string) => void;
  loadRemoteProfile: () => Promise<void>;
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
  avatarUrl: '',
  experience: null,
  goal: null,
  language: 'English',
  skills: [],
  tools: [],
  projects: [],
  professionalProfile: emptyProfessionalProfile,
};

function selectSnapshot(state: ProfileState): ProfileSnapshot {
  return {
    onboardingComplete: state.onboardingComplete,
    professionKey: state.professionKey,
    professionLabel: state.professionLabel,
    avatarUrl: state.avatarUrl,
    experience: state.experience,
    goal: state.goal,
    language: state.language,
    skills: state.skills,
    tools: state.tools,
    projects: state.projects,
    professionalProfile: state.professionalProfile,
  };
}

function persistSnapshot(state: ProfileState) {
  void saveProfileSnapshot(selectSnapshot(state)).catch((error) => {
    console.warn('Failed to sync profile to Supabase', error);
  });
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...initial,
      setOnboardingField: (patch) => {
        set((s) => ({ ...s, ...patch }));
        persistSnapshot(get());
      },
      updateProfessionalProfile: (patch) => {
        set((s) => ({
          professionalProfile: {
            ...s.professionalProfile,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        }));
        persistSnapshot(get());
      },
      replaceProfessionalProfile: (profile) => {
        set({
          professionalProfile: {
            ...emptyProfessionalProfile,
            ...profile,
            updatedAt: new Date().toISOString(),
          },
        });
        persistSnapshot(get());
      },
      completeOnboarding: () => {
        set({ onboardingComplete: true });
        persistSnapshot(get());
      },
      finishOnboarding: (fields) => {
        set((s) => ({
          ...s,
          ...fields,
          onboardingComplete: true,
        }));
        persistSnapshot(get());
      },
      reset: () => set({ ...initial }),
      addSkill: (s) => {
        const t = s.trim();
        if (!t) return;
        const arr = get().skills;
        if (arr.includes(t)) return;
        set({ skills: [...arr, t] });
        persistSnapshot(get());
      },
      removeSkill: (s) => {
        set({ skills: get().skills.filter((x) => x !== s) });
        persistSnapshot(get());
      },
      addTool: (s) => {
        const t = s.trim();
        if (!t) return;
        const arr = get().tools;
        if (arr.includes(t)) return;
        set({ tools: [...arr, t] });
        persistSnapshot(get());
      },
      removeTool: (s) => {
        set({ tools: get().tools.filter((x) => x !== s) });
        persistSnapshot(get());
      },
      addProject: (s) => {
        const t = s.trim();
        if (!t) return;
        const arr = get().projects;
        if (arr.includes(t)) return;
        set({ projects: [...arr, t] });
        persistSnapshot(get());
      },
      removeProject: (s) => {
        set({ projects: get().projects.filter((x) => x !== s) });
        persistSnapshot(get());
      },
      setAvatarUrl: (url) => {
        set({ avatarUrl: url });
        persistSnapshot(get());
      },
      loadRemoteProfile: async () => {
        const remote = await loadProfileSnapshot();
        set(remote ?? { ...initial });
      },
    }),
    { name: 'aicoche-profile', storage: createJSONStorage(() => AsyncStorage) }
  )
);
