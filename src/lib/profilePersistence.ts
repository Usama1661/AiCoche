import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';
import type { CareerGoal, ExperienceLevel, ProfessionalProfile } from '@/src/types/user';

export type ProfileSnapshot = {
  onboardingComplete: boolean;
  professionKey: string;
  professionLabel: string;
  avatarUrl: string;
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
  email: '',
  phone: '',
  location: '',
  headline: '',
  bio: '',
  experiences: [],
  education: [],
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
  phone: string | null;
  headline: string | null;
  current_designation: string | null;
  current_company: string | null;
  employment_status: string | null;
  avatar_url: string | null;
  summary: string | null;
  ai_profile: Partial<ProfileSnapshot> | null;
};

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function usefulName(value: string | null | undefined) {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^(test|expense tracker app)$/i.test(text) || /page\s*\(?\d+\)?|break|^-{3,}/i.test(text)
    ? ''
    : text;
}

export function mergeProfileFromRow(row: ProfileRow): ProfileSnapshot {
  const ai = row.ai_profile ?? {};
  const professionalProfile = {
    ...emptyProfessionalProfile,
    ...(typeof ai.professionalProfile === 'object' && ai.professionalProfile ? ai.professionalProfile : {}),
    fullName: usefulName(ai.professionalProfile?.fullName) || usefulName(row.full_name),
    email: ai.professionalProfile?.email || row.email || '',
    phone: ai.professionalProfile?.phone || row.phone || '',
    location: ai.professionalProfile?.location || '',
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
    avatarUrl: typeof ai.avatarUrl === 'string' ? ai.avatarUrl : row.avatar_url || '',
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
      'full_name,email,phone,headline,current_designation,current_company,employment_status,avatar_url,summary,ai_profile'
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
    usefulName(professionalProfile.fullName) ||
    (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null);

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    full_name: fullName,
    phone: professionalProfile.phone || null,
    headline: professionalProfile.headline || snapshot.professionLabel || null,
    current_designation: professionalProfile.currentDesignation || null,
    current_company: professionalProfile.currentCompany || null,
    employment_status: professionalProfile.employmentStatus || null,
    avatar_url: snapshot.avatarUrl || null,
    summary: professionalProfile.bio || null,
    ai_profile: snapshot,
  });

  if (error) throw error;
}

export async function uploadProfileAvatar(params: {
  uri: string;
  mimeType?: string | null;
  base64?: string | null;
}): Promise<string> {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase is not configured.');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Please sign in before uploading a profile image.');

  const response = params.base64 ? null : await fetch(params.uri);
  const fileBody = params.base64
    ? Uint8Array.from(atob(params.base64), (char) => char.charCodeAt(0)).buffer
    : await response!.arrayBuffer();
  const contentType = params.mimeType || response?.headers.get('content-type') || 'image/jpeg';
  if (fileBody.byteLength === 0) {
    throw new Error('Selected image could not be read. Please choose another photo.');
  }
  const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${user.id}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, fileBody, {
      contentType,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
