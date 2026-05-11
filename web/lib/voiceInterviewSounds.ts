/**
 * Lightweight UI chimes for voice mock interview (Web Audio API — no asset files).
 * Fails silently if audio is blocked or unsupported.
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new Ctx();
    }
    void sharedCtx.resume();
    return sharedCtx;
  } catch {
    return null;
  }
}

function beep(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  gain: number,
  type: OscillatorType = 'sine',
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Session connected — brief ascending tones before the interviewer speaks. */
export function playInterviewSessionStartSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02;
  beep(ctx, 523.25, t0, 0.14, 0.11);
  beep(ctx, 659.25, t0 + 0.11, 0.16, 0.1);
  beep(ctx, 783.99, t0 + 0.24, 0.2, 0.09);
}

/** Natural completion — soft descending phrase after closing remarks. */
export function playInterviewSessionCompleteSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02;
  beep(ctx, 783.99, t0, 0.12, 0.09);
  beep(ctx, 659.25, t0 + 0.13, 0.14, 0.08);
  beep(ctx, 523.25, t0 + 0.26, 0.22, 0.07);
}

/** User pressed end call — short “hang up” cadence. */
export function playInterviewHangUpSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02;
  beep(ctx, 400, t0, 0.08, 0.12);
  beep(ctx, 280, t0 + 0.1, 0.12, 0.1);
}
