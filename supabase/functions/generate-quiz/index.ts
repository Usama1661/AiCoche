import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { generateQuizWithAi } from '../_shared/ai.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { isResponse, readJson, requireAuth } from '../_shared/supabase.ts';

type Body = {
  topic?: string;
  difficulty?: string;
  skills?: string[];
  count?: number;
  profile?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  quizNumber?: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { supabase, user } = await requireAuth(req);
    const body = await readJson<Body>(req);
    const topic = body.topic?.trim() || 'career readiness';
    const difficulty = body.difficulty?.trim() || 'intermediate';
    const count = Math.min(15, Math.max(3, body.count ?? 5));
    const skills = Array.isArray(body.skills) ? body.skills : [];
    const questions = await generateQuizWithAi({
      topic,
      difficulty,
      skills,
      count,
      profile: body.profile,
      metrics: body.metrics,
      quizNumber: body.quizNumber,
    });

    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: user.id,
        topic: body.quizNumber ? `${topic} #${body.quizNumber}` : topic,
        difficulty,
        questions,
        status: 'generated',
      })
      .select('*')
      .single();

    if (error) throw error;

    return jsonResponse({ quizSessionId: data.id, topic, difficulty, questions });
  } catch (error) {
    if (isResponse(error)) return error;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error(error);
    return jsonResponse({ error: message }, 500);
  }
});
