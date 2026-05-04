type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

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
