/**
 * When a formal follow-up question exists after the delimiter, feedback should be
 * statement-only. Models often append "Could you share…?" in feedback — that creates
 * two spoken questions. Strip trailing interrogative sentences from feedback for delivery.
 */
export function stripFeedbackTrailingQuestionsForDelivery(
  feedback: string,
  nextQuestion: string | null | undefined,
): string {
  const nq = typeof nextQuestion === 'string' ? nextQuestion.trim() : '';
  if (!nq) return feedback.trim();

  let s = feedback.trim();
  const original = s;

  for (let guard = 0; guard < 8; guard += 1) {
    if (!/\?\s*$/.test(s)) break;

    let cut = -1;
    for (let j = s.length - 2; j >= 0; j -= 1) {
      const ch = s[j];
      if (ch === '\n') {
        cut = j + 1;
        break;
      }
      if (ch === '!' || ch === '?') {
        continue;
      }
      if (ch === '.') {
        const prev = s[j - 1];
        if (prev && /[a-z0-9]/i.test(prev)) continue;
        cut = j + 1;
        break;
      }
    }

    if (cut === -1) {
      s = '';
      break;
    }
    s = s.slice(0, cut).trim();
  }

  if (!s) return original;
  return s;
}
