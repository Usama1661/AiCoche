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

/**
 * Candidate is steering the mock interview (pace, length, clarity, difficulty) — not dodging the topic.
 * Tuned for messy speech-to-text: short fragments, missing words, common mis-hearings.
 */
export function isInterviewMetaOrAssistanceRequest(answer: string): boolean {
  const t = answer.trim();
  if (t.length < 6) return false;
  const s = t.toLowerCase().replace(/\s+/g, ' ');

  const asksEasierOrAboutDifficulty =
    /\b(easy|easier|easiest|basic|beginner|entry-level|gentler|softball)\b.*\b(ques|question|questions)\b/.test(s) ||
    /\b(ques|question|questions)\b.*\b(easy|easier|easiest|basic|beginner|gentler)\b/.test(s) ||
    /\b(simple|simpler|quick|small)\b.*\b(ques|question|questions)\b/.test(s) ||
    /\b(ques|question|questions)\b.*\b(simple|simpler|quick|small)\b/.test(s) ||
    /\b(the|your|these|those|this|that)\s+(ques|question|questions)\b.*\b(is|are|were|sounds?|feels?)\b.{0,40}\b(too|very|really|so)?\s*(hard|difficult|tough|confus|confusing)\b/.test(
      s
    );

  const asksPaceOrFormat =
    /\b(too\s+)?long\b.*\b(ques|question|questions)\b.*\b(short|shorter|smaller|simpler|easier|less)\b/.test(s) ||
    (/\b(ques|question|questions)\b.*\b(too\s+)?long\b/.test(s) &&
      /\b(short|shorter|smaller|simpler|easier|less|small|quick|simple)\b/.test(s)) ||
    /\b(this|that|it)\s+is\s+(\w+\s+){0,4}(too\s+)?long\b.*\b(short|shorter|simpler|please|can\s+you|could)\b/.test(s) ||
    asksEasierOrAboutDifficulty ||
    /\b(short|shorter|smaller|simpler|easier|less|quick|small|simple)\b.*\b(ques|question|questions)\b/.test(s) ||
    /\b(ques|question|questions)\b.*\b(short|shorter|simpler|easier|quick|small|simple)\b/.test(s) ||
    /\bask(\s+me)?\s+(a\s+)?(some\s+)?(easy|easier|easiest|basic|beginner|short|shorter|simpler|smaller)\b/.test(s) ||
    /\b(one\s+)?(short|quick|small|simple|easy|basic)\b.*\b(ques|question|questions)\b/.test(s) ||
    /\b(these|those|they|this|that|it)\s+(is|are)\s+(too\s+|very\s+|really\s+)?(hard|difficult|tough|confus|confusing)\b/.test(s) ||
    /\b(i\s+)?(can'?t|cannot)\s+(answer|handle|do)\b.*\b(too\s+)?(hard|difficult|tough)\b/.test(s) ||
    /\btoo\s+much\b.*\b(information|detail|text|at\s+once|all\s+at)\b/.test(s) ||
    /\b(?:please\s+)?slow\s+down\b/.test(s) ||
    /\bslow\s+down\s+please\b/.test(s) ||
    /\b(?:you(?:'re|\s+are)|this|it)\s+is\s+too\s+fast\b/.test(s) ||
    /\b(repeat|re-?say)\s+(?:the\s+)?(?:question|ques)\b/.test(s) ||
    /\bsay\s+(?:that|it)\s+again\b/.test(s) ||
    /\b(re-?phrase|re-?word|clarif|explain\s+(that|this|what)|don'?t\s+understand|didn'?t\s+(get|catch|hear|follow))\b/.test(
      s
    ) ||
    /\b(break\s+(that|this|it)\s+down|step\s+by\s+step|piece\s+by\s+piece|one\s+at\s+a\s+time)\b/.test(s) ||
    (/\b(can|could|would)\s+you\b/.test(s) &&
      /\b(please\s+)?(ask|give|say|repeat|use|try)\b/.test(s) &&
      /\b(short|shorter|simpler|easier|slower|again|smaller|less|easy|easier|easiest|basic|gentler|simple)\b/.test(s));

  if (asksPaceOrFormat) return true;

  // Very short STT lines that are clearly format requests, not technical answers
  if (
    t.length <= 80 &&
    /\b(short|shorter|simpler|slower|repeat|again|easy|easier|too\s+hard|hard|difficult)\b/.test(s) &&
    !/\b(i|we)\s+(use|built|implemented|would)\b/.test(s)
  ) {
    return true;
  }

  return false;
}

/**
 * Candidate clearly says they don't know or have no answer — valid turn; interviewer should
 * respond with empathy (hint, rephrase, or easier question), not the generic non-answer redirect.
 */
export function isHonestIDKOrNoAnswer(answer: string): boolean {
  const t = answer.trim();
  if (t.length < 4) return false;
  const s = normalizeSttGlitchTokens(t.toLowerCase().replace(/\s+/g, ' '));

  return (
    /\b(i\s+)?(do\s*not|don'?t)\s+have\s+(an?\s+|the\s+|any\s+|this\s+)?(answer|idea|clue)\b/.test(s) ||
    /\b(i\s+)?(do\s*not|don'?t)\s+have\b.{0,50}\banswer\b/.test(s) ||
    /\b(i\s+)?(do\s*not|don'?t)\s+know\b/.test(s) ||
    /\b(not\s+sure|unsure|no\s+idea|idk)\b/.test(s) ||
    /\b(can'?t|cannot)\s+answer\b/.test(s) ||
    /\bno\s+answer\b.{0,60}\b(ques|question|this|that|it)\b/.test(s) ||
    /\b(haven'?t|have\s+not)\s+(learned|studied|covered|done|used|seen)\b/.test(s) ||
    /\b(not\s+familiar(\s+with)?|out\s+of\s+my\s+depth)\b/.test(s) ||
    /\b(wouldn'?t|would\s+not)\s+know\s+(how|what)\b/.test(s) ||
    /\bpata\s+nahi\b/.test(s) ||
    /\bmaloom\s+nahi\b/.test(s) ||
    /\bmujh(e|y)\s+nahi\s+pata\b/.test(s) ||
    /\bmujh(e|y)\s+nahi\s+maloom\b/.test(s) ||
    /\bidea\s+nahi\b/.test(s) ||
    /\b(?:main\s+)?nahi\s+jant[ia]\b/.test(s) ||
    /\b(?:mein|main)\s+ko\s+nahi\s+pata\b/.test(s) ||
    /\bsamajh\s+nahi\s+a[aiy]{1,2}\b/.test(s) ||
    /\bno\s+knowledge\b/.test(s)
  );
}

/** Light normalization for common speech-to-text tokenization glitches. */
function normalizeSttGlitchTokens(s: string): string {
  return s
    .replace(/\bdon\s+t\b/g, "don't")
    .replace(/\bdont\b/g, "don't")
    .replace(/\bdidnt\b/g, "didn't")
    .replace(/\bhavent\b/g, "haven't")
    .replace(/\bhasnt\b/g, "hasn't")
    .replace(/\bwasnt\b/g, "wasn't")
    .replace(/\bwerent\b/g, "weren't")
    .replace(/\bcan\s*t\b/g, "can't")
    .replace(/\bwont\b/g, "won't")
    .replace(/\bim\b/g, "i'm")
    .replace(/\bive\b/g, "i've");
}

/**
 * Candidate says they have not done / not worked on something yet, it is in progress, or they will
 * explain later — common with speech-to-text ("don't have work on this feature…").
 * Treat as a real turn for the interviewer (not the generic non-answer redirect).
 * Covers many paraphrases; classifier still backs up borderline cases.
 */
export function isExperienceGapOrDeferredReply(answer: string): boolean {
  const t = answer.trim();
  if (t.length < 12) return false;
  const s = normalizeSttGlitchTokens(t.toLowerCase().replace(/\s+/g, ' '));

  if (/\b(don'?t|do\s*not)\s+have\s+work\s+on\b/.test(s)) return true;
  if (/\b(don'?t|do\s*not)\s+have\s+(work|experience|time|a\s+chance|opportunity)\b/.test(s)) return true;
  if (/\bhaven'?t\s+(worked|done|implemented|built|shipped|had|started|touched|got|gotten)\b/.test(s)) return true;
  if (/\b(have\s+not)\s+(worked|done|implemented|built|shipped|started|touched)\b/.test(s)) return true;
  if (/\b(not|never)\s+worked\s+on\b/.test(s)) return true;
  if (/\b(didn'?t|never)\s+touch(ed)?\b/.test(s)) return true;
  if (/\b(no|not\s+any)\s+experience\s+(with|on|in)\b/.test(s)) return true;
  if (/\bno\s+hands[\s-]?on\b/.test(s)) return true;
  if (/\b(not|never)\s+been\s+involved\s+(with|in)\b/.test(s)) return true;
  if (/\b(wasn'?t|was\s+not)\s+part\s+of\b/.test(s)) return true;
  if (/\b(wasn'?t|isn'?t)\s+(on|assigned)\s+(to\s+)?(this|that|it|me|my)\b/.test(s)) return true;
  if (/\b(haven'?t|didn'?t)\s+get\b.{0,30}\b(chance|time|opportunity)\b/.test(s)) return true;
  if (/\b(haven'?t|have\s+not)\s+(got|gotten)\s+to\b/.test(s)) return true;

  if (/\b(isn'?t|is\s+not|hasn'?t|haven'?t|have\s+not)\s+been\s+(done|finished|completed|shipped|built)\b/.test(s)) {
    return true;
  }

  if (/\b(will|gonna|going\s+to|i'?ll|i\s+will)\s+explain\b.{0,45}\b(later|after|when|then|once|tomorrow)\b/.test(s)) {
    return true;
  }
  if (/\b(later|after|once|when|tomorrow)\b.{0,45}\b(i'?ll|i\s+will|going\s+to)\s+(explain|walk|cover|share|describe|clarify)\b/.test(s)) {
    return true;
  }
  const negNear =
    /\b(haven'?t|have\s+not|don'?t|do\s*not|didn'?t|never|can'?t|cannot|not\s+sure|not\s+yet|no\s+experience|no\s+hands)\b/;
  if (
    negNear.test(s) &&
    /\b(explain|walk\s+through|go\s+over|cover|talk\s+through)\b.{0,40}\b(later|afterwards|after|tomorrow|once|then)\b/.test(s)
  ) {
    return true;
  }
  if (
    negNear.test(s) &&
    /\b(later|after|tomorrow|once)\b.{0,50}\b(explain|walk|cover|share|describe)\b/.test(s)
  ) {
    return true;
  }

  if (/\bonce\b.{0,55}\b(done|finished|complete|completed|shipped|ready|live)\b/.test(s) && /\b(then|i'?ll|i\s+will|explain)\b/.test(s)) {
    return true;
  }

  if (/\b(need|needed)\s+to\s+(finish|complete|ship|wrap)\b.{0,35}\b(first|before)\b/.test(s)) return true;

  if (t.length <= 140 && /\b(circle\s+back|come\s+back\s+to\s+(that|this|it))\b/.test(s)) return true;

  return false;
}

/** Candidate is commenting on interview mechanics (e.g. two questions at once) — not dodging. */
export function isInterviewProcessMetaFeedback(answer: string): boolean {
  const t = answer.trim();
  if (t.length < 14) return false;
  const s = normalizeSttGlitchTokens(t.toLowerCase().replace(/\s+/g, ' '));

  if (/\b(two|2|both|double)\s+questions?\b/.test(s)) return true;
  if (/\byou\s+(ask|asked|are\s+asking)\b.{0,90}\b(and\s+then|then\s+you|also|another|second)\b/.test(s)) {
    return true;
  }
  if (/\bwhich\s+(one|question)\b.{0,50}\b(should|answer|mean|pick|choose|respond)\b/.test(s)) return true;
  if (/\b(first|second)\s+questions?\b/.test(s)) return true;
  if (/\b(confus|unclear|contradict|doesn'?t\s+make\s+sense)\b/.test(s) && /\b(question|ask|said)\b/.test(s)) {
    return true;
  }
  if (/\bwhat\s+is\s+this\b/.test(s) && /\b(ask|said|question|mean)\b/.test(s)) return true;
  if (/\b(at\s+once|same\s+time)\b/.test(s) && /\b(two|both|questions?)\b/.test(s)) return true;
  if (/\bone\s+question\b.{0,40}\b(at\s+a\s+time|please|only)\b/.test(s)) return true;
  return false;
}

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
  if (isInterviewMetaOrAssistanceRequest(trimmed)) return false;
  if (isHonestIDKOrNoAnswer(trimmed)) return false;
  if (isExperienceGapOrDeferredReply(trimmed)) return false;
  if (isInterviewProcessMetaFeedback(trimmed)) return false;

  const raw = await chatCompletionJson(
    [
      {
        role: 'system',
        content: `You evaluate mock interview turns. Respond ONLY JSON: {"redirect":true|false}
Set redirect=true when the candidate did NOT genuinely try to answer the interview QUESTION with substance. Use true for: bare greetings; empty filler; nonsense with no inferable intent; answers totally unrelated to what was asked; a lone refusal token ("none", "nothing", "skip") with no explanation.
Set redirect=false when they honestly say they do not know, have no answer, are not sure, or have not covered that area — that is valid communication, not empty filler. This includes Roman Urdu / Hinglish such as "pata nahi", "mujhe nahi pata", "idea nahi", "maloom nahi".
Set redirect=false when they say they have not worked on it yet, it is in progress, or they will explain later (including broken grammar from speech-to-text) — that is substantive situational context, not empty filler. Treat the SAME intent across paraphrases: e.g. not involved / not assigned / wasn't on that / no hands-on / haven't gotten to it / need to ship it first / hasn't been built yet / will walk through after / circle back to this / "once it is done I will explain" / STT glitches like "don t have work on" — prefer redirect=false when unsure.
Set redirect=false when they engage with the question even if brief, imperfect, or messy speech-to-text: infer intent generously when words are missing, misspelled, run together, or grammar is broken — if a reasonable hiring manager could tell they attempted an answer, do NOT redirect. When torn, prefer redirect=false.
Set redirect=false when they ask to change HOW the interview runs (not the same as dodging): shorter/simpler/smaller/easier/basic questions, lower difficulty ("too hard", "very difficult"), slower pace, repetition, rephrasing, clarification, "too long", "too much", "didn't catch that", step-by-step — these must go to the interviewer model to comply, not block.
Set redirect=false when they comment on interview mechanics (e.g. two questions at once, confusing flow, which question to answer) — treat as valid process feedback, not a non-answer.
Set redirect=false for "start/begin/go ahead" only when they clearly mean begin answering or begin the session; redirect=true if it is clearly just a hello with no follow-up.
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
    { temperature: 0, maxOutputTokens: 96, timeoutMs: 22_000 },
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
