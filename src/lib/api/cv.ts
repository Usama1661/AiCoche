import type { CvAnalysis, UploadCvResponse } from '@/src/types/cv';
import type { UserProfile } from '@/src/types/user';
import { AUTHENTICATION_ENABLED } from '@/src/lib/auth';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasSupabaseConfig,
  supabase,
} from '@/src/lib/supabase';

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
      'Rewrite each role with 2-3 achievement bullets using action + tool + measurable result.',
      'Tie skills to outcomes by explaining what you built, who benefited, and what improved.',
      'Keep resume to one page if early career; two pages only if senior.',
    ],
    overallScore: 78,
  };
}

function mimeTypeFor(name: string, fallback: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return fallback || 'application/pdf';
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

  const mimeType = mimeTypeFor(input.name, input.mimeType);
  const file = {
    uri: input.uri,
    name: input.name,
    type: mimeType,
  };
  const form = new FormData();
  form.append('file', file as unknown as Blob);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error('Please sign in again before uploading a CV.');

  const response = await fetch(`${getSupabaseUrl()}/functions/v1/upload-cv`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: getSupabaseAnonKey(),
    },
    body: form,
  });

  if (!response.ok) {
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      throw new Error(body.error || body.message || `Upload failed with status ${response.status}.`);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('JSON')) throw error;
      throw new Error(`Upload failed with status ${response.status}.`);
    }
  }

  const data = (await response.json()) as UploadCvResponse;
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
