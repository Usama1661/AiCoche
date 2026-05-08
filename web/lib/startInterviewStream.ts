/**
 * SSE from `start-interview-stream` — streams the first interview question, then returns session id.
 */

export type StartInterviewStreamResult = {
  sessionId: string;
  question: string;
};

type SsePayload =
  | { t: 'd'; c: string }
  | { t: 'ready'; sessionId: string; question: string }
  | { t: 'done'; sessionId: string; question: string }
  | { t: 'error'; message: string };

export async function consumeStartInterviewStream(options: {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
  profile: Record<string, unknown>;
  metrics: Record<string, unknown> | null;
  onDelta: (chunk: string) => void;
  /** After the session row is created — use to begin TTS or finalize UI before `done`. */
  onSpeakReady?: (payload: { sessionId: string; question: string }) => void;
}): Promise<StartInterviewStreamResult> {
  const base = options.supabaseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/functions/v1/start-interview-stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      apikey: options.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profile: options.profile, metrics: options.metrics }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Start stream failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';
  let result: StartInterviewStreamResult | null = null;

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
          throw new Error(payload.message || 'Start interview stream error');
        } else if (payload.t === 'ready') {
          options.onSpeakReady?.({ sessionId: payload.sessionId, question: payload.question });
        } else if (payload.t === 'done') {
          result = { sessionId: payload.sessionId, question: payload.question };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!result) {
    throw new Error('Start interview stream ended without a result');
  }
  return result;
}
