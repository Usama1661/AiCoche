import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { firstQuestionPolicyBlock } from '../_shared/interviewQuestionPolicy.ts';
import {
  buildInterviewContextLines,
  experienceLabel,
  INTERVIEW_METRICS_KEY,
  professionTitle,
  stripInternalInterviewFields,
} from '../_shared/interviewProfile.ts';
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
    const body = (await req.json()) as {
      profile: UserProfile;
      metrics?: Record<string, unknown> | null;
    };
    const { profile, metrics } = body;
    if (!profile || typeof profile !== 'object') {
      return jsonResponse({ error: 'profile is required' }, 400);
    }

    const profession = professionTitle(profile);
    const contextBlock = buildInterviewContextLines(profile, metrics ?? null);
    const expDesc = experienceLabel(profile.experience);

    const system = `You are an expert hiring manager running a realistic mock interview for this ONE candidate.

Target role / field: ${profession}

Your task: produce ONLY valid JSON:
{"question":"..."}

${firstQuestionPolicyBlock(profession, expDesc)}

Candidate context (use this):
---
${contextBlock}
---`;

    const profileJson = JSON.stringify(stripInternalInterviewFields(profile)).slice(0, 14_000);

    let question =
      `To start us off in plain terms — how did you get interested in ${profession}, and which part of your background (role, project, or skill from your profile) best shows where you want to go next?`;

    const raw = await chatCompletionJson(
      [
        { role: 'system', content: system },
        {
          role: 'user',
          content:
            `Generate the first interview question.\n\nStructured profile JSON (extra detail):\n${profileJson}`,
        },
      ],
      { temperature: 0.45 },
    );

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { question?: string };
        if (parsed.question?.trim()) question = parsed.question.trim();
      } catch {
        /* use default */
      }
    }

    const storedProfile = {
      ...profile,
      [INTERVIEW_METRICS_KEY]: metrics ?? {},
    };

    const { data, error } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: user.id,
        profile: storedProfile as Record<string, unknown>,
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
