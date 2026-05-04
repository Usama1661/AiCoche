import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { chatCompletionJson } from '../_shared/openai.ts';

type UserProfile = {
  professionLabel?: string;
  displayName?: string;
  experience?: string;
  goal?: string;
  language?: string;
};

type AnalyzeBody = {
  cvText: string;
  userProfile: UserProfile;
};

function fallbackAnalysis(profile: UserProfile, cvText: string) {
  const role = profile.professionLabel ?? 'professional';
  return {
    strengths: [
      `Positioning as a ${role}`,
      cvText.length > 200 ? 'Substantive content to refine' : 'Compact profile to build on',
    ],
    weaknesses: [
      'Add more quantified outcomes (%, $, time saved).',
      'Tighten alignment between skills and target role.',
    ],
    missingSkills: ['Role-specific keywords', 'Impact metrics', 'Tooling evidence'],
    suggestions: [
      'Use 2–3 achievement bullets per role with metrics.',
      'Mirror phrasing from job descriptions in your field.',
      'Keep to one page unless you are very senior.',
    ],
    overallScore: 72,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await req.json()) as AnalyzeBody;
    const cvText = (body.cvText ?? '').trim();
    const userProfile = body.userProfile ?? {};

    if (!cvText) {
      return jsonResponse({ error: 'cvText is required' }, 400);
    }

    const system = `You are a career coach. Respond ONLY with valid JSON (no markdown) with this exact shape:
{
  "strengths": string[],
  "weaknesses": string[],
  "missingSkills": string[],
  "suggestions": string[],
  "overallScore": number
}
Rules: 3-5 items per array where appropriate. overallScore is 0-100. Tailor to the user's profession and language.`;

    const user = `User profession context: ${JSON.stringify(userProfile)}

CV text:
---
${cvText.slice(0, 24_000)}
---`;

    const raw = await chatCompletionJson(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.3 }
    );

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const result = {
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
          missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          overallScore:
            typeof parsed.overallScore === 'number' ? parsed.overallScore : 70,
        };
        return jsonResponse(result);
      } catch {
        // fall through
      }
    }

    return jsonResponse(fallbackAnalysis(userProfile, cvText));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return jsonResponse({ error: message }, 500);
  }
});
