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

function uniqSkills(skills: CvAiAnalysis['skills']) {
  const seen = new Set<string>();
  return skills.filter((item) => {
    const name = item.name.trim();
    const category = item.category || 'technical';
    const key = `${name.toLowerCase()}::${category}`;
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function usefulProfession(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return /ai career coach app/i.test(text) ? '' : text;
}

function usefulName(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^(test|expense tracker app)$/i.test(text) ||
    /page\s*\(?\d+\)?|break|^-{3,}/i.test(text) ||
    /developer|engineer|designer|manager|analyst|experience|university|company|software|app|optimization|bug|resolution|notification|feature|community|portfolio|linkedin/i.test(text)
    ? ''
    : text;
}

const dateRangePattern = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|\d{4})\s*(?:[–-]\s*)?((?:present|current|now)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|\d{4})/i;

function cleanRoleTitle(value: string) {
  return value.replace(dateRangePattern, '').replace(/\s+/g, ' ').trim();
}

function normalizedExperience(item: CvAiAnalysis['experiences'][number]) {
  const combined = [item.title, item.company, item.startDate, item.endDate].filter(Boolean).join(' ');
  const dateMatch = combined.match(dateRangePattern);
  const startDate = item.startDate || dateMatch?.[1] || '';
  const endDate = item.endDate || dateMatch?.[2] || '';
  const badCompany = /^(present|current|now|\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i.test(item.company.trim());

  return {
    ...item,
    title: cleanRoleTitle(item.title),
    company: badCompany ? '' : item.company,
    startDate,
    endDate,
  };
}

function appProfileSnapshot(existingProfile: Record<string, unknown> | null, analysis: CvAiAnalysis) {
  const existingAi = objectOrEmpty(existingProfile?.ai_profile);
  const existingProfessional = objectOrEmpty(existingAi.professionalProfile);
  const hasManualIdentity = existingProfessional.source === 'manual';
  const normalizedExperiences = analysis.experiences.map(normalizedExperience);
  const current = normalizedExperiences.find((item) => /present|current|now/i.test(item.endDate)) ?? normalizedExperiences[0];
  const technicalSkills = analysis.skills
    .filter((item) => item.category !== 'soft')
    .map((item) => item.name);
  const softSkills = analysis.skills.filter((item) => item.category === 'soft').map((item) => item.name);
  const tools = analysis.skills.filter((item) => item.category === 'tool').map((item) => item.name);

  return {
    ...existingAi,
    professionLabel: usefulProfession(existingAi.professionLabel) || analysis.currentRole || '',
    skills: uniq(technicalSkills),
    tools: uniq(tools),
    projects: uniq(analysis.projects.map((item) => item.name)),
    professionalProfile: {
      ...existingProfessional,
      fullName: hasManualIdentity ? usefulName(existingProfessional.fullName) || analysis.fullName : analysis.fullName,
      email: analysis.email || String(existingProfessional.email || ''),
      phone: analysis.phone || String(existingProfessional.phone || ''),
      location: analysis.location || String(existingProfessional.location || ''),
      headline: hasManualIdentity
        ? usefulProfession(existingProfessional.headline) || analysis.currentRole || current?.title || ''
        : analysis.currentRole || current?.title || '',
      bio: analysis.summary || '',
      experiences: normalizedExperiences.map((item, index) => ({
        id: `resume-experience-${index + 1}`,
        company: item.company,
        title: item.title,
        startDate: item.startDate,
        endDate: item.endDate,
        responsibilities: uniq([...item.responsibilities, ...item.achievements]),
        skills: uniq(item.skills),
      })),
      education: analysis.education.map((item, index) => ({
        id: `resume-education-${index + 1}`,
        institution: item.institution,
        degree: item.degree,
        fieldOfStudy: item.fieldOfStudy,
        startDate: item.startDate,
        endDate: item.endDate,
        description: item.description,
      })),
      currentCompany: current?.company || '',
      currentDesignation: hasManualIdentity
        ? usefulProfession(existingProfessional.currentDesignation) || analysis.currentRole || current?.title || ''
        : analysis.currentRole || current?.title || '',
      employmentStatus: current ? 'employed' : existingProfessional.employmentStatus || 'open_to_work',
      technicalSkills: uniq(technicalSkills),
      softSkills: uniq(softSkills),
      certifications: analysis.certifications.map((item, index) => ({
        id: `resume-certification-${index + 1}`,
        name: item.name,
        issuer: item.issuer,
        date: item.date,
      })),
      source: 'resume',
      updatedAt: new Date().toISOString(),
    },
  };
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

  const normalizedExperiences = analysis.experiences.map(normalizedExperience);
  const current = normalizedExperiences.find((item) => /present|current|now/i.test(item.endDate)) ?? normalizedExperiences[0];
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('full_name, email, phone, headline, current_designation, ai_profile, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (existingProfileError) throw existingProfileError;

  const existingAi = objectOrEmpty(existingProfile?.ai_profile);
  const existingProfessional = objectOrEmpty(existingAi.professionalProfile);
  const hasManualIdentity = existingProfessional.source === 'manual';
  const manualHeadline = hasManualIdentity
    ? usefulProfession(existingProfessional.headline || existingProfile?.headline)
    : '';
  const manualDesignation = hasManualIdentity
    ? usefulProfession(existingProfessional.currentDesignation || existingProfile?.current_designation)
    : '';
  const fullName = hasManualIdentity
    ? usefulName(existingProfessional.fullName || existingProfile?.full_name) || analysis.fullName
    : analysis.fullName || existingProfile?.full_name || null;

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    email: existingProfile?.email ?? analysis.email ?? null,
    phone: existingProfile?.phone ?? analysis.phone ?? null,
    headline: manualHeadline || analysis.currentRole || current?.title || null,
    current_designation: manualDesignation || analysis.currentRole || current?.title || null,
    current_company: current?.company || null,
    employment_status: current ? 'employed' : 'open_to_work',
    summary: analysis.summary || null,
    avatar_url: existingProfile?.avatar_url ?? null,
    ai_profile: appProfileSnapshot(existingProfile, analysis),
  });

  if (profileError) throw profileError;

  const previousCvDeletes = await Promise.all([
    supabase.from('work_experiences').delete().eq('user_id', userId).not('source_cv_document_id', 'is', null),
    supabase.from('educations').delete().eq('user_id', userId).not('source_cv_document_id', 'is', null),
    supabase.from('skills').delete().eq('user_id', userId).not('source_cv_document_id', 'is', null),
    supabase.from('certifications').delete().eq('user_id', userId).not('source_cv_document_id', 'is', null),
    supabase.from('projects').delete().eq('user_id', userId).not('source_cv_document_id', 'is', null),
  ]);

  for (const result of previousCvDeletes) {
    if (result.error) throw result.error;
  }

  if (normalizedExperiences.length) {
    const { error } = await supabase.from('work_experiences').insert(
      normalizedExperiences.map((item) => ({
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
    const skills = uniqSkills(analysis.skills);
    const names = skills.map((item) => item.name.trim());
    const existing =
      names.length > 0
        ? await supabase.from('skills').select('name, category').eq('user_id', userId).in('name', names)
        : { data: [], error: null };

    if (existing.error) throw existing.error;

    const existingKeys = new Set(
      (existing.data ?? []).map((item) => `${String(item.name).toLowerCase()}::${String(item.category)}`)
    );
    const rows = skills
      .filter((item) => !existingKeys.has(`${item.name.trim().toLowerCase()}::${item.category || 'technical'}`))
      .map((item) => ({
        user_id: userId,
        name: item.name.trim(),
        category: item.category || 'technical',
        proficiency: item.proficiency || null,
        source_cv_document_id: cvDocumentId,
      }));

    const { error } = rows.length ? await supabase.from('skills').insert(rows) : { error: null };
    if (error) throw error;
  }

  if (analysis.certifications.length) {
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
