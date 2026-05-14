import type {
  ContinueInterviewResponse,
  InterviewMessage,
  StartInterviewResponse,
} from '@/src/types/interview';
import type { UserProfile } from '@/src/types/user';
import { AUTHENTICATION_ENABLED } from '@/src/lib/auth';
import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';

let mockCounter = 0;

export type InterviewSessionSummary = {
  id: string;
  title: string;
  score: number | null;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
  updatedAt: string;
};

export type InterviewSessionDetail = InterviewSessionSummary & {
  messages: InterviewMessage[];
};

function mockStart(profile: UserProfile): StartInterviewResponse {
  mockCounter = 0;
  const role =
    profile.professionLabel ||
    profile.professionalProfile?.currentDesignation ||
    'your target field';
  const exp =
    profile.experience === 'beginner'
      ? 'If you are earlier in your journey'
      : profile.experience === 'experienced'
        ? 'Given your experience'
        : 'For your next step';
  return {
    sessionId: 'mock-session',
    question: `${exp} in ${role}, what is one concrete project or outcome from the last year that shows you can perform in this type of role?`,
  };
}

function mockContinue(_answer: string, professionLabel: string): ContinueInterviewResponse {
  mockCounter += 1;
  const field = professionLabel.trim() || 'your field';
  if (mockCounter >= 6) {
    return {
      feedback:
        'This six-question practice session is complete. Note one strength and one improvement for your next interview.',
      score: 9,
      nextQuestion: null,
      finished: true,
      summaryMarkdown: null,
      overallScore10: null,
    };
  }
  const questions = [
    `In ${field}, how do you validate quality before you ship or merge?`,
    `Describe a tradeoff between speed and quality on a ${field} project. What did you prioritize?`,
    `How do you collaborate with PMs, design, or other engineers on a ${field} delivery?`,
    `What signals or metrics would you watch after a meaningful ${field} change?`,
    `Where do you want to grow next in ${field}, and what step are you taking this month?`,
  ];
  const idx = mockCounter - 1;
  const next = questions[idx] ?? null;
  return {
    feedback:
      'Solid structure. Try adding one concrete metric or outcome next time to strengthen credibility.',
    score: Math.min(5 + mockCounter, 10),
    nextQuestion: next,
    finished: next === null,
    summaryMarkdown: null,
    overallScore10: null,
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

export async function startInterview(
  profile: UserProfile,
  metrics?: Record<string, unknown> | null
): Promise<StartInterviewResponse> {
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

  const body =
    metrics && typeof metrics === 'object'
      ? { profile, metrics }
      : { profile };

  const { data, error } = await supabase.functions.invoke<StartInterviewResponse>(
    'start-interview',
    { body }
  );
  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.question) throw new Error('Invalid start-interview response');
  return data;
}

export async function continueInterview(params: {
  sessionId: string;
  answer: string;
  professionLabel?: string;
}): Promise<ContinueInterviewResponse> {
  if (!AUTHENTICATION_ENABLED) {
    await new Promise((r) => setTimeout(r, 800));
    return mockContinue(params.answer, params.professionLabel ?? '');
  }

  if (!hasSupabaseConfig()) {
    if (__DEV__) {
      await new Promise((r) => setTimeout(r, 800));
      return mockContinue(params.answer, params.professionLabel ?? '');
    }
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke<ContinueInterviewResponse>(
    'continue-interview',
    { body: { sessionId: params.sessionId, answer: params.answer } }
  );
  if (error) throw new Error(await functionErrorMessage(error));
  if (!data) throw new Error('Invalid continue-interview response');
  return data;
}

export async function saveInterviewSessionScore(params: {
  sessionId: string;
  title: string;
  score: number;
  status: 'active' | 'completed';
  feedback?: string;
}) {
  if (!AUTHENTICATION_ENABLED || !hasSupabaseConfig()) return;

  const { error } = await supabase
    .from('interview_sessions')
    .update({
      title: params.title,
      status: params.status,
      score: params.score,
      feedback: params.feedback ? { summary: params.feedback } : {},
    })
    .eq('id', params.sessionId);

  if (error) throw error;
}

function normalizeMessages(value: unknown): InterviewMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((message, index) => {
      if (!message || typeof message !== 'object') return null;
      const item = message as { role?: unknown; content?: unknown; score?: unknown };
      if (
        item.role !== 'assistant' &&
        item.role !== 'user' &&
        item.role !== 'system'
      ) {
        return null;
      }
      if (typeof item.content !== 'string') return null;
      return {
        id: `${index}-${item.role}`,
        role: item.role,
        content: item.content,
        score: typeof item.score === 'number' ? item.score : undefined,
      };
    })
    .filter(Boolean) as InterviewMessage[];
}

function sessionTitle(row: { title: string | null; profile: unknown }) {
  if (row.title?.trim()) return row.title.trim();
  const profile = row.profile as { professionLabel?: unknown } | null;
  return typeof profile?.professionLabel === 'string'
    ? `${profile.professionLabel} interview`
    : 'Interview practice';
}

export async function listInterviewSessions(): Promise<InterviewSessionSummary[]> {
  if (!AUTHENTICATION_ENABLED || !hasSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('interview_sessions')
    .select('id, title, profile, score, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: sessionTitle(row),
    score: typeof row.score === 'number' ? row.score : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getInterviewSession(sessionId: string): Promise<InterviewSessionDetail> {
  if (!AUTHENTICATION_ENABLED || !hasSupabaseConfig()) {
    throw new Error('Interview history is available after sign in.');
  }

  const { data, error } = await supabase
    .from('interview_sessions')
    .select('id, title, profile, messages, score, status, created_at, updated_at')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Interview session not found.');

  return {
    id: data.id,
    title: sessionTitle(data),
    score: typeof data.score === 'number' ? data.score : null,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    messages: normalizeMessages(data.messages),
  };
}
