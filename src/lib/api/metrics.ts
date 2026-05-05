import type { CvAnalysis } from '@/src/types/cv';
import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';

export type RemoteDashboardMetrics = {
  lastCvScore: number | null;
  lastInterviewScore: number | null;
  lastQuizScore: number | null;
  lastQuizLevel: string | null;
  lastQuizDate: string | null;
  lastCvDocumentId: string | null;
  lastCvStatus: string | null;
  lastCvFileName: string | null;
  lastCvText: string;
  lastAnalysis: CvAnalysis | null;
};

type QuizQuestionForSave = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

function quizLevel(score: number | null) {
  if (score == null) return null;
  if (score >= 90) return 'Expert';
  if (score >= 75) return 'Advanced';
  if (score >= 60) return 'Skilled';
  if (score >= 40) return 'Growing';
  return 'Starter';
}

function emptyRemoteMetrics(): RemoteDashboardMetrics {
  return {
    lastCvScore: null,
    lastInterviewScore: null,
    lastQuizScore: null,
    lastQuizLevel: null,
    lastQuizDate: null,
    lastCvDocumentId: null,
    lastCvStatus: null,
    lastCvFileName: null,
    lastCvText: '',
    lastAnalysis: null,
  };
}

export async function loadDashboardMetrics(): Promise<RemoteDashboardMetrics> {
  if (!hasSupabaseConfig()) return emptyRemoteMetrics();

  const [analysisResult, documentResult, interviewResult, quizResult] = await Promise.all([
    supabase
      .from('cv_analysis_results')
      .select('cv_document_id, cv_score, strengths, weaknesses, recommended_skills, improvement_suggestions')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('cv_documents')
      .select('id, file_name, status, extracted_text')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('interview_sessions')
      .select('score')
      .not('score', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('quiz_sessions')
      .select('score, updated_at')
      .eq('status', 'completed')
      .not('score', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (analysisResult.error) throw analysisResult.error;
  if (documentResult.error) throw documentResult.error;
  if (interviewResult.error) throw interviewResult.error;
  if (quizResult.error) throw quizResult.error;

  const analysis = analysisResult.data;
  const document = documentResult.data;
  const quizScore =
    typeof quizResult.data?.score === 'number' ? quizResult.data.score : null;

  return {
    lastCvScore: typeof analysis?.cv_score === 'number' ? analysis.cv_score : null,
    lastInterviewScore:
      typeof interviewResult.data?.score === 'number' ? interviewResult.data.score : null,
    lastQuizScore: quizScore,
    lastQuizLevel: quizLevel(quizScore),
    lastQuizDate: quizResult.data?.updated_at ?? null,
    lastCvDocumentId: document?.id ?? analysis?.cv_document_id ?? null,
    lastCvStatus: document?.status ?? null,
    lastCvFileName: document?.file_name ?? null,
    lastCvText: document?.extracted_text ?? '',
    lastAnalysis: analysis
      ? {
          strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
          weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
          missingSkills: Array.isArray(analysis.recommended_skills)
            ? analysis.recommended_skills
            : [],
          suggestions: Array.isArray(analysis.improvement_suggestions)
            ? analysis.improvement_suggestions
            : [],
          overallScore: typeof analysis.cv_score === 'number' ? analysis.cv_score : undefined,
        }
      : null,
  };
}

export async function saveQuizResult(params: {
  topic: string;
  questions: QuizQuestionForSave[];
  answers: number[];
  score: number;
}) {
  if (!hasSupabaseConfig()) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return;

  const questions = params.questions.map((question, index) => ({
    id: `local-${index}`,
    question: question.question,
    options: question.options,
    answerIndex: question.correctIndex,
    explanation: question.explanation ?? '',
  }));

  const answers = params.answers.map((selectedIndex, index) => ({
    questionId: `local-${index}`,
    selectedIndex,
  }));

  const { error } = await supabase.from('quiz_sessions').insert({
    user_id: user.id,
    topic: params.topic,
    difficulty: quizLevel(params.score)?.toLowerCase() ?? 'starter',
    questions,
    answers,
    score: params.score,
    status: 'completed',
  });

  if (error) throw error;
}
