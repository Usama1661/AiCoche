import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type { CvAiAnalysis } from './ai.ts';

function parseDate(value: string | undefined) {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized || /present|current|now/i.test(normalized)) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export async function saveAnalysisAndAutofill({
  supabase,
  userId,
  cvDocumentId,
  analysis,
}: {
  supabase: SupabaseClient;
  userId: string;
  cvDocumentId: string;
  analysis: CvAiAnalysis;
}) {
  const { data: analysisRow, error: analysisError } = await supabase
    .from('cv_analysis_results')
    .insert({
      user_id: userId,
      cv_document_id: cvDocumentId,
      full_name: analysis.fullName,
      email: analysis.email,
      phone: analysis.phone,
      current_designation: analysis.currentRole,
      summary: analysis.summary,
      experiences: analysis.experiences,
      education: analysis.education,
      skills: analysis.skills,
      certifications: analysis.certifications,
      projects: analysis.projects,
      cv_score: analysis.cvScore,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      improvement_suggestions: analysis.improvementSuggestions,
      recommended_skills: analysis.recommendedSkills,
      job_role_fit: analysis.jobRoleFit,
      raw_ai_response: analysis,
    })
    .select('*')
    .single();

  if (analysisError) throw analysisError;

  const current = analysis.experiences.find((item) => /present|current|now/i.test(item.endDate)) ?? analysis.experiences[0];

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: analysis.fullName || null,
    email: analysis.email || null,
    phone: analysis.phone || null,
    headline: analysis.currentRole || current?.title || null,
    current_designation: analysis.currentRole || current?.title || null,
    current_company: current?.company || null,
    employment_status: current ? 'employed' : 'open_to_work',
    summary: analysis.summary || null,
    ai_profile: analysis,
  });

  if (profileError) throw profileError;

  if (analysis.experiences.length) {
    await supabase.from('work_experiences').delete().eq('user_id', userId).eq('source_cv_document_id', cvDocumentId);
    const { error } = await supabase.from('work_experiences').insert(
      analysis.experiences.map((item) => ({
        user_id: userId,
        company_name: item.company || 'Unknown company',
        job_title: item.title || 'Professional role',
        start_date: parseDate(item.startDate),
        end_date: parseDate(item.endDate),
        is_current: /present|current|now/i.test(item.endDate),
        responsibilities: uniq(item.responsibilities),
        achievements: uniq(item.achievements),
        skills_used: uniq(item.skills),
        source_cv_document_id: cvDocumentId,
      }))
    );
    if (error) throw error;
  }

  if (analysis.education.length) {
    await supabase.from('educations').delete().eq('user_id', userId).eq('source_cv_document_id', cvDocumentId);
    const { error } = await supabase.from('educations').insert(
      analysis.education.map((item) => ({
        user_id: userId,
        institution: item.institution || 'Institution',
        degree: item.degree || null,
        field_of_study: item.fieldOfStudy || null,
        start_date: parseDate(item.startDate),
        end_date: parseDate(item.endDate),
        description: item.description || null,
        source_cv_document_id: cvDocumentId,
      }))
    );
    if (error) throw error;
  }

  if (analysis.skills.length) {
    const { error } = await supabase.from('skills').upsert(
      analysis.skills.map((item) => ({
        user_id: userId,
        name: item.name,
        category: item.category || 'technical',
        proficiency: item.proficiency || null,
        source_cv_document_id: cvDocumentId,
      })),
      { onConflict: 'user_id,name,category' }
    );
    if (error) throw error;
  }

  if (analysis.certifications.length) {
    await supabase.from('certifications').delete().eq('user_id', userId).eq('source_cv_document_id', cvDocumentId);
    const { error } = await supabase.from('certifications').insert(
      analysis.certifications.map((item) => ({
        user_id: userId,
        name: item.name || 'Certification',
        issuer: item.issuer || null,
        issued_at: parseDate(item.date),
        credential_url: item.credentialUrl || null,
        source_cv_document_id: cvDocumentId,
      }))
    );
    if (error) throw error;
  }

  if (analysis.projects.length) {
    await supabase.from('projects').delete().eq('user_id', userId).eq('source_cv_document_id', cvDocumentId);
    const { error } = await supabase.from('projects').insert(
      analysis.projects.map((item) => ({
        user_id: userId,
        name: item.name || 'Project',
        description: item.description || null,
        role: item.role || null,
        technologies: uniq(item.technologies ?? []),
        url: item.url || null,
        source_cv_document_id: cvDocumentId,
      }))
    );
    if (error) throw error;
  }

  return analysisRow;
}

export async function loadFullProfile(supabase: SupabaseClient, userId: string) {
  const [profile, experiences, educations, skills, certifications, projects, subscriptions] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('work_experiences').select('*').eq('user_id', userId).order('start_date', { ascending: false }),
      supabase.from('educations').select('*').eq('user_id', userId).order('end_date', { ascending: false }),
      supabase.from('skills').select('*').eq('user_id', userId).order('name'),
      supabase.from('certifications').select('*').eq('user_id', userId).order('issued_at', { ascending: false }),
      supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
    ]);

  for (const result of [profile, experiences, educations, skills, certifications, projects, subscriptions]) {
    if (result.error) throw result.error;
  }

  return {
    profile: profile.data,
    workExperiences: experiences.data ?? [],
    educations: educations.data ?? [],
    skills: skills.data ?? [],
    certifications: certifications.data ?? [],
    projects: projects.data ?? [],
    subscription: subscriptions.data?.[0] ?? null,
  };
}
