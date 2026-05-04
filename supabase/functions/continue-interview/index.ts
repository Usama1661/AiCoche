import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { chatCompletionJson } from '../_shared/openai.ts';

type Msg = { role: 'user' | 'assistant'; content: string };

const MAX_TURNS = 6;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
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
      .single();

    if (fetchErr || !row) {
      return jsonResponse({ error: 'Session not found' }, 404);
    }

    const profile = row.profile as Record<string, unknown>;
    const messages: Msg[] = Array.isArray(row.messages) ? [...(row.messages as Msg[])] : [];
    const turn = Number(row.turn_count) + 1;

    messages.push({ role: 'user', content: answer.trim() });

    const profession =
      (profile.professionLabel as string) ||
      (profile.professionKey as string) ||
      'professional';

    let feedback =
      'Thanks for the detail. Try to tie your example to a measurable outcome next time.';
    let score = 7;
    let nextQuestion: string | null = null;
    let finished = false;

    if (turn >= MAX_TURNS) {
      finished = true;
      nextQuestion = null;
    } else {
      const system = `You are an interviewer for a ${profession}. The candidate just answered. Respond ONLY with valid JSON:
{
  "feedback": "2-4 sentences of constructive feedback",
  "score": 1-10 integer,
  "nextQuestion": "one follow-up question string, or null if the interview should end",
  "finished": boolean
}
Use finished true with nextQuestion null when the conversation should end.`;

      const transcript = messages
        .map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
        .join('\n');

      const userPrompt = `Profile: ${JSON.stringify(profile)}

Transcript:
${transcript}

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
            : 'What is one skill you want to strengthen next, and how will you build it?';
        }
      } else {
        finished = turn >= MAX_TURNS - 1;
        nextQuestion = finished
          ? null
          : 'What is one skill you want to strengthen next, and how will you build it?';
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
      .eq('id', sessionId);

    if (upErr) throw upErr;

    return jsonResponse({
      feedback,
      score,
      nextQuestion,
      finished,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    console.error(e);
    return jsonResponse({ error: message }, 500);
  }
});
