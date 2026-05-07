'use client';

import { createClient, type User } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

type Theme = 'dark' | 'light';
type Tab = 'home' | 'interview' | 'quiz' | 'profile' | 'settings';
type View =
  | 'splash'
  | 'login'
  | 'signup'
  | 'onboarding'
  | Tab
  | 'cv-upload'
  | 'cv-analysis'
  | 'professional-profile'
  | 'interview-session'
  | 'interview-history'
  | 'privacy-security'
  | 'privacy-policy'
  | 'help-support';

type Experience = 'beginner' | 'intermediate' | 'experienced';
type Goal = 'job' | 'switch' | 'freelance' | 'skills';

type ProfessionalProfile = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  bio: string;
  currentCompany: string;
  currentDesignation: string;
  employmentStatus: string;
  technicalSkills: string[];
  softSkills: string[];
  experiences: string[];
  education: string[];
  certifications: string[];
  extraSections: Array<{ title: string; items: string[] }>;
  source: 'resume' | 'manual' | null;
  updatedAt: string | null;
};

type ProfileState = {
  onboardingComplete: boolean;
  professionKey: string;
  professionLabel: string;
  avatarUrl: string;
  experience: Experience | null;
  goal: Goal | null;
  language: string;
  skills: string[];
  tools: string[];
  projects: string[];
  professionalProfile: ProfessionalProfile;
};

type MetricsState = {
  lastCvScore: number | null;
  lastInterviewScore: number | null;
  lastQuizScore: number | null;
  lastQuizLevel: string | null;
  lastCvDocumentId: string | null;
  lastCvStatus: string | null;
  lastCvFileName: string | null;
  lastCvText: string;
  lastAnalysis: CvAnalysis | null;
};

type UsageState = {
  plan: 'free' | 'pro';
  chatsUsed: number;
  cvAnalysesUsed: number;
};

type CvAnalysis = {
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  suggestions: string[];
  overallScore: number | null;
};

type Reminder = {
  id: string;
  scheduledAt: string;
  title: string;
  createdAt: string;
};

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  score?: number;
};

type ProjectRecommendation = {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeline: string;
  summary: string;
  why: string;
  skills: string[];
  features: string[];
  stack: string[];
  portfolioTips: string[];
  interviewTalkingPoints: string[];
};

type ProjectChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

type InterviewHistoryItem = {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'abandoned';
  score: number | null;
  turnCount: number;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type RemoteProfileRow = {
  onboardingComplete?: unknown;
  avatarUrl?: unknown;
  professionKey?: unknown;
  professionLabel?: unknown;
  experience?: unknown;
  goal?: unknown;
  language?: unknown;
  skills?: unknown;
  tools?: unknown;
  projects?: unknown;
  professionalProfile?: Partial<ProfessionalProfile> & {
    experiences?: unknown;
    education?: unknown;
    certifications?: unknown;
    technicalSkills?: unknown;
    softSkills?: unknown;
  };
};

type RemoteFullProfile = {
  profile?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    headline?: string | null;
    current_designation?: string | null;
    current_company?: string | null;
    employment_status?: string | null;
    avatar_url?: string | null;
    summary?: string | null;
    ai_profile?: RemoteProfileRow | null;
  } | null;
  workExperiences?: Array<Record<string, unknown>>;
  educations?: Array<Record<string, unknown>>;
  skills?: Array<Record<string, unknown>>;
  certifications?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
};

type LatestCvAnalysisRow = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  current_designation?: string | null;
  summary?: string | null;
  experiences?: unknown;
  education?: unknown;
  skills?: unknown;
  certifications?: unknown;
  projects?: unknown;
  raw_ai_response?: unknown;
};

type DirectProfileTables = {
  profile?: RemoteFullProfile['profile'] | null;
  workExperiences?: Array<Record<string, unknown>>;
  educations?: Array<Record<string, unknown>>;
  skills?: Array<Record<string, unknown>>;
  certifications?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
};

const FREE_CHAT_LIMIT = 10;
const FREE_CV_LIMIT = 10;
const MOTIVATIONAL_QUOTES = [
  'Small steps compound into big career wins. Keep showing up today.',
  'Your next opportunity is built by the practice you do now.',
  'Progress is not always loud. Quiet consistency still counts.',
  'Every strong profile starts with one clear story about your value.',
  'You are closer than you think. Refine, practice, and keep moving.',
  'Confidence grows when preparation becomes a habit.',
  'Today is a good day to improve one answer, one skill, or one line on your CV.',
  'The work you do on yourself is never wasted.',
  'Your future role is looking for the proof you are building today.',
  'Stay patient with the process and serious about the next step.',
];

const professions = [
  ['software-engineer', 'Software Engineer'],
  ['react-native-developer', 'React Native Developer'],
  ['frontend-developer', 'Frontend Developer'],
  ['backend-developer', 'Backend Developer'],
  ['full-stack-developer', 'Full Stack Developer'],
  ['ui-ux-designer', 'UI/UX Designer'],
  ['product-manager', 'Product Manager'],
  ['data-analyst', 'Data Analyst'],
  ['data-scientist', 'Data Scientist'],
  ['digital-marketer', 'Digital Marketer'],
  ['project-manager', 'Project Manager'],
  ['qa-engineer', 'QA Engineer'],
  ['business-analyst', 'Business Analyst'],
  ['customer-success-manager', 'Customer Success Manager'],
] as const;

const emptyProfessionalProfile: ProfessionalProfile = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  headline: '',
  bio: '',
  currentCompany: '',
  currentDesignation: '',
  employmentStatus: '',
  technicalSkills: [],
  softSkills: [],
  experiences: [],
  education: [],
  certifications: [],
  extraSections: [],
  source: null,
  updatedAt: null,
};

const initialProfile: ProfileState = {
  onboardingComplete: false,
  professionKey: '',
  professionLabel: '',
  avatarUrl: '',
  experience: null,
  goal: null,
  language: 'English',
  skills: [],
  tools: [],
  projects: [],
  professionalProfile: emptyProfessionalProfile,
};

const initialMetrics: MetricsState = {
  lastCvScore: null,
  lastInterviewScore: null,
  lastQuizScore: null,
  lastQuizLevel: null,
  lastCvDocumentId: null,
  lastCvStatus: null,
  lastCvFileName: null,
  lastCvText: '',
  lastAnalysis: null,
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const hasSupabase = supabaseUrl.includes('http') && supabaseAnonKey.length > 20;

declare global {
  // Keep one auth client during Next Fast Refresh to avoid duplicate GoTrue instances.
  // eslint-disable-next-line no-var
  var __aicocheSupabaseClient: ReturnType<typeof createClient> | undefined;
}

const supabase = hasSupabase
  ? globalThis.__aicocheSupabaseClient ??
    (globalThis.__aicocheSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }))
  : null;

function storageGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
    if (fallback && typeof fallback === 'object' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...fallback, ...parsed } as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function storageSet<T>(key: string, value: T) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function normalizeProfileState(profile: ProfileState): ProfileState {
  return {
    ...initialProfile,
    ...profile,
    professionalProfile: {
      ...emptyProfessionalProfile,
      ...(profile.professionalProfile ?? {}),
      extraSections: Array.isArray(profile.professionalProfile?.extraSections)
        ? profile.professionalProfile.extraSections
        : [],
    },
  };
}

function normalizeReminders(value: unknown): Reminder[] {
  return Array.isArray(value)
    ? value.filter((item): item is Reminder => Boolean(item) && typeof item === 'object' && 'scheduledAt' in item)
    : [];
}

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeInterviewScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const score = value > 10 ? value / 10 : value;
  return Math.min(10, Math.max(1, Math.round(score)));
}

function normalizeInterviewMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const role = record.role === 'user' ? 'user' : record.role === 'assistant' ? 'assistant' : null;
    const content = typeof record.content === 'string' ? record.content.trim() : '';
    if (!role || !content) return [];
    return [{
      id: typeof record.id === 'string' ? record.id : `${index}-${role}`,
      role,
      content,
      score: normalizeInterviewScore(record.score) ?? undefined,
    }];
  });
}

function normalizeInterviewHistory(value: unknown): InterviewHistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const itemId = typeof record.id === 'string' ? record.id : '';
    const createdAt = typeof record.createdAt === 'string'
      ? record.createdAt
      : typeof record.created_at === 'string'
        ? record.created_at
        : new Date().toISOString();
    const updatedAt = typeof record.updatedAt === 'string'
      ? record.updatedAt
      : typeof record.updated_at === 'string'
        ? record.updated_at
        : createdAt;
    const status: InterviewHistoryItem['status'] = record.status === 'completed' || record.status === 'abandoned' ? record.status : 'active';
    const messages = normalizeInterviewMessages(record.messages);
    return [{
      id: itemId || id(),
      title: text(record.title) || 'Mock interview practice',
      status,
      score: normalizeInterviewScore(record.score),
      turnCount: typeof record.turnCount === 'number'
        ? record.turnCount
        : typeof record.turn_count === 'number'
          ? record.turn_count
          : messages.filter((message) => message.role === 'user').length,
      messages,
      createdAt,
      updatedAt,
    }];
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function upsertInterviewHistory(current: InterviewHistoryItem[], item: InterviewHistoryItem): InterviewHistoryItem[] {
  const next = [item, ...current.filter((session) => session.id !== item.id)];
  return normalizeInterviewHistory(next).slice(0, 12);
}

function displayNameFor(user: User | null) {
  if (!user) return 'User';
  const meta = user.user_metadata ?? {};
  return String(meta.full_name || meta.display_name || user.email?.split('@')[0] || 'User');
}

function avatarFor(profile: ProfileState, user?: User | null) {
  const profileAvatar = text(profile.avatarUrl);
  if (profileAvatar) return profileAvatar;

  const meta = user?.user_metadata ?? {};
  const metadataAvatar = text(meta.avatar_url) || text(meta.picture);
  return metadataAvatar || '';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read selected image.'));
    reader.readAsDataURL(file);
  });
}

function isExperience(value: unknown): value is Experience {
  return value === 'beginner' || value === 'intermediate' || value === 'experienced';
}

function isGoal(value: unknown): value is Goal {
  return value === 'job' || value === 'switch' || value === 'freelance' || value === 'skills';
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      const entry = item as Record<string, unknown>;
      return [
        entry.title,
        entry.job_title,
        entry.company,
        entry.company_name,
        entry.institution,
        entry.degree,
        entry.field_of_study,
        entry.name,
        entry.issuer,
        entry.description,
      ]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .join(' - ');
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

function objectList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function listFromUnknown(value: unknown) {
  if (typeof value === 'string') return value.split(/\n+|;\s*/).map((item) => item.trim()).filter(Boolean);
  return stringList(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function usefulCvName(value: unknown): string {
  const name = text(value);
  if (!name) return '';
  if (/^(test|user|hhd|dev|developer|software engineer)$/i.test(name)) return '';
  if (/developer|engineer|designer|manager|analyst|experience|university|company|software|app/i.test(name)) return '';
  return name;
}

function compactList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isCleanSkill(value: string) {
  const skill = value.trim();
  if (!skill || skill.length > 42) return false;
  if (/recommendations?|name\s*:|mr\.?|mrs\.?|lecturer|supervisor|supervised|under my|working under|ceo|founder|final year|date of birth|phone|email|linkedin|github|website|portfolio|country|city|address/i.test(skill)) return false;
  if (/[|:]/.test(skill)) return false;
  return true;
}

function compactSkills(values: string[]) {
  return compactList(values).filter(isCleanSkill);
}

function cleanSectionTitle(value: unknown) {
  return text(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractExtraSections(raw: unknown) {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const direct = objectList(source.additionalSections ?? source.extraSections ?? source.customSections)
    .map((section) => ({
      title: cleanSectionTitle(section.title ?? section.name ?? section.heading),
      items: compactList(listFromUnknown(section.items ?? section.content ?? section.values)),
    }))
    .filter((section) => section.title && section.items.length);
  const recommendations = compactList([
    ...stringList(source.recommendations),
    ...stringList(source.references),
    ...stringList(source.referenceLetters),
  ]);
  const sections = [...direct];
  if (recommendations.length) sections.push({ title: 'Recommendations', items: recommendations });
  const known = /^(work experience|experience|education|skills|technical skills|soft skills|certifications|projects|summary|professional summary)$/i;
  return sections.filter((section) => !known.test(section.title));
}

function uniqueSections(sections: Array<{ title: string; items: string[] }>) {
  const map = new Map<string, { title: string; items: string[] }>();
  sections.forEach((section) => {
    const title = cleanSectionTitle(section.title);
    const items = compactList(section.items);
    if (!title || !items.length) return;
    const key = title.toLowerCase();
    const existing = map.get(key);
    map.set(key, { title, items: compactList([...(existing?.items ?? []), ...items]) });
  });
  return Array.from(map.values());
}

function formatDateRange(startValue: unknown, endValue: unknown, isCurrentValue?: unknown) {
  const start = text(startValue);
  const end = text(endValue);
  const isCurrent = isCurrentValue === true || /present|current|now/i.test(end);
  if (start && isCurrent) return `${start} - Present`;
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (isCurrent) return 'Present';
  return end;
}

function formatWorkExperience(row: Record<string, unknown>): string {
  const title = text(row.job_title ?? row.title);
  const company = text(row.company_name ?? row.company);
  const dates = formatDateRange(row.start_date ?? row.startDate, row.end_date ?? row.endDate, row.is_current ?? row.isCurrent);
  const responsibilities = stringList(row.responsibilities).slice(0, 2).join('; ');
  const achievements = stringList(row.achievements).slice(0, 1).join('; ');
  return [title || 'Professional role', company, dates, responsibilities || achievements].filter(Boolean).join(' • ');
}

function formatEducation(row: Record<string, unknown>): string {
  const degree = text(row.degree);
  const field = text(row.field_of_study ?? row.fieldOfStudy);
  const institution = text(row.institution);
  const dates = formatDateRange(row.start_date ?? row.startDate, row.end_date ?? row.endDate);
  return [[degree, field].filter(Boolean).join(' in '), institution, dates].filter(Boolean).join(' • ');
}

function formatEducationAnalysis(value: unknown) {
  return objectList(value)
    .map((row) => formatEducation(row))
    .filter(Boolean);
}

function formatCertification(row: Record<string, unknown>): string {
  return [text(row.name), text(row.issuer), text(row.issued_at ?? row.date)].filter(Boolean).join(' • ');
}

function formatProject(row: Record<string, unknown>): string {
  return [text(row.name), text(row.description)].filter(Boolean).join(' • ');
}

function mergeRemoteProfile(remote: unknown, fallback: ProfileState): ProfileState {
  const full = (remote && typeof remote === 'object' ? remote : {}) as RemoteFullProfile;
  const baseData = full.profile?.ai_profile && typeof full.profile.ai_profile === 'object'
    ? full.profile.ai_profile
    : remote;
  const data = (baseData && typeof baseData === 'object' ? baseData : {}) as RemoteProfileRow;
  const profileRow = full.profile ?? {};
  const professional = data.professionalProfile && typeof data.professionalProfile === 'object'
    ? data.professionalProfile
    : {};
  const workExperiences = (full.workExperiences ?? []).map(formatWorkExperience).filter(Boolean);
  const educations = (full.educations ?? []).map(formatEducation).filter(Boolean);
  const remoteSkills = full.skills ?? [];
  const technicalSkills = remoteSkills
    .filter((item) => text(item.category) !== 'soft')
    .map((item) => text(item.name))
    .filter(Boolean);
  const softSkills = remoteSkills
    .filter((item) => text(item.category) === 'soft')
    .map((item) => text(item.name))
    .filter(Boolean);
  const toolSkills = remoteSkills
    .filter((item) => text(item.category) === 'tool')
    .map((item) => text(item.name))
    .filter(Boolean);
  const certifications = (full.certifications ?? []).map(formatCertification).filter(Boolean);
  const projects = (full.projects ?? []).map(formatProject).filter(Boolean);
  const extraSections = uniqueSections([
    ...((professional.extraSections && Array.isArray(professional.extraSections)) ? professional.extraSections as Array<{ title: string; items: string[] }> : []),
    ...extractExtraSections(data),
  ]);
  const bestName =
    usefulCvName(professional.fullName) ||
    usefulCvName(profileRow.full_name) ||
    fallback.professionalProfile.fullName;
  const bestHeadline =
    text(professional.headline) ||
    text(profileRow.headline) ||
    text(profileRow.current_designation) ||
    fallback.professionLabel;
  const remoteProfessionKey = typeof data.professionKey === 'string' ? data.professionKey : fallback.professionKey;
  const remoteProfessionLabel = typeof data.professionLabel === 'string' && data.professionLabel.trim()
    ? data.professionLabel
    : bestHeadline || fallback.professionLabel;
  const remoteExperience = isExperience(data.experience) ? data.experience : fallback.experience;
  const remoteGoal = isGoal(data.goal) ? data.goal : fallback.goal;
  const hasSavedOnboardingAnswers = typeof data.professionKey === 'string' && data.professionKey.trim() &&
    typeof data.professionLabel === 'string' && data.professionLabel.trim() &&
    isExperience(data.experience) &&
    isGoal(data.goal);
  const remoteOnboardingComplete = data.onboardingComplete === true ||
    Boolean(hasSavedOnboardingAnswers);

  return {
    ...fallback,
    onboardingComplete: remoteOnboardingComplete,
    avatarUrl: text(data.avatarUrl) || text(profileRow.avatar_url) || fallback.avatarUrl,
    professionKey: remoteProfessionKey,
    professionLabel: remoteProfessionLabel,
    experience: remoteExperience,
    goal: remoteGoal,
    language: typeof data.language === 'string' && data.language.trim() ? data.language : fallback.language,
    skills: compactSkills([...technicalSkills, ...stringList(data.skills), ...fallback.skills]),
    tools: compactSkills([...toolSkills, ...stringList(data.tools), ...fallback.tools]),
    projects: compactList([...projects, ...stringList(data.projects), ...fallback.projects]),
    professionalProfile: {
      ...fallback.professionalProfile,
      ...professional,
      fullName: bestName,
      email: text(professional.email) || text(profileRow.email) || fallback.professionalProfile.email,
      phone: text(professional.phone) || text(profileRow.phone) || fallback.professionalProfile.phone,
      location: typeof professional.location === 'string' ? professional.location : fallback.professionalProfile.location,
      headline: bestHeadline,
      bio: text(professional.bio) || text(profileRow.summary) || fallback.professionalProfile.bio,
      currentCompany: text(professional.currentCompany) || text(profileRow.current_company) || fallback.professionalProfile.currentCompany,
      currentDesignation: text(professional.currentDesignation) || text(profileRow.current_designation) || bestHeadline,
      employmentStatus: text(professional.employmentStatus) || text(profileRow.employment_status) || fallback.professionalProfile.employmentStatus,
      technicalSkills: compactSkills([...technicalSkills, ...stringList(professional.technicalSkills)]),
      softSkills: compactSkills([...softSkills, ...stringList(professional.softSkills)]),
      experiences: uniqueExperiences([...workExperiences, ...stringList(professional.experiences)]),
      education: uniqueEducations([...educations, ...stringList(professional.education)]),
      certifications: compactList([...certifications, ...stringList(professional.certifications)]),
      extraSections,
      source: professional.source === 'resume' || professional.source === 'manual' ? professional.source : fallback.professionalProfile.source,
      updatedAt: typeof professional.updatedAt === 'string' ? professional.updatedAt : new Date().toISOString(),
    },
  };
}

function mergeLatestAnalysisProfile(profile: ProfileState, analysis: LatestCvAnalysisRow): ProfileState {
  const experiences = stringList(analysis.experiences);
  const education = formatEducationAnalysis(analysis.education);
  const skills = stringList(analysis.skills);
  const certifications = stringList(analysis.certifications);
  const projects = stringList(analysis.projects);
  const extraSections = extractExtraSections(analysis.raw_ai_response);
  const fullName = usefulCvName(analysis.full_name) || profile.professionalProfile.fullName;
  const headline = text(analysis.current_designation) || profile.professionalProfile.headline || profile.professionLabel;
  const bio = text(analysis.summary) || profile.professionalProfile.bio;

  return {
    ...profile,
    professionLabel: headline || profile.professionLabel,
    skills: compactSkills([...skills, ...profile.skills]),
    projects: compactList([...projects, ...profile.projects]),
    professionalProfile: {
      ...profile.professionalProfile,
      fullName,
      email: text(analysis.email) || profile.professionalProfile.email,
      phone: text(analysis.phone) || profile.professionalProfile.phone,
      headline,
      bio,
      currentDesignation: headline,
      technicalSkills: compactSkills([...skills, ...profile.professionalProfile.technicalSkills]),
      experiences: uniqueExperiences([...experiences, ...profile.professionalProfile.experiences]),
      education: uniqueEducations([...education, ...profile.professionalProfile.education]),
      certifications: compactList([...certifications, ...profile.professionalProfile.certifications]),
      extraSections: uniqueSections([...profile.professionalProfile.extraSections, ...extraSections]),
      source: 'resume',
      updatedAt: new Date().toISOString(),
    },
  };
}

async function loadDirectProfileTables(): Promise<DirectProfileTables | null> {
  if (!hasSupabase || !supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const client = supabase as unknown as { from: (table: string) => any };
  const [profile, workExperiences, educations, skills, certifications, projects] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('work_experiences').select('*').eq('user_id', userId).order('start_date', { ascending: false }),
    client.from('educations').select('*').eq('user_id', userId).order('end_date', { ascending: false }),
    client.from('skills').select('*').eq('user_id', userId).order('name'),
    client.from('certifications').select('*').eq('user_id', userId).order('issued_at', { ascending: false }),
    client.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  if ([profile, workExperiences, educations, skills, certifications, projects].some((result) => result.error)) {
    return null;
  }

  return {
    profile: profile.data,
    workExperiences: workExperiences.data ?? [],
    educations: educations.data ?? [],
    skills: skills.data ?? [],
    certifications: certifications.data ?? [],
    projects: projects.data ?? [],
  };
}

async function fetchRemoteProfile(fallback: ProfileState): Promise<ProfileState | null> {
  if (!hasSupabase || !supabase) return null;
  let remotePayload: RemoteFullProfile | null = null;

  try {
    const { data, error } = await supabase.functions.invoke<RemoteFullProfile>('get-profile');
    if (!error && data) remotePayload = data;
  } catch {
    // Fall back to direct table reads below.
  }

  const directProfile = await loadDirectProfileTables();
  if (directProfile) {
    remotePayload = {
      profile: directProfile.profile,
      workExperiences: directProfile.workExperiences,
      educations: directProfile.educations,
      skills: directProfile.skills,
      certifications: directProfile.certifications,
      projects: directProfile.projects,
    };
  }

  if (!remotePayload) return null;

  let merged = mergeRemoteProfile(remotePayload, fallback);
  try {
    const analysisTable = supabase.from('cv_analysis_results') as unknown as {
      select: (columns: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          limit: (count: number) => Promise<{ data: LatestCvAnalysisRow[] | null; error: { message: string } | null }>;
        };
      };
    };
    const latest = await analysisTable
      .select('full_name,email,phone,current_designation,summary,experiences,education,skills,certifications,projects,raw_ai_response')
      .order('created_at', { ascending: false })
      .limit(1);
    if (!latest.error && latest.data?.[0]) {
      merged = mergeLatestAnalysisProfile(merged, latest.data[0]);
    }
  } catch {
    // The Edge Function profile payload is enough when direct analysis history is unavailable.
  }
  return merged;
}

async function fetchRemoteInterviewSessions(): Promise<InterviewHistoryItem[]> {
  if (!hasSupabase || !supabase) return [];
  const { data, error } = await supabase
    .from('interview_sessions')
    .select('id,title,status,score,turn_count,messages,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) throw error;
  return normalizeInterviewHistory(data);
}

async function saveProfileSnapshot(snapshot: ProfileState, user: User | null) {
  if (!hasSupabase || !supabase || !user) return;
  const professional = snapshot.professionalProfile;
  const profilesTable = supabase.from('profiles') as unknown as {
    upsert: (value: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
  const { error } = await profilesTable.upsert({
    id: user.id,
    email: user.email,
    full_name: professional.fullName || displayNameFor(user),
    phone: professional.phone || null,
    headline: professional.headline || snapshot.professionLabel || null,
    current_designation: professional.currentDesignation || snapshot.professionLabel || null,
    current_company: professional.currentCompany || null,
    employment_status: professional.employmentStatus || null,
    avatar_url: snapshot.avatarUrl || null,
    summary: professional.bio || null,
    ai_profile: snapshot,
  });
  if (error) throw error;
}

function mockAnalysis(profile: ProfileState): CvAnalysis {
  return {
    strengths: [
      `Clear focus as ${profile.professionLabel || 'a professional'}`,
      'Structured experience narrative',
      'Relevant tools and outcomes where mentioned',
    ],
    weaknesses: [
      'Quantified impact could be stronger in recent roles',
      'Skills section could mirror target job keywords more closely',
    ],
    missingSkills: ['Stakeholder communication', 'Cloud fundamentals', 'Testing discipline'],
    suggestions: [
      'Rewrite each role with action, tool, and measurable result.',
      'Tie skills to outcomes by explaining what you built and what improved.',
      'Keep the CV concise and aligned with the target role.',
    ],
    overallScore: 78,
  };
}

function applyAnalysisToProfile(profile: ProfileState, analysis: CvAnalysis, cvText: string): ProfileState {
  const inferredSkills = analysis.missingSkills.slice(0, 6);
  const summary = cvText
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line.length > 80 && line.length < 260);

  return {
    ...profile,
    skills: Array.from(new Set([...profile.skills, ...inferredSkills])),
    professionalProfile: {
      ...profile.professionalProfile,
      bio: profile.professionalProfile.bio || summary || analysis.strengths[0] || '',
      technicalSkills: Array.from(new Set([...profile.professionalProfile.technicalSkills, ...inferredSkills])),
      source: 'resume',
      updatedAt: new Date().toISOString(),
    },
  };
}

export default function WebApp() {
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [view, setView] = useState<View>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [metrics, setMetrics] = useState<MetricsState>(initialMetrics);
  const [usage, setUsage] = useState<UsageState>({ plan: 'free', chatsUsed: 0, cvAnalysesUsed: 0 });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [interviewSessions, setInterviewSessions] = useState<InterviewHistoryItem[]>([]);
  const [selectedInterviewSessionId, setSelectedInterviewSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const remoteProfileLoadedFor = useRef<string | null>(null);

  useEffect(() => {
    setTheme(storageGet<Theme>('aicoche-web-theme', 'dark'));
    setProfile(normalizeProfileState(storageGet<ProfileState>('aicoche-web-profile', initialProfile)));
    setMetrics(storageGet<MetricsState>('aicoche-web-metrics', initialMetrics));
    setUsage(storageGet<UsageState>('aicoche-web-usage', { plan: 'free', chatsUsed: 0, cvAnalysesUsed: 0 }));
    setReminders(normalizeReminders(storageGet<unknown>('aicoche-web-reminders', [])));
    setInterviewSessions(normalizeInterviewHistory(storageGet<unknown>('aicoche-web-interview-sessions', [])));

    supabase?.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setHydrated(true);
    }) ?? setHydrated(true);
  }, []);

  useEffect(() => storageSet('aicoche-web-theme', theme), [theme]);
  useEffect(() => storageSet('aicoche-web-profile', profile), [profile]);
  useEffect(() => storageSet('aicoche-web-metrics', metrics), [metrics]);
  useEffect(() => storageSet('aicoche-web-usage', usage), [usage]);
  useEffect(() => storageSet('aicoche-web-reminders', reminders), [reminders]);
  useEffect(() => storageSet('aicoche-web-interview-sessions', interviewSessions), [interviewSessions]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      const seenSplash = storageGet<boolean>('aicoche-web-seen-splash', false);
      setView(seenSplash ? 'login' : 'splash');
      return;
    }
    setView(profile.onboardingComplete ? 'home' : 'onboarding');
  }, [hydrated, profile.onboardingComplete, user]);

  useEffect(() => {
    if (!hydrated || !user || remoteProfileLoadedFor.current === user.id) return;
    remoteProfileLoadedFor.current = user.id;
    fetchRemoteProfile(profile)
      .then((remote) => {
        if (remote) setProfile(remote);
      })
      .catch(() => {
        // Local profile state is still usable if remote profile loading fails.
      });
    fetchRemoteInterviewSessions()
      .then((sessions) => {
        if (sessions.length) setInterviewSessions((current) => normalizeInterviewHistory([...sessions, ...current]).slice(0, 12));
      })
      .catch(() => {
        // Local interview sessions are still useful if remote history is unavailable.
      });
    // Load only once per signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  async function signOut() {
    setBusy(true);
    await supabase?.auth.signOut();
    remoteProfileLoadedFor.current = null;
    setUser(null);
    setProfile(initialProfile);
    setMetrics(initialMetrics);
    setUsage({ plan: 'free', chatsUsed: 0, cvAnalysesUsed: 0 });
    setReminders([]);
    setInterviewSessions([]);
    setSelectedInterviewSessionId(null);
    setBusy(false);
    setView('login');
  }

  const common = {
    user,
    setUser,
    profile,
    setProfile,
    metrics,
    setMetrics,
    usage,
    setUsage,
    reminders,
    setReminders,
    interviewSessions,
    setInterviewSessions,
    selectedInterviewSessionId,
    setSelectedInterviewSessionId,
    setView,
    setError,
    busy,
    setBusy,
  };

  if (!hydrated) {
    return <Loading theme={theme} />;
  }

  return (
    <main className="app-shell" data-theme={theme}>
      {error ? (
        <Toast message={error} onClose={() => setError('')} />
      ) : null}

      {view === 'splash' ? <Splash onDone={() => setView('login')} /> : null}
      {view === 'login' ? <Auth mode="login" {...common} /> : null}
      {view === 'signup' ? <Auth mode="signup" {...common} /> : null}
      {view === 'onboarding' ? <Onboarding profile={profile} setProfile={setProfile} setView={setView} /> : null}

      {user && profile.onboardingComplete ? (
        <>
          <WebHeader
            active={isTab(view) ? view : null}
            theme={theme}
            setTheme={setTheme}
            usage={usage}
            setView={setView}
            onSignOut={signOut}
          />
          {view === 'home' ? <Home {...common} /> : null}
          {view === 'interview' ? <InterviewTab {...common} /> : null}
          {view === 'quiz' ? <Quiz {...common} /> : null}
          {view === 'profile' ? <Profile {...common} onSignOut={signOut} /> : null}
          {view === 'settings' ? (
            <Settings
              theme={theme}
              setTheme={setTheme}
              onSignOut={signOut}
              setView={setView}
            />
          ) : null}
          {view === 'cv-upload' ? <CvUpload {...common} /> : null}
          {view === 'cv-analysis' ? <CvAnalysisScreen {...common} /> : null}
          {view === 'professional-profile' ? <ProfessionalProfileScreen {...common} /> : null}
          {view === 'interview-session' ? <InterviewSession {...common} /> : null}
          {view === 'interview-history' ? <InterviewHistorySession {...common} /> : null}
          {view === 'privacy-security' ? <InfoPage title="Privacy & Security" setView={setView} /> : null}
          {view === 'privacy-policy' ? <InfoPage title="Privacy Policy" setView={setView} /> : null}
          {view === 'help-support' ? <InfoPage title="Help & Support" setView={setView} /> : null}
        </>
      ) : null}
    </main>
  );
}

type CommonProps = {
  user: User | null;
  setUser: (u: User | null) => void;
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
  metrics: MetricsState;
  setMetrics: React.Dispatch<React.SetStateAction<MetricsState>>;
  usage: UsageState;
  setUsage: React.Dispatch<React.SetStateAction<UsageState>>;
  reminders: Reminder[];
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  interviewSessions: InterviewHistoryItem[];
  setInterviewSessions: React.Dispatch<React.SetStateAction<InterviewHistoryItem[]>>;
  selectedInterviewSessionId: string | null;
  setSelectedInterviewSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setView: (view: View) => void;
  setError: (message: string) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
};

function Loading({ theme }: { theme: Theme }) {
  return (
    <main className="app-shell" data-theme={theme} suppressHydrationWarning>
      <section className="screen narrow stack" style={{ minHeight: '100vh', placeContent: 'center' }}>
        <div className="icon-box" style={{ margin: '0 auto' }}>A</div>
        <p className="body muted" style={{ textAlign: 'center' }} suppressHydrationWarning>Loading AiCoche...</p>
      </section>
    </main>
  );
}

function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      storageSet('aicoche-web-seen-splash', true);
      onDone();
    }, 1300);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <section className="screen narrow entry-shell" style={{ textAlign: 'center' }}>
      <div className="entry-card stack">
        <span className="floating-orb one" aria-hidden="true">CV</span>
        <span className="floating-orb two" aria-hidden="true">AI</span>
        <div className="brand-mark" style={{ width: 82, height: 82, borderRadius: 26, margin: '0 auto' }}>A</div>
        <span className="hero-kicker" style={{ margin: '0 auto' }}>AI Career Coach</span>
        <h1 className="display">AiCoche</h1>
        <p className="body muted" style={{ maxWidth: 460, margin: '0 auto' }}>
          A calmer way to improve your CV, prepare interviews, and move your career forward.
        </p>
      </div>
    </section>
  );
}

function Auth({ mode, setUser, setProfile, setView, setBusy, setError, busy }: CommonProps & { mode: 'login' | 'signup' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6;

  async function submit() {
    if (!hasSupabase || !supabase) {
      setError('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the web app environment.');
      return;
    }
    if (!valid) {
      setError('Enter a valid email and a password with at least 6 characters.');
      return;
    }
    setBusy(true);
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() || email.split('@')[0] } },
        });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (!result.data.user || (mode === 'signup' && !result.data.session)) {
      setError('Account created. Confirm your email, then sign in.');
      setView('login');
      return;
    }
    if (mode === 'signup') {
      setProfile({
        ...initialProfile,
        professionalProfile: {
          ...emptyProfessionalProfile,
          fullName: name.trim() || email.trim().split('@')[0],
          email: email.trim(),
        },
      });
      setView('onboarding');
    }
    setUser(result.data.user);
  }

  return (
    <section className="screen narrow entry-shell">
      <div className="entry-card auth-card stack">
        <div className="brand-mark" style={{ width: 76, height: 76, borderRadius: 24, margin: '0 auto' }}>A</div>
        <div style={{ textAlign: 'center' }}>
        <span className="hero-kicker" style={{ margin: '0 auto 12px' }}>
          {mode === 'login' ? 'Welcome back' : 'Start free'}
        </span>
        <h1 className="display">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
        <p className="body muted" style={{ marginTop: 8 }}>
          {mode === 'login' ? 'Sign in to continue your career journey' : 'Start your career growth journey today'}
        </p>
      </div>
      {mode === 'signup' ? <Field label="Full Name" value={name} onChange={setName} placeholder="John Doe" /> : null}
      <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
      <Field label="Password" value={password} onChange={setPassword} placeholder="Min. 6 characters" type="password" />
      <Button onClick={submit} disabled={!valid || busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</Button>
      <div className="row" style={{ justifyContent: 'center' }}>
        <p className="body muted">{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</p>
        <button className="button ghost" onClick={() => setView(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Sign Up' : 'Sign In'}
        </button>
      </div>
      </div>
    </section>
  );
}

function Onboarding({ profile, setProfile, setView }: Pick<CommonProps, 'profile' | 'setProfile' | 'setView'>) {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [customField, setCustomField] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [profession, setProfession] = useState<{ key: string; label: string } | null>(
    profile.professionKey ? { key: profile.professionKey, label: profile.professionLabel } : null
  );
  const [experience, setExperience] = useState<Experience | null>(profile.experience);
  const [goal, setGoal] = useState<Goal | null>(profile.goal);
  const [language, setLanguage] = useState(profile.language || 'English');
  const filtered = professions.filter((p) => p[1].toLowerCase().includes(query.toLowerCase()));
  const suggestions = filtered.slice(0, 6);
  const exactMatch = professions.some((p) => p[1].toLowerCase() === query.trim().toLowerCase());
  const showOther = query.trim().length > 0 && !exactMatch;
  const popularFields = ['Software Engineer', 'Frontend Developer', 'Data Analyst', 'UI/UX Designer', 'Product Manager', 'Digital Marketer'];
  const suggestedLanguages = ['English', 'Spanish', 'French'];
  const canContinue = step === 0 ? profession : step === 1 ? experience : step === 2 ? goal : true;

  function chooseProfession(key: string, label: string) {
    setProfession({ key, label });
    setQuery(label);
    setAddingCustom(false);
    setCustomField('');
    setSearchFocused(false);
  }

  function chooseOther() {
    const label = query.trim();
    setAddingCustom(true);
    setCustomField(label);
    setProfession(label ? { key: `other-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, label } : null);
    setSearchFocused(false);
  }

  function updateCustomField(value: string) {
    setCustomField(value);
    const label = value.trim();
    setProfession(label ? { key: `other-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, label } : null);
  }

  function next() {
    if (!canContinue) return;
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    setProfile((current) => ({
      ...current,
      onboardingComplete: true,
      professionKey: profession!.key,
      professionLabel: profession!.label,
      experience: experience!,
      goal: goal!,
      language,
    }));
    setView('home');
  }

  return (
    <section className="screen onboarding-shell">
      <div className="onboarding-card">
        <div className="stack dashboard-hero-copy">
          <div className="brand" style={{ cursor: 'default' }}>
            <span className="brand-mark">A</span>
            <span>AiCoche</span>
          </div>
          <span className="hero-kicker">Personalized setup</span>
          <div className="progress"><span style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
          <p className="body muted">Step {step + 1} of 4</p>
          <div>
            <h1 className="display" style={{ fontSize: 'clamp(34px, 5vw, 54px)' }}>
              {step === 0 ? "What's your profession?" : step === 1 ? 'Experience Level' : step === 2 ? 'Career Goal' : 'Preferred Language'}
            </h1>
            <p className="body muted" style={{ marginTop: 12 }}>
              {step === 0 ? 'Search a field, pick a recommendation, or add your own.' : step === 1 ? 'How many years of experience do you have?' : step === 2 ? 'What are you aiming to achieve?' : 'Choose from suggested coaching languages.'}
            </p>
          </div>
          <div className="card stack">
            <p className="label">Why we ask</p>
            <p className="body muted">AiCoche personalizes CV feedback, quiz prompts, and mock interview questions around your target field and experience.</p>
          </div>
          <div className="hero-stat-grid">
            <div className="soft-stat">
              <span className="label">Coach mode</span>
              <span className="soft-stat-value">24/7</span>
              <span className="soft-stat-label">Practice whenever you are ready</span>
            </div>
            <div className="soft-stat">
              <span className="label">Setup</span>
              <span className="soft-stat-value">4</span>
              <span className="soft-stat-label">Steps to personalize AiCoche</span>
            </div>
          </div>
        </div>

        <div className="card stack">
      {step === 0 ? (
        <div className="stack">
          <div className="search-wrap">
            <label className="input-group">
              <span className="label">Search</span>
              <input
                className="input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setAddingCustom(false);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search professions..."
              />
            </label>
            {searchFocused && (suggestions.length > 0 || showOther) ? (
              <div className="suggestion-dropdown">
                {suggestions.map(([key, label]) => (
                  <button className="suggestion-option" key={key} onMouseDown={(e) => e.preventDefault()} onClick={() => chooseProfession(key, label)}>
                    <span style={{ fontWeight: 900 }}>{label}</span>
                    <span className="caption muted">Select</span>
                  </button>
                ))}
                {showOther ? (
                  <button className="suggestion-option" onMouseDown={(e) => e.preventDefault()} onClick={chooseOther}>
                    <span style={{ fontWeight: 900 }}>Other: "{query.trim()}"</span>
                    <span className="caption muted">Add custom</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {addingCustom ? (
            <Field label="Add your field" value={customField} onChange={updateCustomField} placeholder="e.g. AI Automation Specialist" />
          ) : null}

          <div className="stack" style={{ gap: 10 }}>
            <p className="label">Recommended fields</p>
            <div className="recommendation-row">
              {popularFields.map((label) => {
                const item = professions.find((p) => p[1] === label);
                return (
                  <button key={label} className="recommendation-chip" onClick={() => chooseProfession(item?.[0] ?? label.toLowerCase(), label)}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {profession ? (
            <div className="card row between" style={{ borderColor: 'var(--primary)' }}>
              <div>
                <p className="caption muted">Selected field</p>
                <h2 className="subtitle">{profession.label}</h2>
              </div>
              <span className="chip">Ready</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {step === 1 ? (
        <div className="stack">
          {[
            ['beginner', 'Beginner', '0-1 years'],
            ['intermediate', 'Intermediate', '1-3 years'],
            ['experienced', 'Experienced', '3+ years'],
          ].map(([idValue, title, label]) => (
            <Choice key={idValue} selected={experience === idValue} onClick={() => setExperience(idValue as Experience)}>
              <span className="subtitle">{title}</span>
              <span className="body muted">{label}</span>
            </Choice>
          ))}
        </div>
      ) : null}
      {step === 2 ? (
        <div className="grid">
          {[
            ['job', 'Get a Job', '▣'],
            ['switch', 'Switch Career', '↗'],
            ['freelance', 'Freelancing', '◌'],
            ['skills', 'Improve Skills', '◇'],
          ].map(([idValue, title, icon]) => (
            <Choice key={idValue} selected={goal === idValue} onClick={() => setGoal(idValue as Goal)} tall>
              <span className="icon-box">{icon}</span>
              <span className="subtitle">{title}</span>
            </Choice>
          ))}
        </div>
      ) : null}
      {step === 3 ? (
        <div className="stack">
          {suggestedLanguages.map((lang) => (
            <Choice key={lang} selected={language === lang} onClick={() => setLanguage(lang)}>
              <span className="subtitle">{lang}</span>
              {language === lang ? <span className="chip">Selected</span> : null}
            </Choice>
          ))}
        </div>
      ) : null}
      <div className="row">
        <Button variant="secondary" onClick={() => (step === 0 ? setView('login') : setStep((s) => s - 1))}>Back</Button>
        <Button onClick={next} disabled={!canContinue} style={{ flex: 1 }}>{step === 3 ? 'Get Started' : 'Continue'}</Button>
      </div>
        </div>
      </div>
    </section>
  );
}

function Home({ user, profile, metrics, usage, setView, setUsage }: CommonProps) {
  const profileCompletion = Math.round(
    ([profile.avatarUrl, profile.professionLabel, profile.professionalProfile.bio, profile.skills.length, profile.tools.length, profile.projects.length].filter(Boolean).length / 6) * 100
  );
  const completedProfileItems = Math.round((profileCompletion / 100) * 6);
  const remainingProfileItems = Math.max(0, 6 - completedProfileItems);
  const motivation = useMemo(() => {
    return MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length];
  }, []);
  const [motivationIndex, setMotivationIndex] = useState(() =>
    MOTIVATIONAL_QUOTES.indexOf(motivation)
  );
  const activeMotivation = MOTIVATIONAL_QUOTES[Math.max(0, motivationIndex)] ?? motivation;
  const projectRecommendations = useMemo(() => generateProjectRecommendations(profile, metrics), [profile, metrics]);
  const [selectedProject, setSelectedProject] = useState<ProjectRecommendation | null>(null);
  const [projectMessages, setProjectMessages] = useState<ProjectChatMessage[]>([]);
  const [projectQuestion, setProjectQuestion] = useState('');
  useEffect(() => {
    const interval = window.setInterval(() => {
      setMotivationIndex((current) => (current + 1) % MOTIVATIONAL_QUOTES.length);
    }, 6000);
    return () => window.clearInterval(interval);
  }, []);

  function openProject(project: ProjectRecommendation) {
    setSelectedProject(project);
    setProjectQuestion('');
    setProjectMessages([
      {
        id: id(),
        role: 'assistant',
        content: initialProjectMessage(project, profile),
      },
    ]);
  }

  function askProjectQuestion() {
    if (!selectedProject || !projectQuestion.trim()) return;
    const question = projectQuestion.trim();
    setProjectMessages((current) => [
      ...current,
      { id: id(), role: 'user', content: question },
      { id: id(), role: 'assistant', content: buildProjectAnswer(selectedProject, profile, question) },
    ]);
    setProjectQuestion('');
  }

  const recommended = [
    { title: 'Frontend Developer', detail: 'Practice React, UI systems, and portfolio storytelling.' },
    { title: 'Data Analyst', detail: 'Sharpen SQL, dashboards, stakeholder communication, and metrics.' },
    { title: 'Product Manager', detail: 'Prepare product sense, prioritization, and launch examples.' },
  ];
  const nextSteps = [
    profileCompletion < 60 ? 'Complete your professional profile' : 'Refresh your profile with recent wins',
    metrics.lastCvScore == null ? 'Upload and analyze your CV' : 'Improve your CV based on the latest analysis',
    metrics.lastInterviewScore == null ? 'Start a mock interview' : 'Retake interview practice for a higher score',
  ];
  const dashboardName = profile.professionalProfile.fullName || displayNameFor(user);
  const dashboardTitle = profile.professionalProfile.currentDesignation || profile.professionLabel || profile.professionalProfile.headline || 'Career profile';
  const nextStepActions: Array<{ label: string; action: () => void }> = [
    { label: nextSteps[0], action: () => setView('professional-profile') },
    { label: nextSteps[1], action: () => setView(metrics.lastCvScore == null ? 'cv-upload' : 'cv-analysis') },
    { label: nextSteps[2], action: () => setView('interview-session') },
  ];

  return (
    <>
    <section className="screen dashboard-screen">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="row" style={{ minWidth: 0, gap: 16 }}>
            <Avatar profile={profile} user={user} />
            <span className="hero-kicker">AI Career Workspace</span>
          </div>
          <div>
            <p className="body muted">Welcome back,</p>
            <h1 className="dashboard-name">{dashboardName}</h1>
            <p className="dashboard-title">{dashboardTitle}</p>
          </div>
          <p className="body muted" style={{ maxWidth: 620 }}>
            Build a stronger profile, improve your CV, and practice interviews in one focused place.
          </p>
          <div className="dashboard-hero-actions">
            <Button onClick={() => setView('cv-upload')}>Upload CV</Button>
            <Button variant="secondary" onClick={() => setView('interview-session')}>Start Interview</Button>
            <button className="chip" onClick={() => setUsage((u) => ({ ...u, plan: u.plan === 'pro' ? 'free' : 'pro' }))}>
              {usage.plan === 'pro' ? 'Pro Workspace' : 'Free Workspace'}
            </button>
          </div>
        </div>
        <div className="hero-stat-grid" aria-label="Career progress snapshot">
          <div className="soft-stat">
            <span className="label">Profile</span>
            <span className="soft-stat-value">{profileCompletion}%</span>
            <span className="soft-stat-label">Strength score</span>
          </div>
          <div className="soft-stat">
            <span className="label">CV Score</span>
            <span className="soft-stat-value">{metrics.lastCvScore ?? '--'}</span>
            <span className="soft-stat-label">Latest review</span>
          </div>
          <div className="soft-stat">
            <span className="label">Interview</span>
            <span className="soft-stat-value">{metrics.lastInterviewScore ?? '--'}</span>
            <span className="soft-stat-label">Practice score</span>
          </div>
          <div className="soft-stat">
            <span className="label">Quiz</span>
            <span className="soft-stat-value">{metrics.lastQuizScore != null ? `${metrics.lastQuizScore}%` : '--'}</span>
            <span className="soft-stat-label">{metrics.lastQuizLevel ?? 'AI readiness'}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-main stack">
          <button className="dashboard-profile-card" onClick={() => setView('professional-profile')}>
            <div className="row" style={{ gap: 18 }}>
              <Avatar profile={profile} user={user} large />
              <div>
                <h2 className="title">{profile.professionalProfile.fullName || displayNameFor(user)}</h2>
                <p className="subtitle muted">Your Profile</p>
                <p className="body muted">Career snapshot</p>
              </div>
            </div>
            <div className="profile-strength-panel">
              <div className="row between">
                <span className="icon-box" style={{ width: 40, height: 40, borderRadius: 14 }}>✦</span>
                <strong className="profile-percent">{profileCompletion}%</strong>
              </div>
              <h3 className="subtitle">Profile strength</h3>
              <div className="progress"><span style={{ width: `${profileCompletion}%` }} /></div>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                <span className="mini-pill success">{completedProfileItems}/6 done</span>
                <span className="mini-pill warning">{remainingProfileItems} left</span>
              </div>
            </div>
          </button>

          <div className="row between dashboard-section-title">
            <h2 className="title">Quick Actions</h2>
            <p className="body muted">Choose what you want to improve today.</p>
          </div>
          <div className="dashboard-action-grid">
            <Action title="Upload CV" subtitle="Update your resume" icon="⇧" onClick={() => setView('cv-upload')} />
            <Action title="Analyze CV" subtitle="AI-powered review" icon="▤" onClick={() => setView('cv-analysis')} />
            <Action title="Start Interview" subtitle="Practice with AI" icon="◌" onClick={() => setView('interview-session')} />
            <Action title="AI Quiz" subtitle="Check your level" icon="◇" onClick={() => setView('quiz')} />
          </div>

          <div className="project-recommendation-panel card stack">
            <div className="row between dashboard-section-title">
              <div>
                <span className="hero-kicker">Recommended Projects</span>
                <h2 className="title" style={{ marginTop: 10 }}>Build proof for your profile</h2>
              </div>
              <p className="body muted">Personalized from your role, CV score, and skills.</p>
            </div>
            <div className="project-card-grid">
              {projectRecommendations.map((project) => (
                <button className="project-card" key={project.id} onClick={() => openProject(project)} type="button">
                  <div className="row between">
                    <span className="mini-pill">{project.difficulty}</span>
                    <span className="caption muted">{project.timeline}</span>
                  </div>
                  <div>
                    <h3 className="subtitle" style={{ fontSize: 16 }}>{project.title}</h3>
                    <p className="caption muted" style={{ marginTop: 7 }}>{project.summary}</p>
                  </div>
                  <div className="project-skill-row">
                    {project.skills.slice(0, 3).map((skill) => (
                      <span className="project-skill" key={skill}>{skill}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="dashboard-side stack">
          <div className="card stack">
            <span className="hero-kicker">AI Career Coach</span>
            <div>
              <h2 className="title">{profile.professionLabel || 'Career'} readiness</h2>
              <p className="body muted" style={{ marginTop: 8 }}>
                Track your profile, CV, interview, and quiz progress from one focused dashboard.
              </p>
            </div>
            <div className="coach-action-list">
              {nextStepActions.map((step) => (
                <button key={step.label} className="coach-action" onClick={step.action}>
                  <span>{step.label}</span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card stack motivation-card">
            <div className="row between">
              <span className="hero-kicker">Daily Motivation</span>
              <button
                className="button ghost"
                onClick={() =>
                  setMotivationIndex((current) => (current + 1) % MOTIVATIONAL_QUOTES.length)
                }>
                New quote
              </button>
            </div>
            <QuoteSlider quote={activeMotivation} quoteKey={motivationIndex} className="motivation-quote" />
            <p className="caption muted">Tap New quote whenever you need a quick career push.</p>
          </div>

          <div className="card row" style={{ background: 'var(--elevated)', borderColor: 'var(--glow)' }}>
            <div className="icon-box">✦</div>
            <div>
              <h2 className="subtitle">Today’s focus</h2>
              <p className="body muted">Pick one profile, CV, or interview action and finish it fully.</p>
            </div>
          </div>

          <div className="card stack">
            <div>
              <h2 className="subtitle">Suggested categories</h2>
              <p className="body muted">Explore popular paths if you are still refining your direction.</p>
            </div>
            {recommended.map((item) => (
              <div className="suggestion-card" key={item.title}>
                <h3 className="subtitle" style={{ fontSize: 16 }}>{item.title}</h3>
                <p className="caption muted" style={{ marginTop: 6 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

    </section>
    {selectedProject ? (
      <ProjectDetailModal
        project={selectedProject}
        profile={profile}
        messages={projectMessages}
        question={projectQuestion}
        setQuestion={setProjectQuestion}
        onAsk={askProjectQuestion}
        onClose={() => setSelectedProject(null)}
      />
    ) : null}
    </>
  );
}

function ProjectDetailModal({
  project,
  profile,
  messages,
  question,
  setQuestion,
  onAsk,
  onClose,
}: {
  project: ProjectRecommendation;
  profile: ProfileState;
  messages: ProjectChatMessage[];
  question: string;
  setQuestion: (value: string) => void;
  onAsk: () => void;
  onClose: () => void;
}) {
  const role = profile.professionLabel || profile.professionalProfile.currentDesignation || 'your target role';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal project-modal stack" onClick={(event) => event.stopPropagation()}>
        <div className="row between">
          <div>
            <span className="hero-kicker">Project Coach</span>
            <h2 className="title" style={{ marginTop: 10 }}>{project.title}</h2>
            <p className="body muted" style={{ marginTop: 8 }}>{project.summary}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="project-modal-layout">
          <div className="stack">
            <section className="project-section">
              <h3 className="subtitle">Why this fits you</h3>
              <p className="body muted">{project.why}</p>
            </section>
            <ProjectBullets title="Core features" items={project.features} />
            <ProjectBullets title="Suggested stack" items={project.stack} />
            <ProjectBullets title="Portfolio tips" items={project.portfolioTips} />
            <ProjectBullets title="Interview talking points" items={project.interviewTalkingPoints} />
          </div>

          <aside className="project-chat-panel">
            <div>
              <h3 className="subtitle">Ask about this project</h3>
              <p className="caption muted" style={{ marginTop: 6 }}>Ask about scope, stack, README, GitHub, timeline, or interview explanation.</p>
            </div>
            <div className="project-chat-list">
              {messages.map((message) => (
                <div className={`project-chat-message ${message.role}`} key={message.id}>
                  <span className="message-label">{message.role === 'assistant' ? 'AiCoche' : 'You'}</span>
                  <p className="body">{message.content}</p>
                </div>
              ))}
            </div>
            <div className="project-chat-input">
              <textarea
                className="input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    onAsk();
                  }
                }}
                placeholder="Ask: How should I build this?"
              />
              <Button onClick={onAsk} disabled={!question.trim()}>Ask</Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProjectBullets({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="project-section">
      <h3 className="subtitle">{title}</h3>
      <div className="project-bullet-list">
        {items.map((item) => (
          <span className="project-skill" key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function InterviewTab({ profile, usage, setUsage, reminders, setReminders, interviewSessions, setSelectedInterviewSessionId, setView }: CommonProps) {
  const now = Date.now();
  const reminderList = normalizeReminders(reminders);
  const upcoming = reminderList.filter((r) => new Date(r.scheduledAt).getTime() > now);
  const ready = reminderList.filter((r) => new Date(r.scheduledAt).getTime() <= now);
  const progress = Math.min(100, (usage.chatsUsed / FREE_CHAT_LIMIT) * 100);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  function schedule(minutes: number) {
    setReminders((current) => [
      {
        id: id(),
        title: `${profile.professionLabel || 'Career'} mock interview practice`,
        scheduledAt: new Date(Date.now() + minutes * 60000).toISOString(),
        createdAt: new Date().toISOString(),
      },
      ...normalizeReminders(current),
    ]);
    setScheduleOpen(false);
  }

  return (
    <section className="screen stack">
      <div>
        <h1 className="display">Mock Interviews</h1>
        <p className="body muted">Practice with AI and improve your skills</p>
      </div>
      <button className="hero-card row" onClick={() => setView('interview-session')} style={{ textAlign: 'left', cursor: 'pointer' }}>
        <div className="icon-box" style={{ color: 'white' }}>◌</div>
        <div>
          <h2 className="subtitle">Start New Interview</h2>
          <p className="body muted">AI-powered {profile.professionLabel || 'career'} interview</p>
        </div>
      </button>
      <div className="card row between">
        <div className="row">
          <div className="icon-box" style={{ color: 'var(--gold)', background: 'var(--warning-tint)' }}>⏰</div>
          <div>
            <h2 className="subtitle">Schedule practice</h2>
            <p className="body muted">Add a new interview card and get reminded when it is time.</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => setScheduleOpen(true)}>Add new</Button>
      </div>
      {upcoming.length ? <h2 className="title">Scheduled Chats</h2> : null}
      {[...upcoming, ...ready].map((r) => (
        <div key={r.id} className="card row between">
          <div>
            <h3 className="subtitle">{new Date(r.scheduledAt).getTime() <= now ? 'Interview chat ready' : r.title}</h3>
            <p className="body muted">{new Date(r.scheduledAt).toLocaleString()}</p>
          </div>
          <button className="button ghost" onClick={() => setReminders((items) => normalizeReminders(items).filter((x) => x.id !== r.id))}>Delete</button>
        </div>
      ))}
      <div className="row between">
        <p className="body muted">Interviews used this month</p>
        <b>{usage.chatsUsed} / {FREE_CHAT_LIMIT}</b>
      </div>
      <div className="progress"><span style={{ width: `${progress}%` }} /></div>
      <h2 className="title">Past Sessions</h2>
      {interviewSessions.length ? (
        <div className="session-list">
          {interviewSessions.map((session) => (
            <button
              key={session.id}
              className="session-card"
              onClick={() => {
                setSelectedInterviewSessionId(session.id);
                setView('interview-history');
              }}
              type="button">
              <div>
                <h3 className="subtitle">{session.title}</h3>
                <p className="body muted">
                  {new Date(session.updatedAt).toLocaleString()} · {session.turnCount} {session.turnCount === 1 ? 'answer' : 'answers'} · {session.status === 'completed' ? 'Completed' : 'In progress'}
                </p>
              </div>
              <span className="row" style={{ gap: 8 }}>
                {session.score != null ? <span className="chip success">Score {session.score}/10</span> : <span className="chip">No score yet</span>}
                <span className="chip">{usage.plan === 'pro' ? 'View / continue' : 'View only'}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Empty message="No interview sessions yet. Start your first interview to see progress here." />
      )}
      {scheduleOpen ? (
        <Modal onClose={() => setScheduleOpen(false)} title="Schedule practice">
          <p className="body muted">Choose when AiCoche should remind you to start your mock interview.</p>
          <div className="grid">
            {[15, 30, 60, 1440].map((m) => <Button key={m} variant="secondary" onClick={() => schedule(m)}>{m === 1440 ? 'Tomorrow morning' : `In ${m} min`}</Button>)}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function Quiz({ profile, metrics, setMetrics }: CommonProps) {
  const questions = useMemo(() => buildQuiz(profile), [profile]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; level: string } | null>(null);
  const current = questions[currentIndex];

  function submit() {
    if (selectedIndex == null) return;
    const nextAnswers = [...answers, selectedIndex];
    if (currentIndex + 1 < questions.length) {
      setAnswers(nextAnswers);
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      return;
    }
    const correct = nextAnswers.reduce((sum, answer, index) => sum + (answer === questions[index].correctIndex ? 1 : 0), 0);
    const score = Math.round((correct / questions.length) * 100);
    const level = quizLevel(score);
    setAnswers(nextAnswers);
    setResult({ score, level });
    setMetrics((m) => ({ ...m, lastQuizScore: score, lastQuizLevel: level }));
  }

  if (result) {
    return (
      <section className="screen stack">
        <div>
          <h1 className="display">AI Quiz</h1>
          <p className="body muted">Your personalized skill level is ready.</p>
        </div>
        <div className="card stack" style={{ textAlign: 'center' }}>
          <div className="icon-box" style={{ margin: '0 auto', background: 'var(--primary)', color: 'white' }}>🏆</div>
          <h2 className="display" style={{ color: 'var(--gold)' }}>{result.score}%</h2>
          <p className="title">{result.level} Level</p>
          <p className="body muted">This score is now shown on your dashboard.</p>
        </div>
        <h2 className="title">AI Feedback</h2>
        {questions.map((q, index) => (
          <div className="card" key={q.question}>
            <h3 className="subtitle">Question {index + 1}</h3>
            <p className="body muted">{q.explanation}</p>
          </div>
        ))}
        <Button onClick={() => { setCurrentIndex(0); setSelectedIndex(null); setAnswers([]); setResult(null); }}>Retake AI Quiz</Button>
      </section>
    );
  }

  return (
    <section className="screen stack">
      <div>
        <h1 className="display">AI Quiz</h1>
        <p className="body muted">Personalized for your profile and background.</p>
      </div>
      <div className="grid">
        <div className="card"><p className="caption muted">Profile</p><h2 className="subtitle">{profile.professionLabel || 'Profession not set'}</h2></div>
        <div className="card"><p className="caption muted">Last Level</p><h2 className="subtitle">{metrics.lastQuizScore != null ? `${metrics.lastQuizLevel} ${metrics.lastQuizScore}%` : 'Not taken'}</h2></div>
      </div>
      <div className="card stack">
        <div className="row between"><span className="chip">AI Question</span><span className="caption muted">{currentIndex + 1} / {questions.length}</span></div>
        <h2 className="title">{current.question}</h2>
        {current.options.map((option, index) => (
          <Choice key={option} selected={selectedIndex === index} onClick={() => setSelectedIndex(index)}>
            <span className="body" style={{ fontWeight: 800 }}>{option}</span>
          </Choice>
        ))}
        <Button onClick={submit} disabled={selectedIndex == null}>{currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}</Button>
      </div>
    </section>
  );
}

function Profile({ user, profile, setProfile, usage, setUsage, setError, onSignOut }: CommonProps & { onSignOut: () => void }) {
  const [modal, setModal] = useState<'skill' | 'tool' | 'project' | null>(null);
  const [draft, setDraft] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    fullName: profile.professionalProfile.fullName || displayNameFor(user),
    professionLabel: profile.professionLabel,
    language: profile.language,
  });

  function addItem() {
    if (!modal || !draft.trim()) return;
    const key = modal === 'skill' ? 'skills' : modal === 'tool' ? 'tools' : 'projects';
    setProfile((p) => ({ ...p, [key]: Array.from(new Set([...p[key], draft.trim()])) }));
    setDraft('');
    setModal(null);
  }

  function saveProfileDetails() {
    setProfile((p) => {
      const next = {
        ...p,
        professionLabel: profileDraft.professionLabel,
        language: profileDraft.language || 'English',
        professionalProfile: {
          ...p.professionalProfile,
          fullName: profileDraft.fullName,
          headline: profileDraft.professionLabel || p.professionalProfile.headline,
          currentDesignation: profileDraft.professionLabel || p.professionalProfile.currentDesignation,
          source: 'manual' as const,
          updatedAt: new Date().toISOString(),
        },
      };
      void saveProfileSnapshot(next, user).catch((error) => {
        setError(error instanceof Error ? error.message : 'Could not save profile.');
      });
      return next;
    });
    setEditOpen(false);
  }

  return (
    <section className="screen stack">
      <div className="row between">
        <h1 className="display">Profile</h1>
        <Button variant="ghost" onClick={onSignOut}>Sign out</Button>
      </div>
      <div className="card row between">
        <div className="row">
          <AvatarUploader user={user} profile={profile} setProfile={setProfile} setError={setError} large />
          <div>
            <h2 className="title">{profile.professionalProfile.fullName || displayNameFor(user)}</h2>
            <p className="body muted">{user?.email || 'No email'}</p>
            <span className="chip">{profile.professionLabel || profile.professionalProfile.currentDesignation || 'Profession not set'}</span>
          </div>
        </div>
        <Button variant="ghost" onClick={() => setEditOpen(true)}>Edit</Button>
      </div>
      <div className="card stack">
        <Info label="Experience" value={labelExperience(profile.experience)} />
        <Info label="Career Goal" value={labelGoal(profile.goal)} />
        <Info label="Language" value={profile.language || 'English'} />
      </div>
      <div className="card row between">
        <div>
          <h2 className="subtitle">{usage.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</h2>
          <p className="body muted">Limited to 10 interviews and 1 CV analysis</p>
        </div>
        <Button onClick={() => setUsage((u) => ({ ...u, plan: 'pro' }))}>Upgrade to Pro</Button>
      </div>
      <EditableSection title="Skills" items={profile.skills} onAdd={() => setModal('skill')} />
      <EditableSection title="Tools" items={profile.tools} onAdd={() => setModal('tool')} />
      <EditableSection title="Projects" items={profile.projects} onAdd={() => setModal('project')} />
      <h2 className="title">Usage</h2>
      <div className="card stack">
        <Info label="CV Analyses" value={`${usage.cvAnalysesUsed}/${FREE_CV_LIMIT}`} />
        <Info label="Interviews" value={`${usage.chatsUsed}/${FREE_CHAT_LIMIT}`} />
      </div>
      {modal ? (
        <Modal title={`Add ${modal}`} onClose={() => setModal(null)}>
          <Field label="Name" value={draft} onChange={setDraft} />
          <Button onClick={addItem}>Save</Button>
        </Modal>
      ) : null}
      {editOpen ? (
        <Modal title="Edit profile" onClose={() => setEditOpen(false)}>
          <Field label="Full name" value={profileDraft.fullName} onChange={(fullName) => setProfileDraft((d) => ({ ...d, fullName }))} />
          <Field label="Profession" value={profileDraft.professionLabel} onChange={(professionLabel) => setProfileDraft((d) => ({ ...d, professionLabel }))} />
          <Field label="Preferred language" value={profileDraft.language} onChange={(language) => setProfileDraft((d) => ({ ...d, language }))} />
          <Button onClick={saveProfileDetails}>Save changes</Button>
        </Modal>
      ) : null}
    </section>
  );
}

function Settings({ theme, setTheme, onSignOut, setView }: { theme: Theme; setTheme: (t: Theme) => void; onSignOut: () => void; setView: (view: View) => void }) {
  const [notifications, setNotifications] = useState(true);
  return (
    <section className="screen stack">
      <div>
        <h1 className="display">Settings</h1>
        <p className="body muted">Manage your experience, privacy, and account.</p>
      </div>
      <SettingsGroup title="Preferences">
        <SettingsRow label="Notifications" value={notifications} onToggle={setNotifications} />
        <SettingsRow label="Appearance" value={theme === 'dark'} onToggle={(enabled) => setTheme(enabled ? 'dark' : 'light')} />
        <SettingsRow label="Calendar Settings" onClick={() => alert('Calendar integrations are coming soon.')} />
      </SettingsGroup>
      <SettingsGroup title="Account">
        <SettingsRow label="Privacy & Security" onClick={() => setView('privacy-security')} />
        <SettingsRow label="Privacy Policy" onClick={() => setView('privacy-policy')} />
        <SettingsRow label="Help & Support" onClick={() => setView('help-support')} />
        <SettingsRow label="Sign Out" danger onClick={onSignOut} />
        <SettingsRow label="Delete Account" danger onClick={() => alert('Account deletion needs a secure backend endpoint before it can permanently remove your Supabase user.')} />
      </SettingsGroup>
    </section>
  );
}

function CvUpload({ metrics, setMetrics, setView, setError, setBusy, busy }: CommonProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      let cvDocumentId: string | null = null;
      let status = 'uploaded locally';
      let text = '';
      if (hasSupabase && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.access_token) throw new Error('Please sign in again before uploading a CV.');
        const form = new FormData();
        form.append('file', file);
        const response = await fetch(`${supabaseUrl}/functions/v1/upload-cv`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            apikey: supabaseAnonKey,
          },
          body: form,
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json() as { cvDocument?: { id: string; status?: string; file_name?: string }; extractedText?: string };
        cvDocumentId = data.cvDocument?.id ?? null;
        status = data.cvDocument?.status ?? 'uploaded';
        text = data.extractedText ?? '';
      } else {
        text = await file.text().catch(() => '');
      }
      setMetrics((m) => ({
        ...m,
        lastCvDocumentId: cvDocumentId,
        lastCvStatus: status,
        lastCvFileName: file.name,
        lastCvText: text,
        lastAnalysis: null,
        lastCvScore: null,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload CV.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen narrow stack">
      <Header title="Upload CV" onBack={() => setView('home')} />
      <p className="body muted">Select a PDF, DOC, or DOCX. The file will be stored in Supabase when configured and linked to your account.</p>
      <button className="dropzone" onClick={() => fileRef.current?.click()} disabled={busy}>
        <input ref={fileRef} className="hidden-file" type="file" accept=".pdf,.doc,.docx" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
        <div className="icon-box" style={{ margin: '0 auto 12px' }}>▤</div>
        <h2 className="subtitle">{busy ? 'Uploading CV...' : 'Tap to choose CV'}</h2>
        <p className="caption muted">Supported formats: PDF, DOC, DOCX</p>
      </button>
      {metrics.lastCvFileName ? <div className="card row between"><span>{metrics.lastCvFileName}</span><Button variant="ghost" onClick={() => fileRef.current?.click()}>Replace</Button></div> : null}
      {metrics.lastCvFileName ? <div className="card row"><span className="chip success">Saved</span><p className="body muted">Status: {metrics.lastCvStatus}</p></div> : null}
      <Button onClick={() => setView('cv-analysis')} disabled={!metrics.lastCvFileName || busy}>Analyze CV</Button>
    </section>
  );
}

function CvAnalysisScreen({ profile, setProfile, metrics, setMetrics, usage, setUsage, setView, setError, busy, setBusy }: CommonProps) {
  const canAnalyze = usage.plan === 'pro' || usage.cvAnalysesUsed < FREE_CV_LIMIT;
  const [result, setResult] = useState<CvAnalysis | null>(metrics.lastAnalysis);

  async function run() {
    if (!metrics.lastCvDocumentId && !metrics.lastCvText && !metrics.lastCvFileName) {
      setError('No uploaded CV available. Upload a CV first.');
      return;
    }
    if (!canAnalyze) {
      setError('CV analysis limit reached. Upgrade to Pro from Profile to continue.');
      return;
    }
    setBusy(true);
    try {
      let data: CvAnalysis;
      if (hasSupabase && supabase) {
        const { data: invokeData, error } = await supabase.functions.invoke<CvAnalysis>('analyze-cv', {
          body: {
            cvText: metrics.lastCvText,
            cvDocumentId: metrics.lastCvDocumentId,
            userProfile: buildUserProfile(profile),
          },
        });
        if (error) throw error;
        data = invokeData ?? mockAnalysis(profile);
      } else {
        await new Promise((r) => setTimeout(r, 650));
        data = mockAnalysis(profile);
      }
      setResult(data);
      setMetrics((m) => ({ ...m, lastAnalysis: data, lastCvScore: data.overallScore }));
      setUsage((u) => ({ ...u, cvAnalysesUsed: u.cvAnalysesUsed + 1 }));
      try {
        const remoteProfile = await fetchRemoteProfile(profile);
        setProfile((current) => remoteProfile ?? applyAnalysisToProfile(current, data, metrics.lastCvText));
      } catch {
        setProfile((current) => applyAnalysisToProfile(current, data, metrics.lastCvText));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!result) void run();
    // run once on open to match the mobile flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="screen stack">
      <Header title="CV analysis" onBack={() => setView('home')} />
      {!busy ? <Button variant="secondary" onClick={() => setView('cv-upload')}>Upload improved CV</Button> : null}
      {busy ? <AnalyzingState /> : result ? (
        <>
          <div className="hero-card stack">
            <div className="row between">
              <div>
                <h2 className="title">Resume readiness</h2>
                <p className="body muted">Structured feedback for strengths, weak points, and next improvements.</p>
              </div>
              {result.overallScore != null ? <span className="chip success">{result.overallScore} score</span> : null}
            </div>
            {result.overallScore != null ? <div className="progress"><span style={{ width: `${result.overallScore}%` }} /></div> : null}
          </div>
          <AnalysisSection title="Strengths" items={result.strengths} tone="success" />
          <AnalysisSection title="Weaknesses" items={result.weaknesses} tone="error" />
          <AnalysisSection title="How to improve" items={result.suggestions} tone="primary" numbered />
          <div className="card stack">
            <h2 className="subtitle">Skills to add</h2>
            <div className="row" style={{ flexWrap: 'wrap' }}>{result.missingSkills.map((skill) => <span key={skill} className="chip">{skill}</span>)}</div>
          </div>
          <div className="row"><Button variant="secondary" onClick={run}>Retry analysis</Button><Button onClick={() => setView('professional-profile')}>Improve Profile</Button></div>
        </>
      ) : <Empty message="No analysis yet." />}
    </section>
  );
}

function InterviewSession({ profile, metrics, setMetrics, usage, setUsage, setInterviewSessions, setView, setError }: CommonProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const canStart = usage.plan === 'pro' || usage.chatsUsed < FREE_CHAT_LIMIT;
  const sessionTitle = `${profile.professionLabel || 'Career'} mock interview`;

  function saveSessionHistory(partial: Partial<InterviewHistoryItem> & { id: string; messages: Message[] }) {
    const now = new Date().toISOString();
    const item: InterviewHistoryItem = {
      id: partial.id,
      title: partial.title ?? sessionTitle,
      status: partial.status ?? 'active',
      score: partial.score ?? null,
      turnCount: partial.turnCount ?? partial.messages.filter((message) => message.role === 'user').length,
      messages: partial.messages,
      createdAt: partial.createdAt ?? now,
      updatedAt: partial.updatedAt ?? now,
    };
    setInterviewSessions((current) => upsertInterviewHistory(current, item));
  }

  useEffect(() => {
    async function start() {
      if (!canStart) {
        setError('Free plan interview limit reached. Upgrade to Pro from Profile to continue.');
        setView('interview');
        return;
      }
      setTyping(true);
      try {
        let response: { sessionId: string; question: string };
        if (hasSupabase && supabase) {
          const { data, error } = await supabase.functions.invoke<{ sessionId: string; question: string }>('start-interview', {
            body: { profile: buildUserProfile(profile) },
          });
          if (error) throw error;
          response = normalizeStartInterviewResponse(data, profile);
        } else {
          response = mockStart(profile);
        }
        setSessionId(response.sessionId);
        const initialMessages: Message[] = [{ id: id(), role: 'assistant', content: response.question }];
        setMessages(initialMessages);
        saveSessionHistory({ id: response.sessionId, title: sessionTitle, messages: initialMessages, status: 'active' });
        setUsage((u) => ({ ...u, chatsUsed: u.chatsUsed + 1 }));
      } catch (e) {
        const fallback = mockStart(profile);
        setSessionId(fallback.sessionId);
        const initialMessages: Message[] = [{ id: id(), role: 'assistant', content: fallback.question }];
        setMessages(initialMessages);
        saveSessionHistory({ id: fallback.sessionId, title: sessionTitle, messages: initialMessages, status: 'active' });
        setUsage((u) => ({ ...u, cvAnalysesUsed: u.cvAnalysesUsed, chatsUsed: u.chatsUsed + 1 }));
        setError(e instanceof Error ? `Using offline interview mode: ${e.message}` : 'Using offline interview mode.');
      } finally {
        setTyping(false);
      }
    }
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  async function send() {
    const answer = input.trim();
    if (!answer || typing) return;
    const userMessage: Message = { id: id(), role: 'user', content: answer };
    const answeredMessages = [...messages, userMessage];
    setInput('');
    setMessages(answeredMessages);
    setTyping(true);
    try {
      let response: { feedback: string; score: number; nextQuestion: string | null; finished: boolean };
      if (hasSupabase && supabase && sessionId) {
        const { data, error } = await supabase.functions.invoke<typeof response>('continue-interview', {
          body: { sessionId, answer },
        });
        if (error) throw error;
        response = normalizeContinueInterviewResponse(data, messages.length);
      } else {
        await new Promise((r) => setTimeout(r, 600));
        response = mockContinue(messages.length);
      }
      setMetrics((m) => ({ ...m, lastInterviewScore: response.score }));
      const nextMessages: Message[] = [
        ...answeredMessages,
        { id: id(), role: 'assistant', content: response.feedback, score: response.score },
        ...(response.nextQuestion ? [{ id: id(), role: 'assistant' as const, content: response.nextQuestion }] : [{ id: id(), role: 'assistant' as const, content: 'That completes this mock interview. Great work!' }]),
      ];
      const status = response.finished ? 'completed' : 'active';
      setMessages(nextMessages);
      saveSessionHistory({
        id: sessionId || id(),
        title: sessionTitle,
        messages: nextMessages,
        status,
        score: response.score,
        turnCount: answeredMessages.filter((message) => message.role === 'user').length,
      });
      if (hasSupabase && supabase && sessionId) {
        void supabase.functions.invoke('save-interview-session', {
          body: {
            sessionId,
            title: sessionTitle,
            profile: buildUserProfile(profile),
            messages: nextMessages.map((message) => ({ role: message.role, content: message.content, score: message.score })),
            status,
            score: response.score * 10,
            feedback: { latestScore: response.score },
          },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setTyping(false);
    }
  }

  return (
    <section className="screen interview-screen">
      <div className="interview-topbar">
        <Header title="Mock interview" onBack={() => setView('interview')} />
        {usage.plan === 'free' ? <span className="mini-pill">Free chats {usage.chatsUsed} / {FREE_CHAT_LIMIT}</span> : null}
      </div>

      <div className="interview-chat-card">
        <div className="interview-chat-header">
          <div>
            <p className="caption muted">AI interview coach</p>
            <h2 className="subtitle">{profile.professionLabel || 'Career'} practice session</h2>
          </div>
          <span className={`chat-status ${typing ? 'active' : ''}`}>{typing ? 'Typing...' : 'Live'}</span>
        </div>

        <div className="chat-scroll" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`chat-row ${message.role === 'user' ? 'from-user' : 'from-ai'}`}>
              <div className="chat-avatar">{message.role === 'user' ? 'You' : 'AI'}</div>
              <div className="message">
                <span className="message-label">{message.role === 'user' ? 'Your answer' : 'AiCoche'}</span>
                <p className="body">{message.content}</p>
                {message.score != null ? <span className="chip success">Score {message.score}</span> : null}
              </div>
            </div>
          ))}
          {typing ? (
            <div className="chat-row from-ai">
              <div className="chat-avatar">AI</div>
              <div className="message typing-bubble" aria-label="AiCoche is typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-composer">
          <textarea
            className="input chat-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button onClick={send} disabled={!input.trim() || typing}>Send</Button>
          <button className="button ghost chat-end-button" onClick={() => setView('interview')}>End session</button>
        </div>
      </div>
    </section>
  );
}

function InterviewHistorySession({ profile, metrics, setMetrics, usage, interviewSessions, setInterviewSessions, selectedInterviewSessionId, setView, setError }: CommonProps) {
  const selected = interviewSessions.find((session) => session.id === selectedInterviewSessionId) ?? null;
  const [messages, setMessages] = useState<Message[]>(selected?.messages ?? []);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const canContinue = usage.plan === 'pro';

  useEffect(() => {
    setMessages(selected?.messages ?? []);
  }, [selected?.id, selected?.messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  if (!selected) {
    return (
      <section className="screen stack">
        <Header title="Past interview" onBack={() => setView('interview')} />
        <Empty message="This interview session is not available anymore." />
      </section>
    );
  }
  const session = selected;

  function saveHistory(nextMessages: Message[], response?: { score: number; finished: boolean }) {
    const nextSession: InterviewHistoryItem = {
      ...session,
      messages: nextMessages,
      status: response?.finished ? 'completed' : 'active',
      score: response ? response.score : session.score,
      turnCount: nextMessages.filter((message) => message.role === 'user').length,
      updatedAt: new Date().toISOString(),
    };
    setInterviewSessions((current) => upsertInterviewHistory(current, nextSession));
  }

  async function send() {
    const answer = input.trim();
    if (!answer || typing || !canContinue) return;
    const userMessage: Message = { id: id(), role: 'user', content: answer };
    const answeredMessages = [...messages, userMessage];
    setInput('');
    setMessages(answeredMessages);
    setTyping(true);
    try {
      let response: { feedback: string; score: number; nextQuestion: string | null; finished: boolean };
      if (hasSupabase && supabase && !session.id.startsWith('mock-session')) {
        const { data, error } = await supabase.functions.invoke<typeof response>('continue-interview', {
          body: { sessionId: session.id, answer },
        });
        if (error) throw error;
        response = normalizeContinueInterviewResponse(data, messages.length);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
        response = mockContinue(messages.length);
      }

      setMetrics((current) => ({ ...current, lastInterviewScore: response.score }));
      const nextMessages: Message[] = [
        ...answeredMessages,
        { id: id(), role: 'assistant', content: response.feedback, score: response.score },
        ...(response.nextQuestion
          ? [{ id: id(), role: 'assistant' as const, content: response.nextQuestion }]
          : [{ id: id(), role: 'assistant' as const, content: 'That completes this mock interview. Great work!' }]),
      ];
      setMessages(nextMessages);
      saveHistory(nextMessages, response);

      if (hasSupabase && supabase && !session.id.startsWith('mock-session')) {
        void supabase.functions.invoke('save-interview-session', {
          body: {
            sessionId: session.id,
            title: session.title,
            profile: buildUserProfile(profile),
            messages: nextMessages.map((message) => ({ role: message.role, content: message.content, score: message.score })),
            status: response.finished ? 'completed' : 'active',
            score: response.score * 10,
            feedback: { latestScore: response.score },
          },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not continue this interview.');
    } finally {
      setTyping(false);
    }
  }

  return (
    <section className="screen interview-screen">
      <div className="interview-topbar">
        <Header title="Past interview" onBack={() => setView('interview')} />
        <span className="mini-pill">{canContinue ? 'Pro: continue enabled' : 'Free: view only'}</span>
      </div>

      <div className="interview-chat-card">
        <div className="interview-chat-header">
          <div>
            <p className="caption muted">{new Date(session.updatedAt).toLocaleString()}</p>
            <h2 className="subtitle">{session.title}</h2>
          </div>
          {session.score != null ? <span className="chip success">Score {session.score}/10</span> : <span className="chip">No score yet</span>}
        </div>

        <div className="chat-scroll" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`chat-row ${message.role === 'user' ? 'from-user' : 'from-ai'}`}>
              <div className="chat-avatar">{message.role === 'user' ? 'You' : 'AI'}</div>
              <div className="message">
                <span className="message-label">{message.role === 'user' ? 'Your answer' : 'AiCoche'}</span>
                <p className="body">{message.content}</p>
                {message.score != null ? <span className="chip success">Score {message.score}</span> : null}
              </div>
            </div>
          ))}
          {typing ? (
            <div className="chat-row from-ai">
              <div className="chat-avatar">AI</div>
              <div className="message typing-bubble" aria-label="AiCoche is typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        {canContinue ? (
          <div className="chat-composer">
            <textarea
              className="input chat-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Continue this interview..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button onClick={send} disabled={!input.trim() || typing}>Send</Button>
            <button className="button ghost chat-end-button" onClick={() => setView('interview')}>Back</button>
          </div>
        ) : (
          <div className="chat-readonly-footer">
            <p className="body muted">Free plan can view previous chats only. Upgrade to Pro to continue this chat.</p>
            <button className="button ghost" onClick={() => setView('interview')}>Back to sessions</button>
          </div>
        )}
      </div>
    </section>
  );
}

function ProfessionalProfileScreen({ user, profile, setProfile, setView, setError }: CommonProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.professionalProfile);
  const visibleName = profile.professionalProfile.fullName || displayNameFor(user);
  const visibleHeadline = profile.professionalProfile.headline || profile.professionLabel || 'Add your headline';
  const currentDraftExperience = currentExperienceFrom(draft);

  function save() {
    setProfile((p) => {
      const next = {
        ...p,
        professionalProfile: { ...draft, source: 'manual' as const, updatedAt: new Date().toISOString() },
      };
      void saveProfileSnapshot(next, user).catch((error) => {
        setError(error instanceof Error ? error.message : 'Could not save profile.');
      });
      return next;
    });
    setEditing(false);
  }

  return (
    <section className="screen stack professional-profile-screen">
      <Header title="Your Profile" subtitle="Professional profile" onBack={() => setView('home')} right={<Button variant="ghost" onClick={() => setEditing((e) => !e)}>{editing ? 'Cancel' : 'Edit'}</Button>} />
      <div className="hero-card profile-hero stack">
        <Avatar profile={profile} user={user} large />
        {editing ? (
          <div className="profile-edit-fields">
            <Field label="Full name" value={draft.fullName} onChange={(fullName) => setDraft((d) => ({ ...d, fullName }))} />
            <Field label="Headline / designation" value={draft.headline} onChange={(headline) => setDraft((d) => ({ ...d, headline }))} />
            <Field label="Location" value={draft.location} onChange={(location) => setDraft((d) => ({ ...d, location }))} />
            <Field label="Email" value={draft.email} onChange={(email) => setDraft((d) => ({ ...d, email }))} />
            <Field label="Phone" value={draft.phone} onChange={(phone) => setDraft((d) => ({ ...d, phone }))} />
          </div>
        ) : (
          <>
            <h1 className="title">{visibleName}</h1>
            <p className="body muted">{visibleHeadline}</p>
            <span className="chip">{profile.professionalProfile.source === 'resume' ? 'Auto-filled from CV' : 'Editable profile'}</span>
          </>
        )}
      </div>
      <ProfileCard title="Professional Summary" editing={editing}>
        {editing ? <Field label="Bio / summary" value={draft.bio} onChange={(bio) => setDraft((d) => ({ ...d, bio }))} multiline /> : <p className="body muted">{profile.professionalProfile.bio || 'No professional summary added yet.'}</p>}
      </ProfileCard>
      <ProfileCard title="Current Employment" editing={editing}>
        {editing ? (
          <>
            <Field label="Current company" value={draft.currentCompany} onChange={(currentCompany) => setDraft((d) => {
              const next = { ...d, currentCompany };
              return { ...next, experiences: updateCurrentExperience(next, { company: currentCompany }) };
            })} />
            <Field label="Current designation" value={draft.currentDesignation} onChange={(currentDesignation) => setDraft((d) => {
              const next = { ...d, currentDesignation };
              return { ...next, experiences: updateCurrentExperience(next, { title: currentDesignation }) };
            })} />
            <Field label="Employment status" value={draft.employmentStatus} onChange={(employmentStatus) => setDraft((d) => ({ ...d, employmentStatus }))} />
            <Field label="Current date range" value={currentDraftExperience.dates} placeholder="2024-08-01 - Present" onChange={(dates) => setDraft((d) => ({ ...d, experiences: updateCurrentExperience(d, { dates }) }))} />
            <Field label="Current role details" value={currentDraftExperience.details || draft.bio} onChange={(details) => setDraft((d) => ({ ...d, experiences: updateCurrentExperience(d, { details }) }))} multiline />
          </>
        ) : <CurrentEmployment profile={profile} fallbackHeadline={visibleHeadline} />}
      </ProfileCard>
      <ListEditor title="Technical skills" items={draft.technicalSkills} editing={editing} onChange={(technicalSkills) => setDraft((d) => ({ ...d, technicalSkills }))} />
      <ListEditor title="Soft skills" items={draft.softSkills} editing={editing} onChange={(softSkills) => setDraft((d) => ({ ...d, softSkills }))} />
      <ListEditor title="Work Experience" items={draft.experiences} editing={editing} onChange={(experiences) => setDraft((d) => ({ ...d, experiences }))} />
      <ListEditor title="Education" items={draft.education} editing={editing} onChange={(education) => setDraft((d) => ({ ...d, education }))} />
      <ListEditor title="Certifications" items={draft.certifications} editing={editing} onChange={(certifications) => setDraft((d) => ({ ...d, certifications }))} />
      {draft.extraSections.map((section) => (
        <ProfileCard title={section.title} key={section.title}>
          {editing ? (
            <Field
              label={section.title}
              value={section.items.join('\n')}
              onChange={(value) => {
                const items = value.split(/\n+/).map((item) => item.trim()).filter(Boolean);
                setDraft((current) => ({
                  ...current,
                  extraSections: current.extraSections.map((currentSection) =>
                    currentSection.title === section.title ? { ...currentSection, items } : currentSection
                  ),
                }));
              }}
              multiline
            />
          ) : /recommendation|reference/i.test(section.title)
            ? <RecommendationItems items={section.items} />
            : <SectionItems items={section.items} />}
        </ProfileCard>
      ))}
      {editing ? <Button onClick={save}>Save Profile</Button> : null}
    </section>
  );
}

function InfoPage({ title, setView }: { title: string; setView: (view: View) => void }) {
  return (
    <section className="screen narrow stack">
      <Header title={title} onBack={() => setView('settings')} />
      <div className="card stack">
        <p className="body muted">
          AiCoche keeps your career profile, uploaded CV metadata, interview practice, and preferences tied to your signed-in account when Supabase is configured.
        </p>
        <p className="body muted">
          For support, account questions, or privacy requests, contact the team member managing your AiCoche deployment.
        </p>
      </div>
    </section>
  );
}

function buildQuiz(profile: ProfileState): QuizQuestion[] {
  const profession = profile.professionLabel || 'Professional';
  const skill = profile.skills[0] ?? 'problem solving';
  const tool = profile.tools[0] ?? 'your main tool';
  const project = profile.projects[0] ?? 'a recent project';
  return [
    {
      question: `As a ${profession}, what should you highlight first in your profile?`,
      options: ['Only tools installed', 'Relevant skills backed by outcomes', 'A long story without results', 'Every task ever done'],
      correctIndex: 1,
      explanation: 'Strong profiles connect skills to outcomes so recruiters can see evidence quickly.',
    },
    {
      question: 'What is the best way to answer a technical quiz question?',
      options: ['Guess quickly', 'Explain reasoning, trade-offs, and final choice', 'Avoid unknowns', 'Always give the shortest answer'],
      correctIndex: 1,
      explanation: 'AI can score reasoning better when you explain the path, not just the final answer.',
    },
    {
      question: `You listed "${skill}" as a skill. What proves it best?`,
      options: ['Saying you are passionate', 'Repeating the skill', 'A project, metric, or example', 'Adding it only to your headline'],
      correctIndex: 2,
      explanation: 'Evidence from real work makes a skill credible.',
    },
    {
      question: `When discussing "${tool}", what answer sounds strongest?`,
      options: ['How the tool helped complete real work', 'That you opened it once', 'That everyone uses it', 'A memorized definition only'],
      correctIndex: 0,
      explanation: 'Hiring and learning assessments reward practical use over name-dropping.',
    },
    {
      question: `If asked about ${project}, which structure is clearest?`,
      options: ['Problem, action, result, learning', 'Only the project name', 'Technical details with no outcome', 'What your teammate did'],
      correctIndex: 0,
      explanation: 'A problem-action-result structure shows ownership and impact.',
    },
    {
      question: `Your preferred language is ${profile.language}. How should quiz feedback be used?`,
      options: ['Ignore it if score is good', 'Review weak areas and practice them', 'Retake without learning', 'Change profile randomly'],
      correctIndex: 1,
      explanation: 'The score is useful when it turns into targeted practice.',
    },
  ];
}

function quizLevel(score: number) {
  if (score >= 90) return 'Expert';
  if (score >= 75) return 'Advanced';
  if (score >= 60) return 'Skilled';
  if (score >= 40) return 'Growing';
  return 'Starter';
}

function mockStart(profile: ProfileState) {
  return {
    sessionId: `mock-session-${id()}`,
    question: `Let's start with your background as a ${profile.professionLabel || 'professional'}. What are you most proud of in the last 12 months?`,
  };
}

function mockContinue(count: number) {
  const questions = [
    'How do you approach learning a new tool or framework?',
    'Tell me about a time you had conflicting priorities. How did you decide?',
    'What kind of role are you targeting next, and why?',
  ];
  const index = Math.floor(count / 2);
  const nextQuestion = questions[index] ?? null;
  return {
    feedback: 'Solid structure. Try adding one concrete metric or outcome next time to strengthen credibility.',
    score: Math.min(7 + index, 10),
    nextQuestion,
    finished: nextQuestion === null,
  };
}

function safeText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function normalizeStartInterviewResponse(value: unknown, profile: ProfileState) {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const fallback = mockStart(profile);
  return {
    sessionId: safeText(data.sessionId, fallback.sessionId),
    question: safeText(data.question, fallback.question),
  };
}

function normalizeContinueInterviewResponse(value: unknown, messageCount: number) {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const fallback = mockContinue(messageCount);
  const rawScore = typeof data.score === 'number' ? data.score : fallback.score;
  const nextQuestion = typeof data.nextQuestion === 'string' && data.nextQuestion.trim()
    ? data.nextQuestion.trim()
    : null;
  return {
    feedback: safeText(data.feedback, fallback.feedback),
    score: Math.min(10, Math.max(1, Math.round(rawScore))),
    nextQuestion,
    finished: data.finished === true || !nextQuestion,
  };
}

function buildUserProfile(profile: ProfileState) {
  const professional = profile.professionalProfile;
  return {
    professionKey: profile.professionKey,
    professionLabel: profile.professionLabel,
    experience: profile.experience,
    goal: profile.goal,
    language: profile.language,
    skills: compactSkills(profile.skills).slice(0, 18),
    tools: compactSkills(profile.tools).slice(0, 12),
    projects: compactList(profile.projects).slice(0, 8),
    professionalProfile: {
      fullName: professional.fullName,
      headline: professional.headline,
      bio: professional.bio.slice(0, 700),
      currentCompany: professional.currentCompany,
      currentDesignation: professional.currentDesignation,
      technicalSkills: compactSkills(professional.technicalSkills).slice(0, 18),
      softSkills: compactSkills(professional.softSkills).slice(0, 10),
      experiences: uniqueExperiences(professional.experiences).slice(0, 5),
      education: uniqueEducations(professional.education).slice(0, 3),
      certifications: compactList(professional.certifications).slice(0, 6),
      extraSections: professional.extraSections.slice(0, 4).map((section) => ({
        title: section.title,
        items: section.items.slice(0, 4),
      })),
    },
  };
}

function profileSkillPool(profile: ProfileState, metrics?: MetricsState) {
  return compactSkills([
    ...profile.skills,
    ...profile.tools,
    ...profile.professionalProfile.technicalSkills,
    ...(metrics?.lastAnalysis?.missingSkills ?? []),
  ]);
}

function topSkills(profile: ProfileState, metrics?: MetricsState) {
  const skills = profileSkillPool(profile, metrics).slice(0, 5);
  return skills.length ? skills : ['problem solving', 'portfolio storytelling', 'technical communication'];
}

function generateProjectRecommendations(profile: ProfileState, metrics: MetricsState): ProjectRecommendation[] {
  const role = (profile.professionLabel || profile.professionalProfile.currentDesignation || profile.professionalProfile.headline || '').toLowerCase();
  const skills = topSkills(profile, metrics);
  const missingSkills = compactSkills(metrics.lastAnalysis?.missingSkills ?? []).slice(0, 4);
  const needsProof = metrics.lastCvScore == null || metrics.lastCvScore < 75;
  const level: ProjectRecommendation['difficulty'] = profile.experience === 'experienced' ? 'Advanced' : profile.experience === 'intermediate' ? 'Intermediate' : 'Beginner';
  const sharedWhy = needsProof
    ? 'Your profile needs stronger project proof, so this gives recruiters concrete work to review.'
    : 'Your profile already has a base, so this project adds stronger proof around your next career step.';

  if (/data|analyst|analytics|business intelligence|bi/.test(role)) {
    return [
      {
        id: 'analytics-command-center',
        title: 'Analytics Command Center',
        difficulty: level,
        timeline: '10-14 days',
        summary: 'Build a dashboard that turns raw business data into KPIs, trends, and recommendations.',
        why: `${sharedWhy} It shows SQL, dashboard thinking, and business communication in one portfolio piece.`,
        skills: compactList(['SQL', 'Dashboard design', 'Data cleaning', ...skills, ...missingSkills]).slice(0, 6),
        features: ['CSV/data import', 'KPI cards', 'Trend charts', 'Segment filters', 'Insight summary panel'],
        stack: ['Next.js', 'Supabase or PostgreSQL', 'Chart library', 'CSV parser'],
        portfolioTips: ['Add a before/after insight story', 'Include screenshots of dashboards', 'Explain the business decisions your data supports'],
        interviewTalkingPoints: ['How you modeled the data', 'How you chose KPIs', 'How the dashboard helps a stakeholder act faster'],
      },
      {
        id: 'customer-churn-lab',
        title: 'Customer Churn Insight Lab',
        difficulty: 'Intermediate',
        timeline: '2 weeks',
        summary: 'Analyze customer behavior and surface churn risks with clear retention recommendations.',
        why: 'This is a strong analytics project because it combines data exploration with business impact.',
        skills: compactList(['Data analysis', 'Segmentation', 'Retention metrics', ...skills]).slice(0, 6),
        features: ['Customer table', 'Churn risk score', 'Cohort view', 'Retention suggestions', 'Exportable report'],
        stack: ['Python or TypeScript', 'Supabase', 'Charts', 'Notebook or dashboard'],
        portfolioTips: ['Show your assumptions clearly', 'Add a short executive summary', 'Document limitations of the dataset'],
        interviewTalkingPoints: ['How you defined churn risk', 'Which signals mattered most', 'How you would improve the model with real data'],
      },
      {
        id: 'portfolio-case-study',
        title: 'Data Portfolio Case Study',
        difficulty: 'Beginner',
        timeline: '5-7 days',
        summary: 'Create a polished case study page that explains one problem, analysis, result, and recommendation.',
        why: 'It improves your storytelling, which is often the gap between analysis work and getting interviews.',
        skills: compactList(['Communication', 'Visualization', 'Problem framing', ...skills]).slice(0, 6),
        features: ['Problem statement', 'Dataset overview', 'Visual insights', 'Recommendation section', 'Downloadable report'],
        stack: ['Next.js', 'Markdown/MDX', 'Charts'],
        portfolioTips: ['Write for non-technical readers', 'Use simple visuals', 'Put the result near the top'],
        interviewTalkingPoints: ['How you framed the problem', 'What tradeoffs you made', 'What action the stakeholder should take'],
      },
    ];
  }

  if (/product|manager|pm/.test(role)) {
    return [
      {
        id: 'roadmap-prioritizer',
        title: 'Product Roadmap Prioritizer',
        difficulty: level,
        timeline: '10-12 days',
        summary: 'Build a tool that scores feature ideas by impact, effort, confidence, and strategic fit.',
        why: `${sharedWhy} It proves product thinking, prioritization, and communication with engineering.`,
        skills: compactList(['Prioritization', 'Product strategy', 'User stories', ...skills, ...missingSkills]).slice(0, 6),
        features: ['Feature backlog', 'RICE scoring', 'Roadmap view', 'Decision notes', 'Stakeholder summary'],
        stack: ['Next.js', 'Supabase', 'Simple charts'],
        portfolioTips: ['Include your prioritization framework', 'Show examples of tradeoffs', 'Add a product brief'],
        interviewTalkingPoints: ['How you chose the framework', 'How you handle conflicting stakeholders', 'How you measure success'],
      },
      {
        id: 'user-feedback-hub',
        title: 'User Feedback Hub',
        difficulty: 'Intermediate',
        timeline: '2 weeks',
        summary: 'Collect, tag, and convert user feedback into product opportunities.',
        why: 'This shows discovery, synthesis, and product judgment, not just documentation.',
        skills: compactList(['User research', 'Feedback synthesis', 'Product discovery', ...skills]).slice(0, 6),
        features: ['Feedback inbox', 'Tagging system', 'Opportunity scoring', 'Theme clusters', 'Action plan'],
        stack: ['Next.js', 'Supabase', 'AI summarization optional'],
        portfolioTips: ['Add sample feedback', 'Show how insights become roadmap items', 'Write a short discovery memo'],
        interviewTalkingPoints: ['How you avoid bias', 'How you identify patterns', 'How you decide what not to build'],
      },
      {
        id: 'launch-plan-builder',
        title: 'Launch Plan Builder',
        difficulty: 'Beginner',
        timeline: '1 week',
        summary: 'Create a launch checklist and messaging planner for a new product feature.',
        why: 'It adds go-to-market and cross-functional execution proof to your portfolio.',
        skills: compactList(['Launch planning', 'Messaging', 'Cross-functional work', ...skills]).slice(0, 6),
        features: ['Launch checklist', 'Audience segments', 'Risk tracker', 'Success metrics', 'Post-launch review'],
        stack: ['Next.js', 'Local storage or Supabase'],
        portfolioTips: ['Use a realistic product example', 'Include success metrics', 'Show pre-launch and post-launch tasks'],
        interviewTalkingPoints: ['How you define launch readiness', 'How you manage risk', 'How you evaluate launch quality'],
      },
    ];
  }

  return [
    {
      id: 'career-ai-dashboard',
      title: 'AI Career Progress Dashboard',
      difficulty: level,
      timeline: '10-14 days',
      summary: 'Build a dashboard that tracks CV strength, skills, interview practice, and weekly improvement goals.',
      why: `${sharedWhy} It directly matches your career-coach background and gives you a polished portfolio story.`,
      skills: compactList(['React', 'Dashboard UI', 'Auth', ...skills, ...missingSkills]).slice(0, 6),
      features: ['User auth', 'Profile score cards', 'Skill gap tracker', 'Weekly goals', 'Progress history'],
      stack: ['Next.js', 'Supabase', 'TypeScript', 'Charts'],
      portfolioTips: ['Add a strong README with screenshots', 'Explain how scores are calculated', 'Deploy it and link a live demo'],
      interviewTalkingPoints: ['How you designed the dashboard UX', 'How you structured user data', 'How you would scale the scoring system'],
    },
    {
      id: 'smart-cv-reviewer',
      title: 'Smart CV Review Tool',
      difficulty: 'Intermediate',
      timeline: '2 weeks',
      summary: 'Create a CV upload flow that extracts key profile data and returns improvement suggestions.',
      why: 'This is highly relevant for a career profile and demonstrates practical AI/product thinking.',
      skills: compactList(['File upload', 'AI prompts', 'Profile parsing', ...skills]).slice(0, 6),
      features: ['CV upload', 'Text extraction', 'Strength/weakness report', 'Missing skills list', 'Action checklist'],
      stack: ['Next.js', 'Supabase Storage', 'Edge Function', 'OpenAI optional'],
      portfolioTips: ['Show sample anonymized CV output', 'Document privacy considerations', 'Explain prompt and validation strategy'],
      interviewTalkingPoints: ['How you handle unreliable AI output', 'How you protect user data', 'How you measure review quality'],
    },
    {
      id: 'interview-practice-room',
      title: 'Mock Interview Practice Room',
      difficulty: profile.experience === 'beginner' ? 'Beginner' : 'Intermediate',
      timeline: '7-10 days',
      summary: 'Build an interview practice page with questions, answers, feedback, and saved sessions.',
      why: 'It gives your profile a practical project that recruiters can understand quickly.',
      skills: compactList(['Chat UI', 'State management', 'Feedback UX', ...skills, ...missingSkills]).slice(0, 6),
      features: ['Question flow', 'Answer composer', 'Feedback cards', 'Session history', 'Score summary'],
      stack: ['React or Next.js', 'Supabase', 'TypeScript'],
      portfolioTips: ['Record a short demo video', 'Add sample interview sessions', 'Highlight accessibility and responsive design'],
      interviewTalkingPoints: ['How you manage conversation state', 'How feedback is generated', 'How users can track progress'],
    },
  ];
}

function initialProjectMessage(project: ProjectRecommendation, profile: ProfileState) {
  const role = profile.professionLabel || profile.professionalProfile.currentDesignation || 'your target role';
  return `I recommend "${project.title}" for ${role}. It is a ${project.difficulty.toLowerCase()} project you can finish in ${project.timeline}. Ask me about scope, tech stack, features, README, GitHub, or how to explain it in interviews.`;
}

function buildProjectAnswer(project: ProjectRecommendation, profile: ProfileState, question: string) {
  const normalized = question.toLowerCase();
  const role = profile.professionLabel || profile.professionalProfile.currentDesignation || 'your target role';

  if (/stack|tech|technology|framework|tool/.test(normalized)) {
    return `For your ${role} profile, use this stack: ${project.stack.join(', ')}. Keep the first version simple, then add one advanced feature after the core flow works. This makes the project easier to finish and easier to explain.`;
  }

  if (/feature|scope|module|build|include/.test(normalized)) {
    return `Build the scope in this order: ${project.features.join(' -> ')}. Start with the main user flow first, then polish the dashboard/reporting part. This gives you a complete demo even if you improve it later.`;
  }

  if (/readme|github|portfolio|deploy/.test(normalized)) {
    return `For GitHub and portfolio, show: problem, target user, screenshots, live demo link, tech stack, key features, and what you learned. For this project, highlight: ${project.portfolioTips.join('; ')}.`;
  }

  if (/interview|explain|talk|present/.test(normalized)) {
    return `In interviews, explain this project around impact and decisions: ${project.interviewTalkingPoints.join('; ')}. Also mention why you chose this project: ${project.why}`;
  }

  if (/time|timeline|days|week|plan|milestone/.test(normalized)) {
    return `Plan it across ${project.timeline}: first build the core flow, then add data/state handling, then polish UI, then write README and deploy. Do not start with advanced features before the basic demo is working.`;
  }

  return `For "${project.title}", focus on the parts that improve your ${role} profile: ${project.skills.slice(0, 4).join(', ')}. The main reason to build it is: ${project.why} A strong next step is to define the smallest demo you can finish in 2-3 days, then expand it into the full version.`;
}

function labelExperience(value: Experience | null) {
  if (value === 'beginner') return 'Beginner (0-1 years)';
  if (value === 'intermediate') return 'Intermediate (1-3 years)';
  if (value === 'experienced') return 'Experienced (3+ years)';
  return '—';
}

function labelGoal(value: Goal | null) {
  if (value === 'job') return 'Get a Job';
  if (value === 'switch') return 'Switch Career';
  if (value === 'freelance') return 'Freelancing';
  if (value === 'skills') return 'Improve Skills';
  return '—';
}

function isTab(view: View): view is Tab {
  return view === 'home' || view === 'interview' || view === 'quiz' || view === 'profile' || view === 'settings';
}

function Button({ children, onClick, disabled, variant, style }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; variant?: 'secondary' | 'ghost' | 'danger'; style?: React.CSSProperties }) {
  return <button className={`button ${variant ?? ''}`} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

function Field({ label, value, onChange, placeholder, type = 'text', multiline }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; multiline?: boolean }) {
  return (
    <label className="input-group">
      <span className="label">{label}</span>
      {multiline ? <textarea className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /> : <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} />}
    </label>
  );
}

function Choice({ children, selected, onClick, tall }: { children: React.ReactNode; selected: boolean; onClick: () => void; tall?: boolean }) {
  return (
    <button className="card row between" onClick={onClick} style={{ cursor: 'pointer', minHeight: tall ? 132 : 62, background: selected ? 'var(--primary-tint)' : 'var(--surface)', borderColor: selected ? 'var(--primary)' : 'var(--border)' }}>
      {children}
    </button>
  );
}

function Header({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="row between">
      <div className="row">
        <button className="back-button" onClick={onBack} aria-label="Go back">‹</button>
        <div><h1 className="title">{title}</h1>{subtitle ? <p className="caption muted">{subtitle}</p> : null}</div>
      </div>
      {right}
    </div>
  );
}

function Avatar({ profile, user, large }: { profile: ProfileState; user?: User | null; large?: boolean }) {
  const avatarUrl = avatarFor(profile, user);
  return <div className={`avatar ${large ? 'large' : ''}`}>{avatarUrl ? <img src={avatarUrl} alt="" /> : '👤'}</div>;
}

function AvatarUploader({
  user,
  profile,
  setProfile,
  setError,
  large,
}: {
  user: User | null;
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
  setError: (message: string) => void;
  large?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setUploading(true);
    try {
      const localAvatarUrl = await fileToDataUrl(file);
      let avatarUrl = localAvatarUrl;
      if (hasSupabase && supabase && user) {
        try {
          const extension = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
          const path = `${user.id}/avatar-${Date.now()}.${extension}`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
            contentType: file.type,
            upsert: false,
          });
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = data.publicUrl;
        } catch (uploadError) {
          console.warn('Avatar storage upload failed; using local avatar preview.', uploadError);
        }
      }

      const nextProfile = { ...profile, avatarUrl };
      setProfile(nextProfile);
      try {
        await saveProfileSnapshot(nextProfile, user);
      } catch (saveError) {
        console.warn('Avatar profile save failed; local avatar remains available.', saveError);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not upload profile image.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="profile-avatar-control">
      <Avatar profile={profile} user={user} large={large} />
      <input
        ref={inputRef}
        className="hidden-file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => void onImage(event.target.files?.[0] ?? null)}
      />
      <button className="avatar-upload-button" onClick={() => inputRef.current?.click()} disabled={uploading} title="Upload profile image">
        {uploading ? '…' : '↥'}
      </button>
    </div>
  );
}

function Score({ label, value, color, icon = '↗' }: { label: string; value: string | number; color: string; icon?: string }) {
  return (
    <div className="card stack metric-card" style={{ '--metric-color': color } as CSSProperties}>
      <div className="metric-icon">{icon}</div>
      <h2 className="metric-value">{value}</h2>
      <p className="body muted">{label}</p>
    </div>
  );
}

function Action({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: string; onClick: () => void }) {
  return (
    <button className="card stack dashboard-action-card" onClick={onClick}>
      <div className="icon-box">{icon}</div>
      <div><h3 className="subtitle">{title}</h3><p className="body muted">{subtitle}</p></div>
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="row between"><p className="body muted">{label}</p><p className="body" style={{ fontWeight: 900 }}>{value}</p></div>;
}

function EditableSection({ title, items, onAdd }: { title: string; items: string[]; onAdd: () => void }) {
  return (
    <div className="stack">
      <div className="row between"><h2 className="title">{title}</h2><Button variant="ghost" onClick={onAdd}>Edit</Button></div>
      <div className="card row" style={{ flexWrap: 'wrap' }}>
        {items.length ? items.map((item) => <span className="chip" key={item}>{item}</span>) : <p className="caption muted">Nothing added yet</p>}
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="stack"><p className="label">{title}</p><div className="card stack">{children}</div></div>;
}

function SettingsRow({ label, value, onToggle, onClick, danger }: { label: string; value?: boolean; onToggle?: (value: boolean) => void; onClick?: () => void; danger?: boolean }) {
  return (
    <div className="row between">
      <button className="button ghost" style={{ color: danger ? 'var(--error)' : 'var(--text)', padding: 0, justifyContent: 'flex-start' }} onClick={onClick ?? (() => undefined)}>{label}</button>
      {typeof value === 'boolean' && onToggle ? <input type="checkbox" checked={value} onChange={(e) => onToggle(e.target.checked)} /> : <span className="muted">›</span>}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal stack" onClick={(e) => e.stopPropagation()}>
        <div className="row between"><h2 className="title">{title}</h2><Button variant="ghost" onClick={onClose}>Close</Button></div>
        {children}
      </div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="card"><p className="body muted">{message}</p></div>;
}

function parseExperienceDisplay(item: string) {
  const normalized = item.replace(/\s+/g, ' ').trim();
  const bulletParts = normalized.split(/\s+•\s+/).map((part) => part.trim()).filter(Boolean);
  const dashParts = normalized.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  const parts = bulletParts.length > 1 ? bulletParts : dashParts;
  const [title = normalized, company = '', dates = '', ...details] = parts;
  const normalizedDates = dates.replace(/\b(?:present|current|now)\b/gi, 'Present');

  return {
    raw: normalized,
    title,
    company,
    dates: /\d{4}|present|current|now/i.test(dates) ? normalizedDates : '',
    details: details.length ? details.join(' ') : (dates && !/\d{4}|present|current|now/i.test(dates) ? dates : ''),
    key: `${title.toLowerCase()}::${company.toLowerCase()}`,
    isDetailed: parts.length >= 4 || /developed|implemented|improved|performed|managed|built|created|automated|responsible/i.test(normalized),
  };
}

function displayExperienceDates(dates: string, isLikelyCurrent: boolean) {
  const normalized = dates.replace(/\b(?:present|current|now)\b/gi, 'Present');
  if (isLikelyCurrent && normalized && !/\s+-\s+/.test(normalized) && !/present/i.test(normalized)) {
    return `${normalized} - Present`;
  }
  return normalized;
}

function experienceScore(item: ReturnType<typeof parseExperienceDisplay>) {
  return [
    item.details ? 4 : 0,
    /present|current|now/i.test(item.raw) ? 3 : 0,
    /\s+-\s+/.test(item.dates) ? 2 : 0,
    item.dates ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function uniqueExperiences(items: string[]) {
  const map = new Map<string, ReturnType<typeof parseExperienceDisplay>>();
  items.map(parseExperienceDisplay).filter((item) => item.raw).forEach((item) => {
    const key = item.key || item.raw.toLowerCase();
    const existing = map.get(key);
    if (!existing || experienceScore(item) >= experienceScore(existing)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values()).map(serializeExperience).filter(Boolean);
}

function WorkExperienceList({ items }: { items: string[] }) {
  const visible = uniqueExperiences(items).map(parseExperienceDisplay).filter((item) => item.raw);
  const hasPresentRole = visible.some((item) => /present|current|now/i.test(item.raw));

  if (!visible.length) return <p className="body muted">Nothing added yet</p>;

  return (
    <div className="experience-list">
      {visible.map((item, index) => (
        <article className="experience-item" key={`${item.raw}-${index}`}>
          <div className="experience-dot" />
          <div className="experience-content">
            <div className="row between" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h3 className="experience-title">{item.title}</h3>
                {item.company ? <p className="experience-company">{item.company}</p> : null}
              </div>
              {item.dates ? <span className="experience-date">{displayExperienceDates(item.dates, index === 0 && !hasPresentRole)}</span> : null}
            </div>
            {item.details ? (
              <ul className="experience-bullets">
                {item.details.split(/;\s*/).map((detail) => detail.trim()).filter(Boolean).map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function serializeExperience(item: ReturnType<typeof parseExperienceDisplay>) {
  return [item.title, item.company, item.dates, item.details].map((part) => part.trim()).filter(Boolean).join(' • ');
}

function currentExperienceFrom(profile: ProfessionalProfile) {
  const currentCompany = text(profile.currentCompany);
  const parsed = profile.experiences.map(parseExperienceDisplay).filter((item) => item.raw);
  return (
    parsed.find((item) => /present|current|now/i.test(item.raw)) ||
    parsed.find((item) => item.company && currentCompany && item.company.toLowerCase() === currentCompany.toLowerCase()) ||
    parsed[0] ||
    parseExperienceDisplay('')
  );
}

function updateCurrentExperience(profile: ProfessionalProfile, patch: { title?: string; company?: string; dates?: string; details?: string }) {
  const currentCompany = text(patch.company ?? profile.currentCompany);
  const parsed = profile.experiences.map(parseExperienceDisplay).filter((item) => item.raw);
  const index = parsed.findIndex((item) => /present|current|now/i.test(item.raw)) >= 0
    ? parsed.findIndex((item) => /present|current|now/i.test(item.raw))
    : parsed.findIndex((item) => item.company && currentCompany && item.company.toLowerCase() === currentCompany.toLowerCase());
  const existing = index >= 0 ? parsed[index] : parsed[0] || parseExperienceDisplay('');
  const nextExperience = {
    ...existing,
    title: text(patch.title) || existing.title || profile.currentDesignation,
    company: currentCompany || existing.company,
    dates: text(patch.dates) || existing.dates || 'Present',
    details: patch.details != null ? patch.details : existing.details,
  };
  const next = [...parsed];
  if (index >= 0) {
    next[index] = nextExperience;
  } else {
    next.unshift(nextExperience);
  }
  return next.map(serializeExperience).filter(Boolean);
}

function WorkExperienceEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const visible = uniqueExperiences(items).map(parseExperienceDisplay).filter((item) => item.raw);
  const experiences = visible.length ? visible : [parseExperienceDisplay('')];

  function update(index: number, patch: Partial<ReturnType<typeof parseExperienceDisplay>>) {
    const next = experiences.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
    onChange(next.map(serializeExperience).filter(Boolean));
  }

  function remove(index: number) {
    onChange(experiences.filter((_, itemIndex) => itemIndex !== index).map(serializeExperience).filter(Boolean));
  }

  function add() {
    onChange([...experiences.map(serializeExperience).filter(Boolean), 'New role • Company • Present • Add responsibilities']);
  }

  return (
    <div className="structured-editor">
      {experiences.map((experience, index) => (
        <div className="structured-editor-card" key={`${experience.raw}-${index}`}>
          <div className="row between">
            <p className="label">Experience {index + 1}</p>
            <button className="button ghost" style={{ minHeight: 0, padding: 0 }} onClick={() => remove(index)}>Remove</button>
          </div>
          <div className="grid">
            <Field label="Role / title" value={experience.title} onChange={(title) => update(index, { title })} />
            <Field label="Company" value={experience.company} onChange={(company) => update(index, { company })} />
          </div>
          <Field label="Date range" value={experience.dates} placeholder="2024-08-01 - Present" onChange={(dates) => update(index, { dates })} />
          <Field label="Responsibilities / achievements" value={experience.details} onChange={(details) => update(index, { details })} multiline />
        </div>
      ))}
      <Button variant="secondary" onClick={add}>Add experience</Button>
    </div>
  );
}

function parseEducationDisplay(item: string) {
  const normalized = item.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return { raw: '', degree: '', institution: '', date: '', details: '' };
  }

  const parts = normalized.split(/\s+(?:[—-]|•)\s+/).map((part) => part.trim()).filter(Boolean);
  const degreeIndex = parts.findIndex((part) => /bachelor|master|degree|diploma|bs\b|ms\b|phd|computer science|software engineering/i.test(part));
  const institutionIndex = parts.findIndex((part) => /university|college|institute|school|academy/i.test(part));
  const effectiveDegreeIndex = degreeIndex >= 0 ? degreeIndex : 0;
  const effectiveInstitutionIndex = institutionIndex >= 0 ? institutionIndex : 1;
  const degree = parts[effectiveDegreeIndex] || normalized;
  const repeatedDegreeIndex = parts.findIndex((part, index) => index > 0 && part.toLowerCase() === degree.toLowerCase());
  const usefulParts = repeatedDegreeIndex > 0 ? parts.slice(0, repeatedDegreeIndex) : parts;
  const institutionWithDate = usefulParts[effectiveInstitutionIndex] || '';
  const explicitDate = usefulParts.find((part, index) => index > 1 && /(\d{4}|present|current|now)/i.test(part)) || '';
  const parenthesizedDate = institutionWithDate.match(/\(([^)]*(?:\d{4}|present|current|now)[^)]*)\)/i)?.[1] || '';
  const slashDates = Array.from(normalized.matchAll(/\d{1,2}\/\d{1,2}\/\d{4}/g)).map((match) => match[0]);
  const yearDates = Array.from(normalized.matchAll(/\b(?:19|20)\d{2}\b/g)).map((match) => match[0]);
  const date = slashDates.length > 1
    ? `${slashDates[0]} - ${slashDates[1]}`
    : explicitDate || parenthesizedDate || (yearDates.length > 1 ? `${yearDates[0]} - ${yearDates[1]}` : yearDates[0] || '');
  const institution = institutionWithDate.replace(/\s*\([^)]*(?:\d{4}|present|current|now)[^)]*\)\s*/gi, '').trim();
  const details = usefulParts
    .filter((part, index) => index !== effectiveDegreeIndex && index !== effectiveInstitutionIndex)
    .filter((part) => part !== explicitDate && part !== date)
    .filter((part) => !/^\d{1,2}\/\d{1,2}\/\d{4}$|^(?:19|20)\d{2}$/.test(part))
    .filter((part) => /gpa|grade|cgpa|honou?r|distinction|percentage/i.test(part))
    .join(' ');

  return {
    raw: normalized,
    degree,
    institution,
    date,
    details,
  };
}

function uniqueEducations(items: string[]) {
  const map = new Map<string, ReturnType<typeof parseEducationDisplay>>();
  items.map(parseEducationDisplay).filter((item) => item.raw).forEach((item) => {
    const key = `${item.degree.toLowerCase()}::${item.institution.toLowerCase()}`;
    const existing = map.get(key);
    const score = (item.date ? 2 : 0) + (item.details ? 1 : 0);
    const existingScore = existing ? (existing.date ? 2 : 0) + (existing.details ? 1 : 0) : -1;
    if (!existing || score >= existingScore) {
      map.set(key, item);
    }
  });
  return Array.from(map.values()).map(serializeEducation).filter(Boolean);
}

function EducationList({ items }: { items: string[] }) {
  const visible = uniqueEducations(items).map(parseEducationDisplay).filter((item) => item.raw);

  if (!visible.length) return <p className="body muted">Nothing added yet</p>;

  return (
    <div className="education-list">
      {visible.map((item, index) => (
        <article className="education-item" key={`${item.raw}-${index}`}>
          <div className="education-icon">🎓</div>
          <div className="education-content">
            <div className="row between" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h3 className="education-degree">{item.degree}</h3>
                {item.institution ? <p className="education-school">{item.institution}</p> : null}
              </div>
              {item.date ? <span className="education-date">{item.date}</span> : null}
            </div>
            {item.details ? <p className="education-details">{item.details}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function serializeEducation(item: ReturnType<typeof parseEducationDisplay>) {
  return [item.degree, item.institution, item.date, item.details].map((part) => part.trim()).filter(Boolean).join(' — ');
}

function EducationEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const educations = uniqueEducations(items).map(parseEducationDisplay).filter((item) => item.raw);
  const visible = educations.length ? educations : [parseEducationDisplay('')];

  function update(index: number, patch: Partial<ReturnType<typeof parseEducationDisplay>>) {
    const next = visible.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
    onChange(next.map(serializeEducation).filter(Boolean));
  }

  function remove(index: number) {
    onChange(visible.filter((_, itemIndex) => itemIndex !== index).map(serializeEducation).filter(Boolean));
  }

  function add() {
    onChange([...visible.map(serializeEducation).filter(Boolean), 'Degree — Institution — Year']);
  }

  return (
    <div className="structured-editor">
      {visible.map((education, index) => (
        <div className="structured-editor-card" key={`${education.raw}-${index}`}>
          <div className="row between">
            <p className="label">Education {index + 1}</p>
            <button className="button ghost" style={{ minHeight: 0, padding: 0 }} onClick={() => remove(index)}>Remove</button>
          </div>
          <Field label="Degree / qualification" value={education.degree} onChange={(degree) => update(index, { degree })} />
          <Field label="Institution" value={education.institution} onChange={(institution) => update(index, { institution })} />
          <Field label="Year / date range" value={education.date} placeholder="2024" onChange={(date) => update(index, { date })} />
          <Field label="Details" value={education.details} onChange={(details) => update(index, { details })} multiline />
        </div>
      ))}
      <Button variant="secondary" onClick={add}>Add education</Button>
    </div>
  );
}

function CurrentEmployment({ profile, fallbackHeadline }: { profile: ProfileState; fallbackHeadline: string }) {
  const currentCompany = text(profile.professionalProfile.currentCompany);
  const currentDesignation = text(profile.professionalProfile.currentDesignation) || fallbackHeadline;
  const experiences = profile.professionalProfile.experiences.map(parseExperienceDisplay);
  const currentExperience =
    experiences.find((item) => /present|current|now/i.test(item.raw)) ||
    experiences.find((item) => item.company && currentCompany && item.company.toLowerCase() === currentCompany.toLowerCase()) ||
    experiences[0];

  const title = currentDesignation || currentExperience?.title || 'Add current role';
  const company = currentCompany || currentExperience?.company || 'Add company';
  const dates = displayExperienceDates(currentExperience?.dates || '', true);
  const details = currentExperience?.details || profile.professionalProfile.bio;
  const bullets = details
    .split(/;\s*|\.\s+(?=[A-Z])/)
    .map((item) => item.trim().replace(/\.$/, ''))
    .filter(Boolean);

  return (
    <div className="current-employment">
      <p className="current-role">{title}</p>
      <p className="current-company">{company}</p>
      {dates ? <p className="current-date">{dates}</p> : null}
      {bullets.length ? (
        <ul className="current-bullets">
          {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function AnalysisSection({ title, items, tone, numbered }: { title: string; items: string[]; tone: 'success' | 'error' | 'primary'; numbered?: boolean }) {
  const color = tone === 'success' ? 'var(--success)' : tone === 'error' ? 'var(--error)' : 'var(--primary)';
  return (
    <div className="card stack">
      <h2 className="subtitle">{title}</h2>
      {items.length ? items.map((item, index) => (
        <div className="row" key={item} style={{ alignItems: 'flex-start' }}>
          <span className="chip" style={{ color, background: `${color}22` }}>{numbered ? index + 1 : '•'}</span>
          <p className="body">{item}</p>
        </div>
      )) : <p className="body muted">No items returned yet.</p>}
    </div>
  );
}

function QuoteSlider({ quote, quoteKey, className = '' }: { quote: string; quoteKey: number; className?: string }) {
  const words = quote.split(/\s+/).filter(Boolean);

  return (
    <div className={`quote-slider ${className}`} aria-live="polite">
      <span className="quote-slide quote-fade-left" key={quoteKey}>
        {words.map((word, index) => (
          <span
            className="quote-word"
            key={`${word}-${index}`}
            style={{ '--word-delay': `${index * 42}ms` } as CSSProperties}>
            {word}
          </span>
        ))}
      </span>
    </div>
  );
}

function AnalyzingState() {
  const steps = ['Reading CV structure', 'Finding strengths and gaps', 'Building improvement plan'];
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % MOTIVATIONAL_QUOTES.length);
    }, 2800);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="analysis-loader hero-card">
      <div className="scan-visual" aria-hidden="true">
        <span className="scan-halo scan-halo-one" />
        <span className="scan-halo scan-halo-two" />
        <span className="scan-orbit">
          <span className="scan-dot" />
        </span>
        <span className="scan-card">
          <span className="scan-line scan-line-one" />
          <span className="scan-line scan-line-two" />
          <span className="scan-line scan-line-three" />
          <span className="scan-sweep" />
        </span>
      </div>
      <div className="stack" style={{ textAlign: 'center', justifyItems: 'center' }}>
        <span className="hero-kicker">AI analysis in progress</span>
        <h2 className="title">Analyzing your CV</h2>
        <p className="body muted" style={{ maxWidth: 560 }}>
          AiCoche is reading your experience, skills, and role fit. This usually takes a few seconds.
        </p>
        <QuoteSlider quote={MOTIVATIONAL_QUOTES[quoteIndex]} quoteKey={quoteIndex} className="analysis-quote" />
      </div>
      <div className="analysis-steps" aria-label="Analysis progress">
        {steps.map((step, index) => (
          <div className="analysis-step" key={step}>
            <span className="analysis-step-dot" />
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ title, children }: { title: string; editing?: boolean; children: React.ReactNode }) {
  return <div className="card stack"><h2 className="subtitle">{title}</h2>{children}</div>;
}

function SectionItems({ items }: { items: string[] }) {
  if (!items.length) return <p className="body muted">Nothing added yet</p>;
  return (
    <div className="custom-section-list">
      {items.map((item, index) => (
        <div className="custom-section-item" key={`${item}-${index}`}>
          <span className="analysis-step-dot" />
          <p className="body muted">{item}</p>
        </div>
      ))}
    </div>
  );
}

function parseRecommendationItem(item: string) {
  const normalized = item.replace(/\s+/g, ' ').trim();
  const name =
    normalized.match(/name\s*:?\s*([^|,]+?)(?=\s*(?:\||,|lecturer|supervisor|ceo|founder|whom|who|$))/i)?.[1]?.trim() ||
    normalized.match(/\b(Mr\.?\s+[A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+|Ms\.?\s+[A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+|Mrs\.?\s+[A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+)/)?.[1]?.trim() ||
    '';
  const role =
    normalized.match(/\(([^)]*(?:lecturer|supervisor|ceo|founder|manager|professor)[^)]*)\)/i)?.[1]?.trim() ||
    normalized.match(/\b(lecturer[^|,.]*|supervisor[^|,.]*|ceo[^|,.]*|founder[^|,.]*|professor[^|,.]*)/i)?.[1]?.trim() ||
    '';
  const detail = normalized
    .replace(/name\s*:?\s*[^|,]+/i, '')
    .replace(/\([^)]*(?:lecturer|supervisor|ceo|founder|manager|professor)[^)]*\)/i, '')
    .replace(/\s*\|\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { name, role, detail: detail || normalized };
}

function RecommendationItems({ items }: { items: string[] }) {
  if (!items.length) return <p className="body muted">Nothing added yet</p>;
  return (
    <div className="recommendation-list">
      {items.map((item, index) => {
        const recommendation = parseRecommendationItem(item);
        return (
          <article className="recommendation-item" key={`${item}-${index}`}>
            <div className="recommendation-avatar">{recommendation.name ? recommendation.name.slice(0, 1).toUpperCase() : 'R'}</div>
            <div>
              <h3 className="education-degree">{recommendation.name || 'Recommendation'}</h3>
              {recommendation.role ? <p className="education-school">{recommendation.role}</p> : null}
              <p className="education-details">{recommendation.detail}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ListEditor({ title, items, editing, onChange }: { title: string; items: string[]; editing: boolean; onChange: (items: string[]) => void }) {
  const value = items.join(', ');
  return (
    <ProfileCard title={title}>
      {editing ? (
        title === 'Work Experience'
          ? <WorkExperienceEditor items={items} onChange={onChange} />
          : title === 'Education'
            ? <EducationEditor items={items} onChange={onChange} />
            : title.toLowerCase().includes('skills')
              ? <TagEditor label={title} items={items} onChange={onChange} />
            : <Field label={title} value={value} onChange={(next) => onChange(next.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))} />
      ) : (
        title === 'Work Experience'
          ? <WorkExperienceList items={items} />
          : title === 'Education'
            ? <EducationList items={items} />
          : <div className="row" style={{ flexWrap: 'wrap' }}>{items.length ? items.map((item) => <span className="chip" key={item}>{item}</span>) : <p className="body muted">Nothing added yet</p>}</div>
      )}
    </ProfileCard>
  );
}

function TagEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function addSkill(value = draft) {
    const normalized = value.trim();
    if (!normalized) return;
    onChange(Array.from(new Set([...items, normalized])));
    setDraft('');
  }

  function removeSkill(skill: string) {
    onChange(items.filter((item) => item !== skill));
  }

  return (
    <div className="tag-editor">
      <div className="tag-editor-list">
        {items.length ? items.map((skill) => (
          <button className="editable-tag" key={skill} onClick={() => removeSkill(skill)} title="Remove skill">
            <span>{skill}</span>
            <span aria-hidden="true">×</span>
          </button>
        )) : <p className="body muted">No {label.toLowerCase()} added yet.</p>}
      </div>
      <div className="tag-editor-add">
        <input
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addSkill();
            }
          }}
          placeholder={`Add ${label.toLowerCase()}`}
        />
        <Button variant="secondary" onClick={() => addSkill()} disabled={!draft.trim()}>Add</Button>
      </div>
    </div>
  );
}

function WebHeader({
  active,
  setView,
  theme,
  setTheme,
  usage,
  onSignOut,
}: {
  active: Tab | null;
  setView: (view: View) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  usage: UsageState;
  onSignOut: () => void;
}) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '' },
    { id: 'interview', label: 'Interview', icon: '' },
    { id: 'quiz', label: 'AI Quiz', icon: '' },
    { id: 'profile', label: 'Profile', icon: '' },
    { id: 'settings', label: 'Settings', icon: '' },
  ];
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(view: View) {
    setView(view);
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button className="brand" onClick={() => navigate('home')}>
          <span className="brand-mark">A</span>
          <span>AiCoche</span>
        </button>

        <button
          className={`menu-toggle ${menuOpen ? 'active' : ''}`}
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}>
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Primary navigation">
          {tabs.map((tab) => (
            <button key={tab.id} className={`nav-link ${active === tab.id ? 'active' : ''}`} onClick={() => navigate(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <span className="chip">{usage.plan === 'pro' ? 'Pro' : 'Free'}</span>
          <button
            className="header-icon-button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button
            className="header-icon-button danger"
            onClick={onSignOut}
            type="button"
            aria-label="Sign out"
            title="Sign out">
            ⎋
          </button>
        </div>
      </div>
    </header>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="error row between" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60, width: 'min(640px, calc(100% - 32px))' }}>
      <span>{message}</span>
      <button className="button ghost" onClick={onClose}>Close</button>
    </div>
  );
}
