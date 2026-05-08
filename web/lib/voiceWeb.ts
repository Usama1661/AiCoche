/**
 * Voice mock interview: optional OpenAI neural TTS (natural, ChatGPT-style) via edge function,
 * with browser speechSynthesis fallback (best available English voice).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Minimal typings — TS `dom` lib may omit experimental SpeechRecognition. */
type WebSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: WebSpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type WebSpeechRecognitionResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0?: { transcript?: string };
    };
  };
};

type WebSpeechRecognitionErrorEvent = {
  error: string;
};

let neuralAudio: HTMLAudioElement | null = null;
let neuralObjectUrl: string | null = null;

/** Neuron / browser speech “generation” — bump to invalidate in-flight playback (interrupt). */
let speakGen = 0;

/** Resolves the in-flight `playMp3Base64` promise when audio is stopped early (mic / user cancel). */
let pendingNeuralComplete: (() => void) | null = null;

function neuralCleanup(): void {
  if (typeof window === 'undefined') return;
  if (neuralAudio) {
    neuralAudio.pause();
    neuralAudio.onended = null;
    neuralAudio.onerror = null;
    neuralAudio.removeAttribute('src');
    neuralAudio.load();
    neuralAudio = null;
  }
  if (neuralObjectUrl) {
    URL.revokeObjectURL(neuralObjectUrl);
    neuralObjectUrl = null;
  }
}

function cancelNeuralSpeech(): void {
  if (typeof window === 'undefined') return;
  if (pendingNeuralComplete) {
    const finish = pendingNeuralComplete;
    pendingNeuralComplete = null;
    finish();
  }
  neuralCleanup();
}

/** Stop neural + browser speech without bumping generation (start of a new utterance chain handles gen). */
function flushSpeechPlayback(): void {
  cancelNeuralSpeech();
  if (typeof window !== 'undefined') window.speechSynthesis.cancel();
}

if (typeof window !== 'undefined') {
  const primeVoices = () => window.speechSynthesis.getVoices();
  primeVoices();
  window.speechSynthesis.onvoiceschanged = primeVoices;
}

function scoreBrowserVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase();
  const name = `${v.name} ${(v as SpeechSynthesisVoice & { voiceURI?: string }).voiceURI ?? ''}`.toLowerCase();
  let s = 0;
  if (lang.startsWith('en-us')) s += 4;
  else if (lang.startsWith('en')) s += 2;
  if (name.includes('neural') || name.includes('natural')) s += 8;
  if (name.includes('premium') || name.includes('enhanced')) s += 5;
  if (name.includes('google')) s += 3;
  if (name.includes('microsoft')) s += 2;
  if (name.includes('siri') || name.includes('samantha') || name.includes('daniel')) s += 2;
  return s;
}

function pickBestEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const sc = scoreBrowserVoice(v);
    if (sc > bestScore) {
      bestScore = sc;
      best = v;
    }
  }
  if (best && bestScore > 0) return best;
  return voices.find((x) => x.lang.toLowerCase().startsWith('en')) ?? null;
}

export function browserSupportsSpeechRecognition(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}

export function cancelAllSpeech(): void {
  if (typeof window === 'undefined') return;
  speakGen += 1;
  flushSpeechPlayback();
}

function playMp3Base64(b64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    cancelNeuralSpeech();
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    neuralObjectUrl = url;
    const audio = new Audio();
    neuralAudio = audio;
    audio.src = url;

    let settled = false;
    const complete = () => {
      if (settled) return;
      settled = true;
      pendingNeuralComplete = null;
      neuralCleanup();
      resolve();
    };

    pendingNeuralComplete = complete;
    audio.onended = complete;
    audio.onerror = () => {
      settled = true;
      pendingNeuralComplete = null;
      neuralCleanup();
      reject(new Error('Audio playback failed'));
    };
    void audio.play().catch((err) => {
      settled = true;
      pendingNeuralComplete = null;
      neuralCleanup();
      reject(err instanceof Error ? err : new Error('Could not play audio'));
    });
  });
}

export type SequentialSpeakOptions = {
  /** Pause between spoken segments (e.g. after feedback, before next question). Default ~800ms for neural. */
  pauseBetweenMs?: number;
};

async function pauseInterruptible(myGen: number, ms: number): Promise<void> {
  const step = 90;
  let left = ms;
  while (left > 0) {
    if (speakGen !== myGen) return;
    const chunk = Math.min(step, left);
    await new Promise<void>((r) => window.setTimeout(r, chunk));
    left -= chunk;
  }
}

/**
 * OpenAI neural TTS via `interview-tts` edge function (natural, interviewer-like).
 * Falls back to `speakSequential` if the function fails or returns no audio.
 */
export async function speakSequentialHumanLike(
  supabase: SupabaseClient,
  texts: string[],
  onComplete?: () => void,
  opts?: SequentialSpeakOptions
): Promise<void> {
  const cleaned = texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!cleaned.length) {
    onComplete?.();
    return;
  }
  const pauseBetweenMs = opts?.pauseBetweenMs ?? 820;
  speakGen += 1;
  const myGen = speakGen;
  flushSpeechPlayback();

  for (let i = 0; i < cleaned.length; i += 1) {
    if (speakGen !== myGen) {
      onComplete?.();
      return;
    }
    const { data, error } = await supabase.functions.invoke<{
      audioBase64?: string;
    }>('interview-tts', { body: { text: cleaned[i] } });
    if (error || !data?.audioBase64) {
      await speakSequentialAsync(cleaned.slice(i), myGen, pauseBetweenMs);
      onComplete?.();
      return;
    }
    try {
      await playMp3Base64(data.audioBase64);
    } catch {
      await speakSequentialAsync(cleaned.slice(i), myGen, pauseBetweenMs);
      onComplete?.();
      return;
    }
    if (speakGen !== myGen) {
      onComplete?.();
      return;
    }
    if (i < cleaned.length - 1 && pauseBetweenMs > 0) {
      await pauseInterruptible(myGen, pauseBetweenMs);
    }
  }
  onComplete?.();
}

/** Browser-only TTS (robotic vs neural API); uses best available English voice when possible. */
export function speakSequential(texts: string[], onComplete?: () => void, opts?: SequentialSpeakOptions): void {
  speakGen += 1;
  const myGen = speakGen;
  flushSpeechPlayback();
  speakSequentialSync(texts, onComplete, myGen, opts?.pauseBetweenMs ?? 0);
}

function speakSequentialSync(
  texts: string[],
  onComplete: (() => void) | undefined,
  myGen: number,
  pauseBetweenMs: number
): void {
  if (typeof window === 'undefined') return;
  const cleaned = texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!cleaned.length) {
    onComplete?.();
    return;
  }
  let index = 0;
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    window.clearInterval(pollId);
    onComplete?.();
  };

  const pollId = window.setInterval(() => {
    if (speakGen !== myGen) {
      window.speechSynthesis.cancel();
      done();
    }
  }, 140);

  function scheduleNextUtterance() {
    if (speakGen !== myGen) {
      done();
      return;
    }
    if (index >= cleaned.length) {
      done();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(cleaned[index]);
    utterance.lang = 'en-US';
    utterance.rate = 0.96;
    utterance.pitch = 1;
    const voice = pickBestEnglishVoice();
    if (voice) utterance.voice = voice;

    const advance = () => {
      index += 1;
      if (index >= cleaned.length) {
        done();
        return;
      }
      const gap = pauseBetweenMs > 0 ? pauseBetweenMs : 0;
      window.setTimeout(() => {
        if (speakGen !== myGen) {
          done();
          return;
        }
        scheduleNextUtterance();
      }, gap);
    };

    utterance.onend = advance;
    utterance.onerror = advance;
    window.speechSynthesis.speak(utterance);
  }

  scheduleNextUtterance();
}

function speakSequentialAsync(texts: string[], myGen: number, pauseBetweenMs: number): Promise<void> {
  return new Promise((resolve) => {
    speakSequentialSync(texts, resolve, myGen, pauseBetweenMs);
  });
}

export type RecognitionCallbacks = {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

/** Start continuous dictation; returns stop function. */
export function startSpeechRecognition(lang: string, callbacks: RecognitionCallbacks): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const Root = window as unknown as {
    SpeechRecognition?: new () => WebSpeechRecognition;
    webkitSpeechRecognition?: new () => WebSpeechRecognition;
  };
  const Ctor = Root.SpeechRecognition ?? Root.webkitSpeechRecognition;
  if (!Ctor) {
    callbacks.onError?.('Speech recognition is not available in this browser.');
    return () => undefined;
  }

  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: WebSpeechRecognitionResultEvent) => {
    let interim = '';
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0]?.transcript ?? '';
      if (event.results[i].isFinal) finalText += piece;
      else interim += piece;
    }
    const combined = (finalText + interim).trim();
    if (combined) callbacks.onInterim?.(combined);
    if (finalText.trim()) callbacks.onFinal?.(finalText.trim());
  };

  recognition.onerror = (event: WebSpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    callbacks.onError?.(event.error || 'recognition error');
  };

  recognition.onend = () => {
    callbacks.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    callbacks.onError?.('Could not start microphone.');
  }

  return () => {
    try {
      recognition.stop();
    } catch {
      /* ignore */
    }
    try {
      recognition.abort();
    } catch {
      /* ignore */
    }
  };
}
