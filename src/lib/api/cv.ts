import type { CvAnalysis } from '@/src/types/cv';
import type { UserProfile } from '@/src/types/user';
import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';

export type AnalyzeCvInput = {
  cvText: string;
  profile: UserProfile;
};

function mockAnalysis(profile: UserProfile): CvAnalysis {
  return {
    strengths: [
      `Clear focus as ${profile.professionLabel}`,
      'Structured experience narrative',
      'Relevant tools and outcomes where mentioned',
    ],
    weaknesses: [
      'Quantified impact could be stronger in recent roles',
      'Skills section could mirror target job keywords more closely',
    ],
    missingSkills: ['Stakeholder communication', 'Cloud fundamentals', 'Testing discipline'],
    suggestions: [
      'Add 2–3 bullet achievements with metrics per role.',
      'Tie skills to outcomes (what you built, who benefited).',
      'Keep resume to one page if early career; two pages only if senior.',
    ],
    overallScore: 78,
  };
}

export async function analyzeCv(input: AnalyzeCvInput): Promise<CvAnalysis> {
  const body = {
    cvText: input.cvText,
    userProfile: input.profile,
  };

  if (!hasSupabaseConfig()) {
    if (__DEV__) {
      await new Promise((r) => setTimeout(r, 900));
      return mockAnalysis(input.profile);
    }
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.functions.invoke<CvAnalysis>('analyze-cv', {
    body,
  });

  if (error) throw error;
  if (!data) throw new Error('Empty response from analyze-cv');
  return data;
}
