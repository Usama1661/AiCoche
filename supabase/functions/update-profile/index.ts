import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { loadFullProfile } from '../_shared/profile.ts';
import { isResponse, readJson, requireAuth } from '../_shared/supabase.ts';

type Body = {
  profile?: Record<string, unknown>;
  workExperiences?: Record<string, unknown>[];
  educations?: Record<string, unknown>[];
  skills?: Record<string, unknown>[];
  certifications?: Record<string, unknown>[];
  projects?: Record<string, unknown>[];
};

function array(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'PATCH') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { supabase, user } = await requireAuth(req);
    const body = await readJson<Body>(req);

    if (body.profile) {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: body.profile.fullName ?? body.profile.full_name ?? null,
        email: body.profile.email ?? user.email ?? null,
        phone: body.profile.phone ?? null,
        headline: body.profile.headline ?? null,
        current_designation:
          body.profile.currentDesignation ??
          body.profile.current_designation ??
          body.profile.currentRole ??
          null,
        current_company: body.profile.currentCompany ?? body.profile.current_company ?? null,
        employment_status: body.profile.employmentStatus ?? body.profile.employment_status ?? null,
        summary: body.profile.summary ?? null,
      });
      if (error) throw error;
    }

    if (body.workExperiences) {
      await supabase.from('work_experiences').delete().eq('user_id', user.id).is('source_cv_document_id', null);
      const rows = array(body.workExperiences).map((item) => ({
        user_id: user.id,
        company_name: item.companyName ?? item.company_name ?? item.company ?? 'Company',
        job_title: item.jobTitle ?? item.job_title ?? item.title ?? 'Role',
        start_date: item.startDate ?? item.start_date ?? null,
        end_date: item.endDate ?? item.end_date ?? null,
        is_current: Boolean(item.isCurrent ?? item.is_current),
        responsibilities: item.responsibilities ?? [],
        achievements: item.achievements ?? [],
        skills_used: item.skillsUsed ?? item.skills_used ?? item.skills ?? [],
      }));
      if (rows.length) {
        const { error } = await supabase.from('work_experiences').insert(rows);
        if (error) throw error;
      }
    }

    if (body.educations) {
      await supabase.from('educations').delete().eq('user_id', user.id).is('source_cv_document_id', null);
      const rows = array(body.educations).map((item) => ({
        user_id: user.id,
        institution: item.institution ?? 'Institution',
        degree: item.degree ?? null,
        field_of_study: item.fieldOfStudy ?? item.field_of_study ?? null,
        start_date: item.startDate ?? item.start_date ?? null,
        end_date: item.endDate ?? item.end_date ?? null,
        description: item.description ?? null,
      }));
      if (rows.length) {
        const { error } = await supabase.from('educations').insert(rows);
        if (error) throw error;
      }
    }

    if (body.skills) {
      await supabase.from('skills').delete().eq('user_id', user.id).is('source_cv_document_id', null);
      const rows = array(body.skills).map((item) => ({
        user_id: user.id,
        name: item.name ?? 'Skill',
        category: item.category ?? 'technical',
        proficiency: item.proficiency ?? null,
      }));
      if (rows.length) {
        const { error } = await supabase.from('skills').insert(rows);
        if (error) throw error;
      }
    }

    if (body.certifications) {
      await supabase.from('certifications').delete().eq('user_id', user.id).is('source_cv_document_id', null);
      const rows = array(body.certifications).map((item) => ({
        user_id: user.id,
        name: item.name ?? 'Certification',
        issuer: item.issuer ?? null,
        issued_at: item.issuedAt ?? item.issued_at ?? item.date ?? null,
        expires_at: item.expiresAt ?? item.expires_at ?? null,
        credential_url: item.credentialUrl ?? item.credential_url ?? null,
      }));
      if (rows.length) {
        const { error } = await supabase.from('certifications').insert(rows);
        if (error) throw error;
      }
    }

    if (body.projects) {
      await supabase.from('projects').delete().eq('user_id', user.id).is('source_cv_document_id', null);
      const rows = array(body.projects).map((item) => ({
        user_id: user.id,
        name: item.name ?? 'Project',
        description: item.description ?? null,
        role: item.role ?? null,
        technologies: item.technologies ?? [],
        url: item.url ?? null,
      }));
      if (rows.length) {
        const { error } = await supabase.from('projects').insert(rows);
        if (error) throw error;
      }
    }

    return jsonResponse(await loadFullProfile(supabase, user.id));
  } catch (error) {
    if (isResponse(error)) return error;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error(error);
    return jsonResponse({ error: message }, 500);
  }
});
