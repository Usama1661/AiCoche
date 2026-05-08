/**
 * Server-Sent Events from `continue-interview-stream` (OpenAI token stream → client).
 * Uses fetch + manual parsing (EventSource is GET-only).
 */

export type ContinueInterviewStreamResult = {
  feedback: string;
  nextQuestion: string | null;
  score: number;
  finished: boolean;
};

export type SpeakReadyPayload = {
  feedback: string;
  nextQuestion: string | null;
  finished: boolean;
};

type SsePayload =
  | { t: 'd'; c: string }
  | { t: 'ready'; feedback: string; nextQuestion: string | null; finished: boolean }
  | { t: 'done'; feedback: string; nextQuestion: string | null; score: number; finished: boolean }
  | { t: 'error'; message: string };

export async function consumeContinueInterviewStream(options: {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
  sessionId: string;
  answer: string;
  onDelta: (chunk: string) => void;
  /** Fired after the model stream is parsed and the session row is saved — before scoring returns. */
  onSpeakReady?: (payload: SpeakReadyPayload) => void;
}): Promise<ContinueInterviewStreamResult> {
  const base = options.supabaseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/functions/v1/continue-interview-stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      apikey: options.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId: options.sessionId, answer: options.answer }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Stream request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';
  let donePayload: ContinueInterviewStreamResult | null = null;

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = carry.indexOf('\n\n');
        if (sep === -1) break;
        const block = carry.slice(0, sep);
        carry = carry.slice(sep + 2);
        const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
        if (!dataLine) continue;
        const jsonStr = dataLine.replace(/^data:\s?/, '').trim();
        if (!jsonStr) continue;
        let payload: SsePayload;
        try {
          payload = JSON.parse(jsonStr) as SsePayload;
        } catch {
          continue;
        }
        if (payload.t === 'd' && payload.c) {
          options.onDelta(payload.c);
        } else if (payload.t === 'error') {
          throw new Error(payload.message || 'Interview stream error');
        } else if (payload.t === 'ready') {
          options.onSpeakReady?.({
            feedback: payload.feedback,
            nextQuestion: payload.nextQuestion,
            finished: payload.finished,
          });
        } else if (payload.t === 'done') {
          donePayload = {
            feedback: payload.feedback,
            nextQuestion: payload.nextQuestion,
            score: payload.score,
            finished: payload.finished,
          };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!donePayload) {
    throw new Error('Interview stream ended without a result');
  }
  return donePayload;
}
