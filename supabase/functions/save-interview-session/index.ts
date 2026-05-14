import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { isResponse, readJson, requireAuth } from '../_shared/supabase.ts';

type Body = {
  sessionId?: string;
  title?: string;
  profile?: Record<string, unknown>;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  status?: 'active' | 'completed' | 'abandoned';
  score?: number;
  feedback?: Record<string, unknown>;
  interview_plan?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { supabase, user } = await requireAuth(req);
    const body = await readJson<Body>(req);

    const payload: Record<string, unknown> = {
      user_id: user.id,
      title: body.title ?? 'Interview practice',
      profile: body.profile ?? {},
      messages: Array.isArray(body.messages) ? body.messages : [],
      turn_count: Array.isArray(body.messages)
        ? body.messages.filter((message) => message.role === 'user').length
        : 0,
      status: body.status ?? 'completed',
      score: typeof body.score === 'number' ? Math.min(100, Math.max(0, Math.round(body.score))) : null,
      feedback: body.feedback ?? {},
    };

    if (body.interview_plan && typeof body.interview_plan === 'object') {
      payload.interview_plan = body.interview_plan;
    }

    const query = body.sessionId
      ? supabase.from('interview_sessions').update(payload).eq('id', body.sessionId).eq('user_id', user.id)
      : supabase.from('interview_sessions').insert(payload);

    const { data, error } = await query.select('*').single();
    if (error) throw error;

    return jsonResponse({ session: data });
  } catch (error) {
    if (isResponse(error)) return error;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error(error);
    return jsonResponse({ error: message }, 500);
  }
});
