/**
 * Profile fields align with future `users` + onboarding in Supabase.
 */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced';

export type CareerGoal = 'job' | 'switch' | 'freelance' | 'skills';

export type ProfessionalExperience = {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  responsibilities: string[];
  skills: string[];
};

export type Certification = {
  id: string;
  name: string;
  issuer: string;
  date: string;
};

export type ProfessionalProfile = {
  fullName: string;
  headline: string;
  bio: string;
  experiences: ProfessionalExperience[];
  currentCompany: string;
  currentDesignation: string;
  employmentStatus: string;
  technicalSkills: string[];
  softSkills: string[];
  certifications: Certification[];
  source: 'manual' | 'resume' | null;
  updatedAt: string | null;
};

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
  professionalProfile?: ProfessionalProfile;
};
