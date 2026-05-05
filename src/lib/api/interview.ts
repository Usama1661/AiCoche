import type {
  ContinueInterviewResponse,
  StartInterviewResponse,
} from '@/src/types/interview';
import type { UserProfile } from '@/src/types/user';
import { AUTHENTICATION_ENABLED } from '@/src/lib/auth';
import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';

let mockCounter = 0;

function mockStart(profile: UserProfile): StartInterviewResponse {
  mockCounter = 0;
  return {
    sessionId: 'mock-session',
    question: `Let’s start with your background as a ${profile.professionLabel}. What are you most proud of in the last 12 months?`,
  };
}

function mockContinue(_answer: string): ContinueInterviewResponse {
  mockCounter += 1;
  const questions = [
    'How do you approach learning a new tool or framework?',
    'Tell me about a time you had conflicting priorities. How did you decide?',
    'What kind of role are you targeting next, and why?',
  ];
  const idx = mockCounter - 1;
  const next = idx < questions.length ? questions[idx]! : null;
  return {
    feedback:
      'Solid structure. Try adding one concrete metric or outcome next time to strengthen credibility.',
    score: Math.min(6 + mockCounter, 10),
    nextQuestion: next,
    finished: next === null,
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

export async function startInterview(profile: UserProfile): Promise<StartInterviewResponse> {
  if (!AUTHENTICATION_ENABLED) {
    await new Promise((r) => setTimeout(r, 700));
    return mockStart(profile);
  }

  if (!hasSupabaseConfig()) {
    if (__DEV__) {
      await new Promise((r) => setTimeout(r, 700));
      return mockStart(profile);
    }
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke<StartInterviewResponse>(
    'start-interview',
    { body: { profile } }
  );
  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.question) throw new Error('Invalid start-interview response');
  return data;
}

export async function continueInterview(params: {
  sessionId: string;
  answer: string;
}): Promise<ContinueInterviewResponse> {
  if (!AUTHENTICATION_ENABLED) {
    await new Promise((r) => setTimeout(r, 800));
    return mockContinue(params.answer);
  }

  if (!hasSupabaseConfig()) {
    if (__DEV__) {
      await new Promise((r) => setTimeout(r, 800));
      return mockContinue(params.answer);
    }
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke<ContinueInterviewResponse>(
    'continue-interview',
    { body: params }
  );
  if (error) throw new Error(await functionErrorMessage(error));
  if (!data) throw new Error('Invalid continue-interview response');
  return data;
}
