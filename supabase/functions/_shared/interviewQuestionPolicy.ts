/**
 * Shared copy for mock-interview question generation (start + continue, JSON + stream).
 * `turn` = value used in continue-interview after incrementing from row.turn_count
 * (1 = first candidate answer being graded → next question is Q2 in the session).
 *
 * `typed` = standard chat mock interview. Voice-only modes add public / screening-style questions.
 */

export type InterviewPromptStyle = 'typed' | 'voice_normal' | 'voice_advanced';

/** Opening question — typed chat stays CV-first; voice modes mix in real-screen style topics. */
export function firstQuestionPolicyBlock(profession: string, expDesc: string, style: InterviewPromptStyle): string {
  if (style === 'voice_normal') {
    return `FIRST QUESTION — VOICE / NORMAL (realistic hiring mix):
- Sound like a live phone or video screen for ${profession}.
- Prefer ONE question that still anchors in THEIR profile or CV (headline, role, stack, project, goal) — name something concrete when you can.
- It is OK to blend in what real interviewers ask publicly for this field: a light conceptual hook (what problem does X solve), a comparison between two tools they list or that are standard for ${profession}, or how they'd explain a core idea simply — keep it fair for ${expDesc}, spoken aloud, ~one minute max.
- Avoid multi-part exams or riddles; ONE question only; no preamble labels.`;
  }
  if (style === 'voice_advanced') {
    return `FIRST QUESTION — VOICE / ADVANCED (stronger technical screen):
- Same candidate knows ${profession}; calibrate to ${expDesc} but push depth sooner than a casual chat.
- Anchor at least part of the question in their materials (stack, title, project). Pair that with a sharper angle typical of strong screens: tradeoffs, failure modes, performance/security/UX hooks, or how they'd compare two mainstream approaches in their stack.
- Still ONE spoken question, no laundry list; answerable in about a minute of talking.`;
  }
  return `FIRST QUESTION — EASY OPENER (like the first 5 minutes of a real interview):
- Goal: help the candidate settle in. Prefer a warm, direct opener tied to THEIR background — not an abstract puzzle or a deep technical drill.
- Strong patterns: brief walk-through of their path into ${profession}; how they'd introduce themselves using their headline or top experience; what drew them to this field; or "pick something on your profile or CV you'd like me to know first" (still one question).
- You MUST anchor the question in their candidate context or profile JSON (e.g. headline, current role, a skill, a project line, education, goal, or CV-derived hint). Name something concrete from their materials when possible.
- Match tone to experience level: ${expDesc}. Keep cognitive load low — answerable in about a minute without heavy prep.
- Avoid: jumping straight into hard architecture, production war stories under pressure, or generic questions that ignore their file.
- ONE concise question only; no preamble in the string; not multiple questions in one string.`;
}

/**
 * Follow-up questions after the opener.
 */
export function continueNextQuestionPolicyBlock(
  profession: string,
  turn: number,
  style: InterviewPromptStyle,
): string {
  if (style === 'voice_normal') {
    if (turn <= 2) {
      return `NEXT QUESTION — VOICE / NORMAL (questions 2–3):
- Mix **personalized** follow-ups with **public-style** interview topics hiring managers actually ask for ${profession}: clarify their last answer; motivation; light behavioral example; OR one focused conceptual/comparison question tied to tools common in their role (still prefer linking to profile or transcript when possible).
- Examples of good public angles (pick ONE per question): definitions at a practical level, "when would you use A vs B?", common pitfalls, how they'd debug or validate something — not trivia disconnected from the role.
- Conversational; no multi-part stress tests yet. ONE concise question only.`;
    }
    return `NEXT QUESTION — VOICE / NORMAL (question 4+):
- Deeper like a real loop: scenarios, tradeoffs, collaboration, metrics, shipping/debugging — grounded in ${profession}.
- Continue to blend CV/transcript threads with strong field-typical topics (architecture-ish hooks, production mindset) where appropriate — still ONE focused question.`;
  }

  if (style === 'voice_advanced') {
    if (turn <= 2) {
      return `NEXT QUESTION — VOICE / ADVANCED (questions 2–3):
- Earlier depth than Normal: conceptual rigor, comparisons, tradeoffs, edge cases, or production-flavored reasoning typical for ${profession}.
- Tie to their stated stack/experience when possible; if not in transcript yet, ask one sharp role-fundamental question a senior interviewer would still ask on a phone screen.
- ONE question only — no multi-part exams.`;
    }
    return `NEXT QUESTION — VOICE / ADVANCED (question 4+):
- Full hiring-loop depth: architecture tradeoffs, scaling, incidents, security/performance, ownership under ambiguity — realistic for ${profession}.
- Ground in transcript/profile where you can; stretch questions allowed when still role-authentic. ONE clear question.`;
  }

  if (turn <= 2) {
    return `NEXT FOLLOW-UP QUESTION — WARM-UP (session questions 2–3, EASY):
- Keep it conversational and encouraging, like an early phone or video screen.
- Good angles: clarify something they said; a light follow-up on their resume path; motivation; how they're building skills; or a simple "tell me more about X" where X is from their profile, CV context, or last answer.
- MUST reference something specific from the transcript, candidate summary, or profile (avoid generic prompts that could apply to anyone).
- Do NOT escalate to heavy system design, whiteboard complexity, or multi-part stress questions yet.
- You may mention tools or "what you're learning lately" only as a soft hook, not an interrogation.
- ONE concise question only.`;
  }
  return `NEXT FOLLOW-UP QUESTION — MID INTERVIEW (session question 4+, MEDIUM — like real hiring loops):
- Increase depth: realistic scenarios, tradeoffs, shipping/debugging, collaboration, metrics, or how they'd approach a task typical for ${profession}.
- Ground the question in their CV/profile (skills, tools, experiences) AND/OR current practices / newer technologies relevant to this role when it fits — not trivia for trivia's sake.
- Build on gaps, specifics, or interesting threads from the transcript.
- Still one clear, focused question — not a multi-part exam.`;
}
