import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  buildInterviewContextLines,
  professionTitle,
  readInterviewMetrics,
  stripInternalInterviewFields,
} from '../_shared/interviewProfile.ts';
import { chatCompletionJson } from '../_shared/openai.ts';
import { isResponse, requireAuth } from '../_shared/supabase.ts';

type Msg = { role: 'user' | 'assistant'; content: string };

const MAX_TURNS = 6;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { supabase, user } = await requireAuth(req);
    const { sessionId, answer } = (await req.json()) as {
      sessionId: string;
      answer: string;
    };

    if (!sessionId || !answer?.trim()) {
      return jsonResponse({ error: 'sessionId and answer are required' }, 400);
    }

    const { data: row, error: fetchErr } = await supabase
      .from('interview_sessions')
      .select('id, profile, messages, turn_count')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !row) {
      return jsonResponse({ error: 'Session not found' }, 404);
    }

    const profile = row.profile as Record<string, unknown>;
    const metricsSnapshot = readInterviewMetrics(profile);
    const messages: Msg[] = Array.isArray(row.messages) ? [...(row.messages as Msg[])] : [];
    const turn = Number(row.turn_count) + 1;

    messages.push({ role: 'user', content: answer.trim() });

    const profession = professionTitle(profile);
    const candidateSummary = buildInterviewContextLines(profile, metricsSnapshot ?? null);

    let feedback =
      'Thanks for the detail. Try to tie your example to a measurable outcome next time.';
    let score = 7;
    let nextQuestion: string | null = null;
    let finished = false;

    if (turn >= MAX_TURNS) {
      finished = true;
      nextQuestion = null;
      const transcriptEnd = messages
        .map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
        .join('\n');
      const rawEnd = await chatCompletionJson(
        [
          {
            role: 'system',
            content:
              `Mock interview for ${profession} — final candidate answer (question ${MAX_TURNS} of ${MAX_TURNS}). Respond ONLY JSON: {"feedback":"2-4 sentences closing feedback","score":number}`,
          },
          {
            role: 'user',
            content: `Transcript:\n${transcriptEnd.slice(-9000)}\nGive closing feedback and score this final answer only.`,
          },
        ],
        { temperature: 0.35 },
      );
      if (rawEnd) {
        try {
          const parsedEnd = JSON.parse(rawEnd) as { feedback?: string; score?: number };
          if (parsedEnd.feedback) feedback = parsedEnd.feedback;
          if (typeof parsedEnd.score === 'number') {
            score = Math.min(10, Math.max(1, Math.round(parsedEnd.score)));
          }
        } catch {
          feedback =
            `Thanks for completing all ${MAX_TURNS} practice answers. Review your examples and tighten one story with a clearer metric next time.`;
        }
      } else {
        feedback =
          `Thanks for completing all ${MAX_TURNS} practice answers. Summarize one strength you showed and one thing you would refine for a real interview.`;
      }
    } else {
      const system = `You are a seasoned interviewer hiring for: ${profession}.

The candidate just answered your previous question. Respond ONLY with valid JSON:
{
  "feedback": "2-4 sentences of constructive feedback on clarity, relevance, and depth",
  "score": 1-10 integer,
  "nextQuestion": "one follow-up interview question string, or null if the interview should end",
  "finished": boolean
}

Rules for nextQuestion:
- Must be specific to ${profession} (technical, behavioral, or situational — whatever fits real interviews for THIS role). Avoid generic prompts that could apply to every industry unless follow-up context demands it.
- Build on the transcript: probe gaps, tradeoffs, metrics, collaboration, or specifics they mentioned.
- Calibrate difficulty using the candidate summary (experience level, skills).
- One concise question only. Use finished true with nextQuestion null only when ending early or when the interview has run its course.`;

      const transcript = messages
        .map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
        .join('\n');

      const profileJson = JSON.stringify(stripInternalInterviewFields(profile)).slice(0, 10_000);

      const userPrompt = `Candidate summary (use for role fit and depth):
---
${candidateSummary}
---

Transcript:
${transcript}

Extra profile JSON (if needed):
${profileJson}

Give feedback, score, and next question.`;

      const raw = await chatCompletionJson(
        [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.4 }
      );

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as {
            feedback?: string;
            score?: number;
            nextQuestion?: string | null;
            finished?: boolean;
          };
          if (parsed.feedback) feedback = parsed.feedback;
          if (typeof parsed.score === 'number') {
            score = Math.min(10, Math.max(1, Math.round(parsed.score)));
          }
          if (parsed.finished === true || parsed.nextQuestion === null || parsed.nextQuestion === '') {
            finished = true;
            nextQuestion = null;
          } else if (typeof parsed.nextQuestion === 'string' && parsed.nextQuestion.trim()) {
            nextQuestion = parsed.nextQuestion.trim();
          } else {
            finished = true;
            nextQuestion = null;
          }
        } catch {
          finished = turn >= MAX_TURNS - 1;
          nextQuestion = finished
            ? null
            : `Thinking about ${profession} roles specifically, what is one capability you are strengthening now, and how are you practicing it?`;
        }
      } else {
        finished = turn >= MAX_TURNS - 1;
        nextQuestion = finished
          ? null
          : `For ${profession}, describe a recent challenge where you had to trade off quality, scope, or time — what did you decide and why?`;
      }

      if (!finished && nextQuestion) {
        messages.push({ role: 'assistant', content: nextQuestion });
      }
    }

    const { error: upErr } = await supabase
      .from('interview_sessions')
      .update({
        messages,
        turn_count: turn,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (upErr) throw upErr;

    return jsonResponse({
      feedback,
      score,
      nextQuestion,
      finished,
    });
  } catch (e) {
    if (isResponse(e)) return e;
    const message = e instanceof Error ? e.message : 'Server error';
    console.error(e);
    return jsonResponse({ error: message }, 500);
  }
});
