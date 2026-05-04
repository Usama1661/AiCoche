/**
 * Profile fields align with future `users` + onboarding in Supabase.
 */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced';

export type CareerGoal = 'job' | 'switch' | 'freelance' | 'skills';

export type UserProfile = {
  id?: string;
  email: string;
  displayName: string;
  professionKey: string;
  professionLabel: string;
  experience: ExperienceLevel;
  goal: CareerGoal;
  language: string;
  skills: string[];
  tools: string[];
  projects: string[];
};
