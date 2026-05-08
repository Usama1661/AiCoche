type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

/** OpenAI TTS — natural speech (ChatGPT-quality family). Returns MP3 bytes or null if unavailable. */
export async function synthesizeSpeechMp3(text: string): Promise<Uint8Array | null> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return null;

  const input = text.trim().slice(0, 4096);
  if (!input) return null;

  const voice = Deno.env.get('OPENAI_TTS_VOICE') ?? 'nova';
  const model = Deno.env.get('OPENAI_TTS_MODEL') ?? 'tts-1-hd';
  const speed = Number(Deno.env.get('OPENAI_TTS_SPEED') ?? '0.92');
  const clampedSpeed = Number.isFinite(speed) ? Math.min(1.15, Math.max(0.85, speed)) : 0.92;

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input,
      voice,
      speed: clampedSpeed,
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('OpenAI TTS error', res.status, errText);
    return null;
  }

  return new Uint8Array(await res.arrayBuffer());
}

export async function chatCompletionJson(
  messages: ChatMsg[],
  opts?: { temperature?: number }
): Promise<string | null> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return null;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      messages,
      temperature: opts?.temperature ?? 0.35,
      response_format: { type: 'json_object' },
    }),
  });

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
