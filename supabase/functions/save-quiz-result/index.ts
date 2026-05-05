import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { isResponse, readJson, requireAuth } from '../_shared/supabase.ts';

type Body = {
  quizSessionId: string;
  answers: Array<{ questionId: string; selectedIndex: number }>;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { supabase, user } = await requireAuth(req);
    const body = await readJson<Body>(req);
    if (!body.quizSessionId) return jsonResponse({ error: 'quizSessionId is required' }, 400);

    const { data: quiz, error: fetchError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', body.quizSessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !quiz) return jsonResponse({ error: 'Quiz session not found' }, 404);

    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const answerMap = new Map((body.answers ?? []).map((answer) => [answer.questionId, answer.selectedIndex]));
    const correct = questions.reduce((total, question) => {
      const item = question as { id?: string; answerIndex?: number };
      return total + (item.id && answerMap.get(item.id) === item.answerIndex ? 1 : 0);
    }, 0);
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;

    const { data, error } = await supabase
      .from('quiz_sessions')
      .update({
        answers: body.answers ?? [],
        score,
        status: 'completed',
      })
      .eq('id', body.quizSessionId)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) throw error;

    return jsonResponse({ quizSession: data, score, correct, total: questions.length });
  } catch (error) {
    if (isResponse(error)) return error;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error(error);
    return jsonResponse({ error: message }, 500);
  }
});
