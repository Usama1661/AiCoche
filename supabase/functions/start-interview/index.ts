import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { chatCompletionJson } from '../_shared/openai.ts';
import { isResponse, requireAuth } from '../_shared/supabase.ts';

type UserProfile = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { supabase, user } = await requireAuth(req);
    const { profile } = (await req.json()) as { profile: UserProfile };
    if (!profile || typeof profile !== 'object') {
      return jsonResponse({ error: 'profile is required' }, 400);
    }

    const profession =
      (profile.professionLabel as string) ||
      (profile.professionKey as string) ||
      'professional';

    const system = `You are an interviewer for a ${profession}. Respond ONLY with valid JSON:
{"question":"your first interview question as a single string"}
Ask ONE concise question about background or motivation tailored to this candidate profile:
${JSON.stringify(profile)}`;

    let question =
      `Let's start: as someone working toward goals as a ${profession}, what accomplishment from the last year are you most proud of?`;

    const raw = await chatCompletionJson(
      [
        { role: 'system', content: system },
        { role: 'user', content: 'Provide the first interview question only.' },
      ],
      { temperature: 0.5 }
    );

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { question?: string };
        if (parsed.question?.trim()) question = parsed.question.trim();
      } catch {
        /* use default */
      }
    }

    const { data, error } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: user.id,
        profile: profile as Record<string, unknown>,
        messages: [{ role: 'assistant', content: question }],
        turn_count: 0,
      })
      .select('id')
      .single();

    if (error) throw error;

    return jsonResponse({ sessionId: data.id, question });
  } catch (e) {
    if (isResponse(e)) return e;
    const message = e instanceof Error ? e.message : 'Server error';
    console.error(e);
    return jsonResponse({ error: message }, 500);
  }
});
