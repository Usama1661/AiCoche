import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { analyzeCvWithAi } from '../_shared/ai.ts';
import { saveAnalysisAndAutofill } from '../_shared/profile.ts';
import { isResponse, readJson, requireAuth } from '../_shared/supabase.ts';

type UserProfile = {
  professionLabel?: string;
  displayName?: string;
  experience?: string;
  goal?: string;
  language?: string;
};

type AnalyzeBody = {
  cvDocumentId?: string;
  cvText?: string;
  userProfile?: UserProfile;
  targetRole?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { supabase, user } = await requireAuth(req);
    const body = await readJson<AnalyzeBody>(req);
    let cvText = (body.cvText ?? '').trim();
    let cvDocumentId = body.cvDocumentId ?? null;
    const userProfile = body.userProfile ?? {};

    if (cvDocumentId) {
      const { data: doc, error } = await supabase
        .from('cv_documents')
        .select('id, extracted_text, user_id')
        .eq('id', cvDocumentId)
        .eq('user_id', user.id)
        .single();

      if (error || !doc) return jsonResponse({ error: 'CV document not found' }, 404);
      cvText = (doc.extracted_text ?? cvText).trim();
    }

    if (!cvText) {
      return jsonResponse({ error: 'cvText or a cvDocumentId with extracted_text is required' }, 400);
    }

    const analysis = await analyzeCvWithAi(
      cvText,
      body.targetRole ?? userProfile.professionLabel
    );

    let saved = null;
    if (!cvDocumentId) {
      const { data: doc, error } = await supabase
        .from('cv_documents')
        .insert({
          user_id: user.id,
          file_name: 'manual-cv-text.txt',
          file_type: 'text/plain',
          file_size: cvText.length,
          storage_path: `${user.id}/manual-${crypto.randomUUID()}.txt`,
          extracted_text: cvText,
          status: 'processing',
        })
        .select('id')
        .single();
      if (error) throw error;
      cvDocumentId = doc.id;
    }

    saved = await saveAnalysisAndAutofill({
      supabase,
      userId: user.id,
      cvDocumentId,
      analysis,
    });

    await supabase
      .from('cv_documents')
      .update({ status: 'analyzed', extracted_text: cvText, error_message: null })
      .eq('id', cvDocumentId)
      .eq('user_id', user.id);

    return jsonResponse({
      ...analysis,
      missingSkills: analysis.recommendedSkills,
      suggestions: analysis.improvementSuggestions,
      overallScore: analysis.cvScore,
      cvDocumentId,
      analysisResultId: saved.id,
    });
  } catch (error) {
    if (isResponse(error)) return error;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error(error);
    return jsonResponse({ error: message }, 500);
  }
});
