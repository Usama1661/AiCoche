import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { analyzeCvWithAi } from '../_shared/ai.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { saveAnalysisAndAutofill } from '../_shared/profile.ts';
import { isResponse, readJson, requireAuth } from '../_shared/supabase.ts';

type Body = {
  cvDocumentId?: string;
  cvText?: string;
  targetRole?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { supabase, user } = await requireAuth(req);
    const body = await readJson<Body>(req);
    let cvText = (body.cvText ?? '').trim();
    let cvDocumentId = body.cvDocumentId ?? null;

    if (cvDocumentId) {
      const { data, error } = await supabase
        .from('cv_documents')
        .select('id, extracted_text')
        .eq('id', cvDocumentId)
        .eq('user_id', user.id)
        .single();
      if (error || !data) return jsonResponse({ error: 'CV document not found' }, 404);
      cvText = (data.extracted_text ?? cvText).trim();
    }

    if (!cvText) return jsonResponse({ error: 'cvText or cvDocumentId is required' }, 400);

    if (!cvDocumentId) {
      const { data, error } = await supabase
        .from('cv_documents')
        .insert({
          user_id: user.id,
          file_name: 'manual-profile-import.txt',
          file_type: 'text/plain',
          file_size: cvText.length,
          storage_path: `${user.id}/manual-profile-${crypto.randomUUID()}.txt`,
          extracted_text: cvText,
          status: 'processing',
        })
        .select('id')
        .single();
      if (error) throw error;
      cvDocumentId = data.id;
    }

    const analysis = await analyzeCvWithAi(cvText, body.targetRole);
    const analysisResult = await saveAnalysisAndAutofill({
      supabase,
      userId: user.id,
      cvDocumentId,
      analysis,
    });

    await supabase.from('cv_documents').update({ status: 'analyzed' }).eq('id', cvDocumentId);

    return jsonResponse({
      profile: {
        fullName: analysis.fullName,
        headline: analysis.currentRole,
        summary: analysis.summary,
        currentRole: analysis.currentRole,
      },
      analysisResult,
    });
  } catch (error) {
    if (isResponse(error)) return error;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error(error);
    return jsonResponse({ error: message }, 500);
  }
});
