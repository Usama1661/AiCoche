import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { synthesizeSpeechMp3 } from '../_shared/openai.ts';
import { isResponse, readJson, requireAuth } from '../_shared/supabase.ts';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    await requireAuth(req);
    const { text } = await readJson<{ text?: string }>(req);
    const trimmed = (text ?? '').trim();
    if (!trimmed) {
      return jsonResponse({ error: 'text is required' }, 400);
    }
    if (trimmed.length > 4096) {
      return jsonResponse({ error: 'text too long (max 4096 characters)' }, 400);
    }

    const mp3 = await synthesizeSpeechMp3(trimmed);
    if (!mp3?.length) {
      return jsonResponse({ error: 'Speech synthesis unavailable' }, 503);
    }

    return jsonResponse({
      format: 'mp3',
      audioBase64: bytesToBase64(mp3),
    });
  } catch (e) {
    if (isResponse(e)) return e;
    console.error(e);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
