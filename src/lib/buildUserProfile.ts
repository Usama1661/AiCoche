import { useProfileStore } from '@/src/store/profileStore';
import { useSessionStore } from '@/src/store/sessionStore';
import type { CareerGoal, ExperienceLevel, UserProfile } from '@/src/types/user';

export function buildUserProfileFromStores(): UserProfile {
  const { email, displayName } = useSessionStore.getState();
  const p = useProfileStore.getState();
  return {
    email,
    displayName,
    professionKey: p.professionKey,
    professionLabel: p.professionLabel || 'Professional',
    experience: (p.experience ?? 'beginner') as ExperienceLevel,
    goal: (p.goal ?? 'skills') as CareerGoal,
    language: p.language,
    skills: p.skills,
    tools: p.tools,
    projects: p.projects,
  };
}
