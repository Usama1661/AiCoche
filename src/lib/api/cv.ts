import type { CvAnalysis, UploadCvResponse } from '@/src/types/cv';
import type { UserProfile } from '@/src/types/user';
import { AUTHENTICATION_ENABLED } from '@/src/lib/auth';
import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';

export type UploadCvInput = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number | null;
};

export type AnalyzeCvInput = {
  cvText?: string;
  cvDocumentId?: string;
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

async function functionErrorMessage(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') {
    return 'Request failed.';
  }

  const context = 'context' in error ? (error as { context?: unknown }).context : null;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: string; message?: string };
      return body.error || body.message || `Request failed with status ${context.status}.`;
    } catch {
      return `Request failed with status ${context.status}.`;
    }
  }

  return error instanceof Error ? error.message : 'Request failed.';
}

export async function uploadCv(input: UploadCvInput): Promise<UploadCvResponse> {
  if (!AUTHENTICATION_ENABLED || !hasSupabaseConfig()) {
    throw new Error('Supabase upload is not configured.');
  }

  const file = {
    uri: input.uri,
    name: input.name,
    type: input.mimeType,
  };
  const form = new FormData();
  form.append('file', file as unknown as Blob);

  const { data, error } = await supabase.functions.invoke<UploadCvResponse>('upload-cv', {
    body: form,
  });

  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.cvDocument?.id) throw new Error('Invalid upload-cv response');
  return data;
}

export async function analyzeCv(input: AnalyzeCvInput): Promise<CvAnalysis> {
  const body = {
    cvText: input.cvText,
    cvDocumentId: input.cvDocumentId,
    userProfile: input.profile,
  };

  if (!AUTHENTICATION_ENABLED) {
    await new Promise((r) => setTimeout(r, 900));
    return mockAnalysis(input.profile);
  }

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

  if (error) throw new Error(await functionErrorMessage(error));
  if (!data) throw new Error('Empty response from analyze-cv');
  return data;
}
