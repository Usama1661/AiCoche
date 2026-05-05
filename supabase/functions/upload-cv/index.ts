import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { CV_BUCKET, extractCvText, storagePathFor, validateCvFile } from '../_shared/files.ts';
import { isResponse, requireAuth } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { supabase, user } = await requireAuth(req);
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return jsonResponse({ error: 'file is required as multipart/form-data' }, 400);
    }

    const validationError = validateCvFile(file.name, file.type, file.size);
    if (validationError) return jsonResponse({ error: validationError }, 400);

    const storagePath = storagePathFor(user.id, file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(CV_BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    let extractedText = '';
    let status = 'uploaded';
    let errorMessage: string | null = null;

    try {
      extractedText = await extractCvText(file);
      status = extractedText ? 'processing' : 'uploaded';
    } catch (error) {
      status = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Text extraction failed';
    }

    const { data, error: insertError } = await supabase
      .from('cv_documents')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_bucket: CV_BUCKET,
        storage_path: storagePath,
        extracted_text: extractedText || null,
        status,
        error_message: errorMessage,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    return jsonResponse({
      cvDocument: data,
      extractedText,
      nextStep: extractedText ? 'Call analyze-cv with cvDocumentId.' : 'Configure CV_TEXT_EXTRACTOR_URL, then call analyze-cv after extraction.',
    });
  } catch (error) {
    if (isResponse(error)) return error;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error(error);
    return jsonResponse({ error: message }, 500);
  }
});
