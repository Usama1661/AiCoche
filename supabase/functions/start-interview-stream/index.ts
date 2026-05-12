import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders } from '../_shared/cors.ts';
import { firstQuestionPolicyBlock } from '../_shared/interviewQuestionPolicy.ts';
import type { InterviewPromptStyle } from '../_shared/interviewQuestionPolicy.ts';
import {
  buildInterviewContextLines,
  experienceLabel,
  INTERVIEW_METRICS_KEY,
  interviewCandidateFirstName,
  professionTitle,
  stripInternalInterviewFields,
} from '../_shared/interviewProfile.ts';
import { chatCompletionTextStream } from '../_shared/openai.ts';
import { isResponse, requireAuth } from '../_shared/supabase.ts';

type UserProfile = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sseLine(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { supabase, user } = await requireAuth(req);
    const body = (await req.json()) as {
      profile?: UserProfile;
      metrics?: Record<string, unknown> | null;
      /** Voice mock interview only — enables Normal / Advanced question mix in prompts. */
      voiceInterview?: boolean;
      interviewLevel?: string;
    };
    const { profile, metrics } = body;
    if (!profile || typeof profile !== 'object') {
      return new Response(JSON.stringify({ error: 'profile is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profession = professionTitle(profile);
    const contextBlock = buildInterviewContextLines(profile, metrics ?? null);
    const expDesc = experienceLabel(profile.experience);
    const candidateFirstName = interviewCandidateFirstName(profile, user);

    const voiceInterview = body.voiceInterview === true;
    const level = text(body.interviewLevel).toLowerCase() === 'advanced' ? 'advanced' : 'normal';
    const promptStyle: InterviewPromptStyle = voiceInterview
      ? level === 'advanced'
        ? 'voice_advanced'
        : 'voice_normal'
      : 'typed';

    const defaultQuestion =
      `To start us off — how did you get interested in ${profession}, and which part of your background from your profile best reflects where you want to go next?`;

    const modeHint =
      promptStyle === 'voice_advanced'
        ? 'Voice interview · Advanced depth'
        : promptStyle === 'voice_normal'
          ? 'Voice interview · Normal (realistic hiring mix)'
          : 'Typed chat interview';

    const system = `You are an expert hiring manager running a realistic mock interview for this ONE candidate.

Target role / field: ${profession}
Session mode: ${modeHint}

Stream ONLY the first interview question as plain text — one continuous question the interviewer would ask aloud.
No JSON. No preamble like "Here is the question:" or labels. No quotation marks wrapping the whole question.
${
      candidateFirstName
        ? `\nPersonalization: candidate first name is "${candidateFirstName}". If it fits naturally, use it at most once in this opening question; otherwise address them as "you".\n`
        : ''
    }
${firstQuestionPolicyBlock(profession, expDesc, promptStyle)}

Candidate context (use this):
---
${contextBlock}
---`;

    const profileJson = JSON.stringify(stripInternalInterviewFields(profile)).slice(0, 14_000);

    const streamMessages = [
      { role: 'system' as const, content: system },
      {
        role: 'user' as const,
        content: `Generate the first interview question.\n\nStructured profile JSON (extra detail):\n${profileJson}`,
      },
    ];

    const storedProfile = {
      ...profile,
      [INTERVIEW_METRICS_KEY]: metrics ?? {},
      ...(voiceInterview ? { voiceInterviewLevel: level } : {}),
    };

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(sseLine(obj));
        try {
          let full = '';
          for await (const chunk of chatCompletionTextStream(streamMessages, { temperature: 0.45 })) {
            full += chunk;
            send({ t: 'd', c: chunk });
          }

          const question = full.replace(/\r\n/g, '\n').trim() || defaultQuestion;

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

          if (error) {
            send({ t: 'error', message: error.message });
            controller.close();
            return;
          }

          const sessionId = data.id as string;
          send({ t: 'ready', sessionId, question });
          send({ t: 'done', sessionId, question });
          controller.close();
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Stream failed';
          console.error(e);
          send({ t: 'error', message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    if (isResponse(e)) return e;
    const message = e instanceof Error ? e.message : 'Server error';
    console.error(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
