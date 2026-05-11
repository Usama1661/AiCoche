import { chatCompletionJson } from './openai.ts';

export type InterviewMsg = { role: 'user' | 'assistant'; content: string };

/** The interviewer question the candidate is answering (assistant message before the latest user turn). */
export function lastAssistantQuestion(messages: InterviewMsg[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      const q = messages[i].content.trim();
      return q.length ? q : null;
    }
  }
  return null;
}

const TRIVIAL_ONE_WORD =
  /^(hi|hello|hey|ok|okay|yes|no|none|nah|yeah|yep|nope|sure|thanks|thank you|idk|dunno)\.?$/i;

export function trivialAnswerHeuristic(answer: string): boolean {
  const t = answer.trim();
  if (!t || t.length < 2) return true;
  if (t.length <= 6 && TRIVIAL_ONE_WORD.test(t)) return true;
  return false;
}

/**
 * True when the candidate's reply does not meaningfully answer the interview question.
 * Uses a cheap JSON classifier; fails open (returns false = treat as adequate) on errors.
 */
export async function shouldRedirectNonAnswer(params: {
  profession: string;
  question: string;
  answer: string;
}): Promise<boolean> {
  const { profession, question, answer } = params;
  const trimmed = answer.trim();
  if (!trimmed) return true;
  if (trivialAnswerHeuristic(trimmed)) return true;

  const raw = await chatCompletionJson(
    [
      {
        role: 'system',
        content: `You evaluate mock interview turns. Respond ONLY JSON: {"redirect":true|false}
Set redirect=true when the candidate did NOT genuinely try to answer the interview QUESTION with substance. Use true for: greetings; asking to start/stop/repeat/begin; meta chatter; filler with no answer; nonsense or heavily broken text with no clear response; answers totally unrelated to what was asked; refusing without addressing the topic ("none", "nothing", "skip") unless they briefly explain why in an interview-appropriate way.
Set redirect=false when they engage with the question even if brief, imperfect, or speech-to-text is slightly messy but intent is clear.
Never use the candidate's CV or profile — judge ONLY the question and their reply text.`,
      },
      {
        role: 'user',
        content: `Role: ${profession}

Interview question:
${question.slice(0, 3500)}

Candidate reply (may include speech-to-text errors):
${trimmed.slice(0, 3500)}`,
      },
    ],
    { temperature: 0, maxOutputTokens: 48 },
  );

  if (!raw) return false;
  try {
    const p = JSON.parse(raw) as { redirect?: boolean };
    return p.redirect === true;
  } catch {
    return false;
  }
}

export const NON_ANSWER_FEEDBACK =
  "That didn't answer the interview question yet — short greetings or asking me to start don't count as your answer. Take a moment, then give a sentence or two that speaks to what I asked. I'll repeat the question for you.";
