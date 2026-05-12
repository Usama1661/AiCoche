import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  lastAssistantQuestion,
  NON_ANSWER_FEEDBACK,
  shouldRedirectNonAnswer,
} from '../_shared/interviewAnswerGate.ts';
import { continueNextQuestionPolicyBlock } from '../_shared/interviewQuestionPolicy.ts';
import {
  buildInterviewContextLines,
  interviewCandidateFirstName,
  interviewPromptStyle,
  interviewShouldAddressByNameThisTurn,
  professionTitle,
  readInterviewMetrics,
  stripInternalInterviewFields,
} from '../_shared/interviewProfile.ts';
import { chatCompletionJson } from '../_shared/openai.ts';
import { stripFeedbackTrailingQuestionsForDelivery } from '../_shared/interviewFeedbackSanitize.ts';
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
    const promptStyle = interviewPromptStyle(profile);
    const messages: Msg[] = Array.isArray(row.messages) ? [...(row.messages as Msg[])] : [];
    const tentativeTurn = Number(row.turn_count) + 1;

    messages.push({ role: 'user', content: answer.trim() });

    const profession = professionTitle(profile);
    const candidateSummary = buildInterviewContextLines(profile, metricsSnapshot ?? null);
    const candidateFirstName = interviewCandidateFirstName(profile, user);
    const useNameThisTurn =
      tentativeTurn < MAX_TURNS && interviewShouldAddressByNameThisTurn(String(row.id), tentativeTurn);

    let feedback =
      'Thanks for the detail. Try to tie your example to a measurable outcome next time.';
    let score = 7;
    let nextQuestion: string | null = null;
    let finished = false;

    if (tentativeTurn >= MAX_TURNS) {
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
              `Mock interview for ${profession} — final candidate answer (question ${MAX_TURNS} of ${MAX_TURNS}). Respond ONLY JSON: {"feedback":"2-4 sentences closing feedback","score":number}. Feedback must reflect only what the candidate actually said — no praise for missing content.${
                candidateFirstName
                  ? ` Candidate first name: "${candidateFirstName}". Prefer opening the closing feedback with their first name once (warm, professional), at most one use in the whole feedback; if it would sound odd, use neutral "you" instead.`
                  : ''
              }`,
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
      const pendingQuestion = lastAssistantQuestion(messages);
      if (pendingQuestion) {
        const redirect = await shouldRedirectNonAnswer({
          profession,
          question: pendingQuestion,
          answer: answer.trim(),
        });
        if (redirect) {
          feedback = NON_ANSWER_FEEDBACK;
          score = 1;
          nextQuestion = pendingQuestion;
          finished = false;
          messages.push({ role: 'assistant', content: nextQuestion });
          const { error: upRedirect } = await supabase
            .from('interview_sessions')
            .update({
              messages,
              turn_count: row.turn_count,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId)
            .eq('user_id', user.id);

          if (upRedirect) throw upRedirect;

          return jsonResponse({
            feedback,
            score,
            nextQuestion,
            finished,
          });
        }
      }

      const nameDirectives =
        candidateFirstName.length > 0
          ? `Personalization — candidate first name: "${candidateFirstName}". ${
              useNameThisTurn
                ? 'This turn you MAY use their first name at most once if it sounds natural (often when introducing the follow-up in nextQuestion). Never use the name more than once in the entire JSON output. Do not add honorifics.'
                : 'This turn do not address them by name; use neutral "you" only.'
            }`
          : '';

      const system = `You are a seasoned interviewer hiring for: ${profession}.

The candidate just answered your previous question. Respond ONLY with valid JSON:
{
  "feedback": "2-4 sentences of constructive feedback on clarity, relevance, and depth",
  "score": 1-10 integer,
  "nextQuestion": "one follow-up interview question string, or null if the interview should end",
  "finished": boolean
}

${nameDirectives ? `${nameDirectives}\n` : ''}
Rules for feedback and scoring:
- CRITICAL — one question this turn: "feedback" must be statement-only: NO question marks in feedback and NO direct asks there (no "could you share…?", "what is your…?"). Put the single follow-up interview question ONLY in nextQuestion. If you want a nudge, phrase it as a statement in feedback.
- Base feedback ONLY on the candidate's latest message. Do not attribute skills, projects, or experiences they did not mention. Profile/CV is for shaping nextQuestion, not for inventing what they said.
- When their reply says they have not worked on something yet, it is in progress, or they will explain later, treat that as real interview communication: acknowledge, score roughly 4-7 if the situation is clear, then move to a smaller slice of the topic or adjacent experience.
- If they did not answer the question (greeting, off-topic filler), say so briefly and score 1-3.
- If they honestly say they do not know or have no answer for this topic, respond supportively (it is normal in practice), score 4-7 for clear transparency, optionally one sentence of orientation — then either a simpler rephrase or a related question they might speak to.
- If they ask for easier, shorter, or simpler questions; say yours are too hard or difficult; or ask for slower pace, repetition, or clarification (often via imperfect speech-to-text), acknowledge briefly, score 5-8 for a clear request, and do not scold them.
- If they comment on interview mechanics (e.g. two questions at once, which to answer), acknowledge briefly in feedback (statements only), score 6-9 for a clear process comment, and set nextQuestion to exactly ONE clear question — do not stack a second new topic.

Rules for nextQuestion:
- Must feel like a real hiring conversation for ${profession}: grounded in their CV/profile summary, transcript, and (when in the medium phase) current tools or newer practices where appropriate — not generic filler.
- Build on the transcript: reference what they actually said; then probe appropriately for the phase below.
- If they requested easier, shorter, or simpler questions (or said yours were too hard), or said they do not know, your nextQuestion MUST be more basic and approachable than your last one: one focused ask, plain language, still on-topic for ${profession}. You may rephrase the same idea at a lower level instead of repeating the exact hard wording.
- CV / profile consistency (like a prepared interviewer): if their latest reply says they have not done or not worked on something that clearly appears in the candidate summary or profile JSON (same project, tool, stack, or responsibility), acknowledge calmly and reference it in neutral wording only when it is explicit there (e.g. that their resume or profile lists X — ask how that fits, what they owned, timeline, or teammate vs personal scope). Never invent a CV line that is not in the provided summary or JSON. If nothing clearly matches, pivot without implying a contradiction.
- One concise question only. Use finished true with nextQuestion null only when ending early or when the interview has run its course.

${continueNextQuestionPolicyBlock(profession, tentativeTurn, promptStyle)}`;

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
          finished = tentativeTurn >= MAX_TURNS - 1;
          nextQuestion = finished
            ? null
            : `Thinking about ${profession} roles specifically, what is one capability you are strengthening now, and how are you practicing it?`;
        }
      } else {
        finished = tentativeTurn >= MAX_TURNS - 1;
        nextQuestion = finished
          ? null
          : `For ${profession}, describe a recent challenge where you had to trade off quality, scope, or time — what did you decide and why?`;
      }

      feedback = stripFeedbackTrailingQuestionsForDelivery(feedback, nextQuestion);

      if (!finished && nextQuestion) {
        messages.push({ role: 'assistant', content: nextQuestion });
      }
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
