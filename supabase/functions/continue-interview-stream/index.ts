import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders } from '../_shared/cors.ts';
import {
  lastAssistantQuestion,
  NON_ANSWER_FEEDBACK,
  shouldRedirectNonAnswer,
} from '../_shared/interviewAnswerGate.ts';
import { continueNextQuestionPolicyBlock } from '../_shared/interviewQuestionPolicy.ts';
import {
  buildInterviewContextLines,
  professionTitle,
  readInterviewMetrics,
  stripInternalInterviewFields,
} from '../_shared/interviewProfile.ts';
import { chatCompletionJson, chatCompletionTextStream } from '../_shared/openai.ts';
import { isResponse, requireAuth } from '../_shared/supabase.ts';

type Msg = { role: 'user' | 'assistant'; content: string };

const MAX_TURNS = 6;
const SPLIT = '<<<SPLIT>>>';

function parseStreamedReply(
  fullRaw: string,
  isClosingOnly: boolean
): { feedback: string; nextQuestion: string | null } {
  const full = fullRaw.replace(/\r\n/g, '\n').trim();
  const idx = full.indexOf(SPLIT);
  if (idx !== -1) {
    const feedback = full.slice(0, idx).trim();
    const after = full.slice(idx + SPLIT.length).trim();
    const low = after.toUpperCase();
    if (!after || low === 'NONE' || low === 'END' || low === 'N/A') {
      return { feedback, nextQuestion: null };
    }
    return { feedback, nextQuestion: after };
  }
  if (isClosingOnly) {
    return { feedback: full, nextQuestion: null };
  }
  const paras = full
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length >= 2) {
    return { feedback: paras[0], nextQuestion: paras.slice(1).join('\n\n') };
  }
  return { feedback: full, nextQuestion: null };
}

async function scoreTurnAnswer(params: {
  profession: string;
  candidateAnswer: string;
  interviewerText: string;
}): Promise<number> {
  const raw = await chatCompletionJson(
    [
      {
        role: 'system',
        content:
          'You score one mock interview turn. Respond ONLY JSON: {"score": integer from 1 to 10} based on clarity, relevance, and depth of the candidate answer alone. If they did not answer the question (greeting, meta request, unrelated one-liner), score 1 or 2. Never infer substance from the interviewer text alone.',
      },
      {
        role: 'user',
        content: `Role context: ${params.profession}\n\nCandidate answer:\n${params.candidateAnswer.slice(0, 4000)}\n\nInterviewer just said (feedback and optional follow-up):\n${params.interviewerText.slice(0, 4000)}`,
      },
    ],
    { temperature: 0.15, maxOutputTokens: 64 }
  );
  if (!raw) return 7;
  try {
    const p = JSON.parse(raw) as { score?: number };
    if (typeof p.score === 'number') return Math.min(10, Math.max(1, Math.round(p.score)));
  } catch {
    /* ignore */
  }
  return 7;
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
    const { sessionId, answer } = (await req.json()) as {
      sessionId?: string;
      answer?: string;
    };

    if (!sessionId || !answer?.trim()) {
      return new Response(JSON.stringify({ error: 'sessionId and answer are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: row, error: fetchErr } = await supabase
      .from('interview_sessions')
      .select('id, profile, messages, turn_count')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !row) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profile = row.profile as Record<string, unknown>;
    const metricsSnapshot = readInterviewMetrics(profile);
    const messages: Msg[] = Array.isArray(row.messages) ? [...(row.messages as Msg[])] : [];
    const tentativeTurn = Number(row.turn_count) + 1;

    messages.push({ role: 'user', content: answer.trim() });

    const profession = professionTitle(profile);
    const candidateSummary = buildInterviewContextLines(profile, metricsSnapshot ?? null);

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

Reply as instructed in the system message.`;

    const isClosingOnly = tentativeTurn >= MAX_TURNS;

    const streamMessages = isClosingOnly
      ? [
          {
            role: 'system' as const,
            content: `Mock interview for ${profession} — final candidate answer (question ${MAX_TURNS} of ${MAX_TURNS}). 
You are the interviewer. Stream only your spoken closing: 2-4 sentences of feedback on their final answer. 
Comment ONLY on what they actually said — no fake praise for content missing from their reply.
No JSON, no bullet labels, no delimiter lines — plain speech only.`,
          },
          { role: 'user' as const, content: `Transcript:\n${transcript.slice(-9000)}\n\nGive closing feedback only.` },
        ]
      : [
          {
            role: 'system' as const,
            content: `You are a seasoned interviewer hiring for: ${profession}.

The candidate just answered your previous question.

Output ONLY the words you will speak aloud to the candidate, using this exact structure:
1) Write 2-4 sentences of constructive feedback (clarity, relevance, depth).
2) On its own line, output exactly this delimiter (nothing else on that line): ${SPLIT}
3) On the following lines, write ONE concise follow-up interview question for ${profession}. It must fit the interview phase below and feel grounded in their CV/profile and transcript (and, in the medium phase, realistic tech or practice depth where appropriate).

Rules:
- Feedback MUST reflect ONLY what the candidate actually said in their latest reply. Do not praise experiences, tools, or stories they did not mention. The CV/profile context is for shaping your NEXT question, not for inventing what they said.
- If their reply does not answer your question (e.g. greeting, asking to start, off-topic filler), say so briefly and professionally — do not give fake praise.
- No JSON. No prefixes like "Feedback:" or "Question:".
- The delimiter line must be exactly ${SPLIT} with no spaces before or after.
- To end the interview after this turn with no follow-up question, output ${SPLIT} on its own line, then a second line with only NONE.

${continueNextQuestionPolicyBlock(profession, tentativeTurn)}`,
          },
          { role: 'user' as const, content: userPrompt },
        ];

    const temperature = isClosingOnly ? 0.35 : 0.4;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(sseLine(obj));
        try {
          const pendingQuestion = lastAssistantQuestion(messages);
          if (!isClosingOnly && pendingQuestion) {
            const redirect = await shouldRedirectNonAnswer({
              profession,
              question: pendingQuestion,
              answer: answer.trim(),
            });
            if (redirect) {
              const fb = NON_ANSWER_FEEDBACK;
              const nq = pendingQuestion;
              messages.push({ role: 'assistant', content: nq });
              const { error: upEarly } = await supabase
                .from('interview_sessions')
                .update({
                  messages,
                  turn_count: row.turn_count,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', sessionId)
                .eq('user_id', user.id);

              if (upEarly) {
                send({ t: 'error', message: upEarly.message });
                controller.close();
                return;
              }

              send({ t: 'ready', feedback: fb, nextQuestion: nq, finished: false });
              send({
                t: 'done',
                feedback: fb,
                nextQuestion: nq,
                score: 1,
                finished: false,
              });
              controller.close();
              return;
            }
          }

          let full = '';
          for await (const chunk of chatCompletionTextStream(streamMessages, { temperature })) {
            full += chunk;
            send({ t: 'd', c: chunk });
          }

          if (!full.trim()) {
            send({ t: 'error', message: 'Empty model response' });
            controller.close();
            return;
          }

          const { feedback, nextQuestion } = parseStreamedReply(full, isClosingOnly);
          const fb = feedback.trim();
          if (!fb) {
            send({ t: 'error', message: 'Could not parse interviewer feedback' });
            controller.close();
            return;
          }

          const nq = isClosingOnly ? null : nextQuestion?.trim() ? nextQuestion.trim() : null;
          const finished = isClosingOnly || !nq;

          if (!finished && nq) {
            messages.push({ role: 'assistant', content: nq });
          }

          const { error: upErr } = await supabase
            .from('interview_sessions')
            .update({
              messages,
              turn_count: tentativeTurn,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId)
            .eq('user_id', user.id);

          if (upErr) {
            send({ t: 'error', message: upErr.message });
            controller.close();
            return;
          }

          /** Lets the client start TTS while the small scoring model still runs. */
          send({ t: 'ready', feedback: fb, nextQuestion: nq, finished });

          const interviewerForScore = nq ? `${fb}\n\n${nq}` : fb;
          const score = await scoreTurnAnswer({
            profession,
            candidateAnswer: answer.trim(),
            interviewerText: interviewerForScore,
          });

          send({
            t: 'done',
            feedback: fb,
            nextQuestion: nq,
            score,
            finished,
          });
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
