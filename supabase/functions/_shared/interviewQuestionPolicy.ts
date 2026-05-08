/**
 * Shared copy for mock-interview question generation (start + continue, JSON + stream).
 * `turn` = value used in continue-interview after incrementing from row.turn_count
 * (1 = first candidate answer being graded → next question is Q2 in the session).
 */

/** Opening question only — easy, CV-grounded warm-up. */
export function firstQuestionPolicyBlock(profession: string, expDesc: string): string {
  return `FIRST QUESTION — EASY OPENER (like the first 5 minutes of a real interview):
- Goal: help the candidate settle in. Prefer a warm, direct opener tied to THEIR background — not an abstract puzzle or a deep technical drill.
- Strong patterns: brief walk-through of their path into ${profession}; how they'd introduce themselves using their headline or top experience; what drew them to this field; or "pick something on your profile or CV you'd like me to know first" (still one question).
- You MUST anchor the question in their candidate context or profile JSON (e.g. headline, current role, a skill, a project line, education, goal, or CV-derived hint). Name something concrete from their materials when possible.
- Match tone to experience level: ${expDesc}. Keep cognitive load low — answerable in about a minute without heavy prep.
- Avoid: jumping straight into hard architecture, production war stories under pressure, or generic questions that ignore their file.
- ONE concise question only; no preamble in the string; not multiple questions in one string.`;
}

/**
 * After the opening question, the next follow-ups use `turn` from continue handlers.
 * turn 1 → asking Q2; turn 2 → Q3: keep easy. turn 3+ → medium, CV/tech grounded.
 */
export function continueNextQuestionPolicyBlock(profession: string, turn: number): string {
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
