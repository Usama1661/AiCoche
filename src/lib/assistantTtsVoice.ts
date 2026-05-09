/** Ids sent to the `interview-tts` edge function (must match server allowlist). */
export const ASSISTANT_TTS_VOICE_IDS = [
  'cedar',
  'marin',
  'onyx',
  'ash',
  'sage',
  'echo',
  'fable',
  'alloy',
  'nova',
  'shimmer',
] as const;

export type AssistantTtsVoiceId = (typeof ASSISTANT_TTS_VOICE_IDS)[number];

export type AssistantVoiceGender = 'Male' | 'Female' | 'Neutral';

export const DEFAULT_ASSISTANT_TTS_VOICE: AssistantTtsVoiceId = 'cedar';

const VOICE_PREVIEW_BY_ID: Record<AssistantTtsVoiceId, string> = {
  cedar:
    "Hi — I'm Liam, your practice interviewer. I'll keep a low, steady baritone and speak clearly so you can focus on your answers.",
  marin:
    "Hi — I'm James. Calm boardroom energy: direct questions, unhurried pace, and a deeper voice for a senior-style mock interview.",
  onyx:
    "Hi — I'm Victor. You'll get a weighty, confident delivery while we walk through behavioral and role-fit prompts.",
  ash:
    "Hi — I'm Dean. Composed and lower in the chest — steady feedback without a bright or chipper edge.",
  sage:
    "Hi — I'm Alex. Even and measured, easy to follow when we stack several questions in one session.",
  echo:
    "Hi — I'm Chris. Clear and matter-of-fact, mid-register delivery so you can judge if this pace works for you.",
  fable:
    "Hi — I'm Morgan. A bit more expressive and story-like — useful when you want richer delivery in practice.",
  alloy:
    "Hi — I'm Riley. Even and versatile — neutral delivery so the focus stays on what you say.",
  nova:
    "Hi — I'm Nora — warm and conversational. This is how I'll sound when we run your voice mock interview.",
  shimmer:
    "Hi — I'm Zoe — brighter and upbeat. This energy is what you'll hear for questions and encouragement.",
};

export function assistantVoicePreviewText(voice: AssistantTtsVoiceId): string {
  return VOICE_PREVIEW_BY_ID[voice];
}

export const ASSISTANT_VOICE_PREVIEW_TEXT = assistantVoicePreviewText(DEFAULT_ASSISTANT_TTS_VOICE);

export const ASSISTANT_TTS_VOICE_OPTIONS: {
  id: AssistantTtsVoiceId;
  assistantName: string;
  gender: AssistantVoiceGender;
  toneType: string;
}[] = [
  { id: 'cedar', assistantName: 'Liam', gender: 'Male', toneType: 'Deep baritone' },
  { id: 'marin', assistantName: 'James', gender: 'Male', toneType: 'Steady low register' },
  { id: 'onyx', assistantName: 'Victor', gender: 'Male', toneType: 'Bold, weighted low tone' },
  { id: 'ash', assistantName: 'Dean', gender: 'Male', toneType: 'Composed mid-low' },
  { id: 'sage', assistantName: 'Alex', gender: 'Neutral', toneType: 'Calm, measured' },
  { id: 'echo', assistantName: 'Chris', gender: 'Neutral', toneType: 'Clear, steady mid-tone' },
  { id: 'fable', assistantName: 'Morgan', gender: 'Neutral', toneType: 'Expressive, storytelling' },
  { id: 'alloy', assistantName: 'Riley', gender: 'Neutral', toneType: 'Even, versatile' },
  { id: 'nova', assistantName: 'Nora', gender: 'Female', toneType: 'Warm, conversational' },
  { id: 'shimmer', assistantName: 'Zoe', gender: 'Female', toneType: 'Bright, upbeat' },
];

export function normalizeAssistantTtsVoice(raw: string | null | undefined): AssistantTtsVoiceId {
  const s = (raw ?? '').trim().toLowerCase();
  return (ASSISTANT_TTS_VOICE_IDS as readonly string[]).includes(s) ? (s as AssistantTtsVoiceId) : DEFAULT_ASSISTANT_TTS_VOICE;
}
