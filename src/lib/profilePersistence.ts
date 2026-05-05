import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';
import type { CareerGoal, ExperienceLevel, ProfessionalProfile } from '@/src/types/user';

export type ProfileSnapshot = {
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
};

const emptyProfessionalProfile: ProfessionalProfile = {
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

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  headline: string | null;
  current_designation: string | null;
  current_company: string | null;
  employment_status: string | null;
  summary: string | null;
  ai_profile: Partial<ProfileSnapshot> | null;
};

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function mergeProfileFromRow(row: ProfileRow): ProfileSnapshot {
  const ai = row.ai_profile ?? {};
  const professionalProfile = {
    ...emptyProfessionalProfile,
    ...(typeof ai.professionalProfile === 'object' && ai.professionalProfile ? ai.professionalProfile : {}),
    fullName: ai.professionalProfile?.fullName || row.full_name || '',
    headline: ai.professionalProfile?.headline || row.headline || '',
    bio: ai.professionalProfile?.bio || row.summary || '',
    currentDesignation: ai.professionalProfile?.currentDesignation || row.current_designation || '',
    currentCompany: ai.professionalProfile?.currentCompany || row.current_company || '',
    employmentStatus: ai.professionalProfile?.employmentStatus || row.employment_status || '',
  };

  return {
    onboardingComplete: Boolean(ai.onboardingComplete),
    professionKey: typeof ai.professionKey === 'string' ? ai.professionKey : '',
    professionLabel: typeof ai.professionLabel === 'string' ? ai.professionLabel : '',
    experience: ai.experience ?? null,
    goal: ai.goal ?? null,
    language: typeof ai.language === 'string' ? ai.language : 'English',
    skills: normalizeStringArray(ai.skills),
    tools: normalizeStringArray(ai.tools),
    projects: normalizeStringArray(ai.projects),
    professionalProfile,
  };
}

export async function loadProfileSnapshot(): Promise<ProfileSnapshot | null> {
  if (!hasSupabaseConfig()) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'full_name,email,headline,current_designation,current_company,employment_status,summary,ai_profile'
    )
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  if (!data) return null;
  return mergeProfileFromRow(data);
}

export async function saveProfileSnapshot(snapshot: ProfileSnapshot): Promise<void> {
  if (!hasSupabaseConfig()) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return;

  const professionalProfile = snapshot.professionalProfile;
  const fullName =
    professionalProfile.fullName ||
    (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null);

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    full_name: fullName,
    headline: professionalProfile.headline || snapshot.professionLabel || null,
    current_designation: professionalProfile.currentDesignation || null,
    current_company: professionalProfile.currentCompany || null,
    employment_status: professionalProfile.employmentStatus || null,
    summary: professionalProfile.bio || null,
    ai_profile: snapshot,
  });

  if (error) throw error;
}
