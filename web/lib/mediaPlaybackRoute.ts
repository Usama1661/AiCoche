/**
 * Loudspeaker vs earpiece (mobile, especially iOS Safari)
 * --------------------------------------------------------
 * The web platform does **not** expose a reliable API to force the iPhone receiver vs the main
 * speaker. Routing follows the OS audio session (music / telephony / “play and record”, etc.).
 *
 * What we do here is the **best-effort stack** that still works in pure web code:
 *
 * 1. **Media Session API** — metadata + `playbackState` + no-op action handlers so the session
 *    looks like normal **media playback**, not a bare page or a telephony UI.
 * 2. **`<audio>` hints** — `playsinline` / `playsInline`, full volume, `preload`, optional
 *    `x-webkit-airplay`, `disableRemotePlayback`, and keeping the node **in the document** so
 *    WebKit treats it like real media output (important on some iOS builds).
 * 3. **Playback order on Apple WebKit** — neural MP3 is played via **`<audio>` first** when
 *    `preferEncodedAudioViaMediaElementFirst()` is true; Web Audio is used as fallback. On many
 *    iOS versions, decoded `AudioBuffer` → `AudioContext.destination` can follow the same session
 *    as Web Speech / mic more often than a standalone media element.
 * 4. **Chromium** — `setSinkId` to an output whose label looks like a built-in **speaker** and
 *    not earpiece/receiver/telephony, when permitted.
 *
 * Complement in the app: stop Web Speech / mic before assistant TTS so the session can leave
 * “play and record” where possible (`VoiceInterviewSession.speakAsInterviewer`).
 */

let mediaSessionHandlersWired = false;

/** Apple mobile / WebKit mobile: try `<audio>` MP3 playback before Web Audio for friendlier routing. */
export function preferEncodedAudioViaMediaElementFirst(): boolean {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return false;
  const ua = navigator.userAgent;
  const isAppleTouch =
    /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isWebKit = /AppleWebKit/i.test(ua) && !/Chrome|CriOS|EdgiOS|FxiOS|OPiOS/i.test(ua);
  return isAppleTouch || (isWebKit && /Mobile/i.test(ua));
}

/** Mark assistant TTS as normal media so the OS is less likely to treat it as in-call audio. */
export function prepareAssistantMediaPlayback(audio?: HTMLAudioElement | null): void {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return;
  try {
    if ('mediaSession' in navigator) {
      if (!mediaSessionHandlersWired) {
        mediaSessionHandlersWired = true;
        const noop = () => undefined;
        try {
          navigator.mediaSession.setActionHandler('play', noop);
          navigator.mediaSession.setActionHandler('pause', noop);
          navigator.mediaSession.setActionHandler('stop', noop);
        } catch {
          /* some browsers omit certain actions */
        }
      }
      const tinyPng =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'AiCoche — practice interview',
        artist: 'AiCoche',
        album: 'AI career coach',
        artwork: [{ src: tinyPng, sizes: '64x64', type: 'image/png' }],
      });
      navigator.mediaSession.playbackState = 'playing';
    }
  } catch {
    /* ignore */
  }

  if (audio) {
    applyMediaSpeakerHintsToAudioElement(audio);
  }
}

/**
 * Attributes and properties that steer mobile WebKit toward **inline / speaker-style** playback
 * (not fullscreen “video call” style). Still no hard guarantee on iOS hardware routing.
 */
export function applyMediaSpeakerHintsToAudioElement(audio: HTMLAudioElement): void {
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.setAttribute('preload', 'auto');
  try {
    audio.setAttribute('x-webkit-airplay', 'allow');
  } catch {
    /* ignore */
  }
  try {
    const m = audio as HTMLMediaElement & { disableRemotePlayback?: boolean; playsInline?: boolean };
    m.playsInline = true;
    m.disableRemotePlayback = true;
    audio.volume = 1;
    audio.muted = false;
  } catch {
    /* ignore */
  }
}

export function clearAssistantMediaPlaybackHint(): void {
  if (typeof navigator === 'undefined') return;
  try {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  } catch {
    /* ignore */
  }
}

/**
 * Chromium: pick a non-default speaker sink when available (may help avoid “communication device”).
 * Requires prior user gesture + permission in some builds; failures are ignored.
 */
export async function preferBuiltInSpeakerSinkIfSupported(audio: HTMLAudioElement): Promise<void> {
  const extended = audio as HTMLAudioElement & {
    setSinkId?: (id: string) => Promise<void>;
  };
  if (typeof extended.setSinkId !== 'function') return;
  try {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      const list = await navigator.mediaDevices.enumerateDevices();
      const outputs = list.filter((d) => d.kind === 'audiooutput');
      const label = (d: MediaDeviceInfo) => `${d.label}`.toLowerCase();
      const preferred =
        outputs.find((d) => /speaker|built[- ]?in|loud/i.test(label(d)) && !/earpiece|receiver|telephony|call/i.test(label(d))) ||
        outputs.find((d) => /speaker/i.test(label(d)) && !/earpiece|receiver/i.test(label(d))) ||
        outputs.find((d) => d.label && !/earpiece|receiver|telephony/i.test(label(d))) ||
        null;
      if (preferred?.deviceId) {
        await extended.setSinkId(preferred.deviceId);
      }
    }
  } catch {
    /* ignore — permission, policy, or unsupported */
  }
}
