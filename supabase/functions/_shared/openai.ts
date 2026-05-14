type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

/** `tts-1` / `tts-1-hd` built-in voices (OpenAI docs). */
const VOICES_TTS1 = new Set(['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer']);

/** Voices that only exist on `gpt-4o-mini-tts` (13-voice set minus `VOICES_TTS1`). */
const VOICES_GPT4O_MINI_ONLY = new Set(['ballad', 'cedar', 'marin', 'verse']);

const ALLOWED_TTS_VOICES = new Set([...VOICES_TTS1, ...VOICES_GPT4O_MINI_ONLY]);

/** When using `gpt-4o-mini-tts`, add instructions for a deeper male-presenting coach read. */
const VOICES_DEEP_MALE_COACH = new Set(['cedar', 'marin', 'onyx', 'ash']);

const DEFAULT_DEEP_MALE_INSTRUCTIONS =
  'Speak with a deep adult male baritone. Sound like an experienced hiring manager: calm, authoritative, warm but professional, clear articulation, American English.';

const GPT4O_MINI_TTS_MODEL = 'gpt-4o-mini-tts';

function resolveTtsVoice(requested: string | undefined): string {
  const r = (requested ?? '').trim().toLowerCase();
  if (ALLOWED_TTS_VOICES.has(r)) return r;
  const fromEnv = (Deno.env.get('OPENAI_TTS_VOICE') ?? 'nova').trim().toLowerCase();
  return ALLOWED_TTS_VOICES.has(fromEnv) ? fromEnv : 'nova';
}

function resolveSpeechModel(voice: string): string {
  if (VOICES_GPT4O_MINI_ONLY.has(voice)) return GPT4O_MINI_TTS_MODEL;
  const disableDeepMini = Deno.env.get('OPENAI_TTS_DISABLE_DEEP_MINI')?.trim() === '1';
  /** Stronger baritone + `instructions` only exist on `gpt-4o-mini-tts`; upgrade these presets from `tts-1-hd`. */
  if (!disableDeepMini && VOICES_DEEP_MALE_COACH.has(voice)) return GPT4O_MINI_TTS_MODEL;
  const env = (Deno.env.get('OPENAI_TTS_MODEL') ?? 'tts-1-hd').trim();
  if (env === GPT4O_MINI_TTS_MODEL || env.startsWith('gpt-4o-mini-tts')) return GPT4O_MINI_TTS_MODEL;
  return env.startsWith('tts-') ? env : 'tts-1-hd';
}

function buildSpeechPayload(input: string, voice: string, model: string): Record<string, unknown> {
  if (model === GPT4O_MINI_TTS_MODEL) {
    const payload: Record<string, unknown> = {
      model: GPT4O_MINI_TTS_MODEL,
      input,
      voice,
      response_format: 'mp3',
    };
    const disableDeep = (Deno.env.get('OPENAI_TTS_DEEP_INSTRUCTIONS') ?? '1').trim() === '0';
    if (!disableDeep && VOICES_DEEP_MALE_COACH.has(voice)) {
      const custom = Deno.env.get('OPENAI_TTS_INSTRUCTIONS_DEEP')?.trim();
      payload.instructions = custom && custom.length > 0 ? custom : DEFAULT_DEEP_MALE_INSTRUCTIONS;
    } else {
      const general = Deno.env.get('OPENAI_TTS_INSTRUCTIONS')?.trim();
      if (general && general.length > 0) payload.instructions = general;
    }
    return payload;
  }

  const speed = Number(Deno.env.get('OPENAI_TTS_SPEED') ?? '0.92');
  const clampedSpeed = Number.isFinite(speed) ? Math.min(1.15, Math.max(0.85, speed)) : 0.92;
  return {
    model,
    input,
    voice,
    speed: clampedSpeed,
    response_format: 'mp3',
  };
}

/** OpenAI TTS — `tts-1-hd` or `gpt-4o-mini-tts` (latter for cedar/marin + optional deep-male instructions). */
export async function synthesizeSpeechMp3(text: string, voiceOverride?: string): Promise<Uint8Array | null> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return null;

  const input = text.trim().slice(0, 4096);
  if (!input) return null;

  const voice = resolveTtsVoice(voiceOverride);
  let model = resolveSpeechModel(voice);
  let body = buildSpeechPayload(input, voice, model);

  let res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  /** `onyx` / `ash` can fall back to `tts-1-hd` if the account rejects `gpt-4o-mini-tts`. Cedar/Marin cannot. */
  if (!res.ok && model === GPT4O_MINI_TTS_MODEL && (voice === 'onyx' || voice === 'ash')) {
    const errText = await res.text();
    console.warn('OpenAI mini TTS failed; falling back to tts-1-hd for voice', voice, res.status, errText);
    model = 'tts-1-hd';
    body = buildSpeechPayload(input, voice, model);
    res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error('OpenAI TTS error', res.status, errText);
    return null;
  }

  return new Uint8Array(await res.arrayBuffer());
}

const DEFAULT_CHAT_TIMEOUT_MS = 55_000;

async function postChatCompletions(body: Record<string, unknown>, timeoutMs: number): Promise<Response | null> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      console.error('OpenAI chat timeout', timeoutMs);
    } else {
      console.error('OpenAI chat fetch error', e);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function chatCompletionJson(
  messages: ChatMsg[],
  opts?: { temperature?: number; maxOutputTokens?: number; timeoutMs?: number; retryOnceOnHttpError?: boolean }
): Promise<string | null> {
  const body: Record<string, unknown> = {
    model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
    messages,
    temperature: opts?.temperature ?? 0.35,
    response_format: { type: 'json_object' },
  };
  if (opts?.maxOutputTokens != null) {
    body.max_tokens = opts.maxOutputTokens;
  }

  const timeoutMs = opts?.timeoutMs ?? DEFAULT_CHAT_TIMEOUT_MS;

  const run = async () => postChatCompletions(body, timeoutMs);
  let res = await run();
  if (
    opts?.retryOnceOnHttpError &&
    res &&
    !res.ok &&
    (res.status >= 500 || res.status === 429)
  ) {
    await new Promise((r) => setTimeout(r, 400));
    res = await run();
  }

  if (!res) return null;

  if (!res.ok) {
    const errText = await res.text();
    console.error('OpenAI error', res.status, errText);
    return null;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? null;
}

/** Plain chat completion with `stream: true` — yields UTF-8 text deltas from the assistant. */
export async function* chatCompletionTextStream(
  messages: ChatMsg[],
  opts?: { temperature?: number; timeoutMs?: number }
): AsyncGenerator<string, void, unknown> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return;

  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_CHAT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
        messages,
        temperature: opts?.temperature ?? 0.4,
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === 'AbortError') {
      console.error('OpenAI stream timeout', timeoutMs);
    } else {
      console.error('OpenAI stream fetch error', e);
    }
    return;
  }
  clearTimeout(timer);

  if (!res.ok || !res.body) {
    const errText = await res.text();
    console.error('OpenAI stream error', res.status, errText);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });
      const lines = carry.split('\n');
      carry = lines.pop() ?? '';
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          const j = JSON.parse(data) as {
            choices?: { delta?: { content?: string | null } }[];
          };
          const c = j.choices?.[0]?.delta?.content;
          if (typeof c === 'string' && c.length) yield c;
        } catch {
          /* ignore partial JSON lines */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
