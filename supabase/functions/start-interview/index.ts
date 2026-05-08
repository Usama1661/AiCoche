import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
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

Rules for the FIRST question:
1. It must sound like a real interview question for THIS field (${profession}) — not a lecture and not therapy. Prefer what employers actually ask (technical depth, tradeoffs, shipping experience, collaboration, debugging, domain-specific scenarios) when it fits the profile.
2. Match difficulty and tone to the candidate's experience level (${expDesc}) using the candidate context below.
3. Prefer referencing something specific from the context (skills, tools, goal, headline, experience lines, or CV/quiz hints). If the profile is sparse, still ask a strong, typical question for ${profession}.
4. ONE concise question only (no preamble in the string). Not multiple questions.
5. Avoid generic filler every candidate gets unless the profile is empty — then one solid behavioral question tied to ${profession} is OK.

Candidate context (use this):
---
${contextBlock}
---`;

    const profileJson = JSON.stringify(stripInternalInterviewFields(profile)).slice(0, 14_000);

    let question =
      `As someone targeting ${profession} roles (${expDesc}), describe one concrete piece of work or learning from the last year that proves you are ready for this field — what was the situation and what did you deliver?`;

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
