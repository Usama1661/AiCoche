/** Human-readable context for interview prompts (profile + optional metrics). */

import type { InterviewPromptStyle } from './interviewQuestionPolicy.ts';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => text(item))
        .filter(Boolean)
        .slice(0, max)
    : [];
}

export function experienceLabel(experience: unknown): string {
  if (experience === 'beginner') return 'early-career / junior-oriented depth';
  if (experience === 'intermediate') return 'mid-level depth';
  if (experience === 'experienced') return 'senior / lead-level depth';
  return 'unspecified level — ask a strong role-typical question';
}

/**
 * Compact summary so the model prioritizes field-fit and calibration without relying only on raw JSON.
 */
export function buildInterviewContextLines(
  profile: Record<string, unknown>,
  metrics?: Record<string, unknown> | null,
): string {
  const prof = (profile.professionalProfile as Record<string, unknown> | undefined) ?? {};
  const profession =
    text(profile.professionLabel) ||
    text(profile.professionKey) ||
    text(prof.currentDesignation) ||
    'the candidate’s target role';
  const exp = experienceLabel(profile.experience);
  const goal = text(profile.goal);
  const skills = stringArray(profile.skills, 14).join(', ');
  const tools = stringArray(profile.tools, 10).join(', ');
  const headline = text(prof.headline).slice(0, 220);
  const bio = text(prof.bio).slice(0, 450);
  const designation = text(prof.currentDesignation).slice(0, 120);
  const company = text(prof.currentCompany).slice(0, 80);
  const tech = stringArray(prof.technicalSkills, 14).join(', ');
  const soft = stringArray(prof.softSkills, 8).join(', ');
  const experiences = stringArray(prof.experiences, 4);

  const cvScore = typeof metrics?.lastCvScore === 'number' ? metrics.lastCvScore : null;
  const quizLevel = text(metrics?.lastQuizLevel);
  const analysis =
    metrics?.lastAnalysis && typeof metrics.lastAnalysis === 'object'
      ? (metrics.lastAnalysis as Record<string, unknown>)
      : null;
  const missing = stringArray(analysis?.missingSkills, 6);

  const lines: string[] = [
    `Target field / role: ${profession}`,
    `Interview depth: calibrate to ${exp}`,
    goal ? `Stated career goal: ${goal}` : '',
    headline ? `Headline: ${headline}` : '',
    designation || company ? `Current / recent: ${[designation, company].filter(Boolean).join(' at ')}` : '',
    bio ? `Summary: ${bio}` : '',
    skills ? `Skills to reference if relevant: ${skills}` : '',
    tools ? `Tools: ${tools}` : '',
    tech ? `Technical skills: ${tech}` : '',
    soft ? `Soft skills: ${soft}` : '',
    experiences.length
      ? `Experience bullets (from profile):\n- ${experiences.slice(0, 3).join('\n- ')}`
      : '',
    cvScore != null ? `Latest CV review score (0–100 scale in app): ${cvScore}` : '',
    quizLevel ? `Latest quiz band: ${quizLevel}` : '',
    missing.length ? `Skill gaps flagged from CV analysis (optional hooks): ${missing.join(', ')}` : '',
  ];

  return lines.filter(Boolean).join('\n');
}

export function professionTitle(profile: Record<string, unknown>): string {
  return (
    text(profile.professionLabel) ||
    text(profile.professionKey) ||
    text((profile.professionalProfile as Record<string, unknown> | undefined)?.currentDesignation) ||
    'professional'
  );
}

/** Resolve prompt style from session profile (voice sessions set voiceInterviewLevel). */
export function interviewPromptStyle(profile: Record<string, unknown>): InterviewPromptStyle {
  const raw = (text(profile.voiceInterviewLevel) || text(profile.voice_interview_level)).toLowerCase();
  if (raw === 'advanced') return 'voice_advanced';
  if (raw === 'normal') return 'voice_normal';
  return 'typed';
}

/** Stored on session with profile; used only for prompting follow-up questions */
export const INTERVIEW_METRICS_KEY = '_aicocheInterviewMetrics';

export function stripInternalInterviewFields(profile: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...profile };
  delete copy[INTERVIEW_METRICS_KEY];
  delete copy.voiceInterviewLevel;
  delete copy.voice_interview_level;
  return copy;
}

export function readInterviewMetrics(profile: Record<string, unknown>): Record<string, unknown> | undefined {
  const raw = profile[INTERVIEW_METRICS_KEY];
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : undefined;
}

/** First token of a display/full string for interview address; empty if unusable. */
function firstNameFromDisplayString(raw: string): string {
  const compact = raw.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  const token = compact.split(' ').filter(Boolean)[0] ?? '';
  if (token.length < 2 || token.length > 48) return '';
  if (token.toLowerCase() === 'user') return '';
  return token;
}

type AuthNameHint = { user_metadata?: Record<string, unknown> } | null | undefined;

/** First name for prompts/TTS; profile first, then auth display metadata when profile name is missing. */
export function interviewCandidateFirstName(
  profile: Record<string, unknown>,
  authUser?: AuthNameHint,
): string {
  const prof = (profile.professionalProfile as Record<string, unknown> | undefined) ?? {};
  const fromProfile =
    firstNameFromDisplayString(text(prof.fullName)) ||
    firstNameFromDisplayString(text(profile.fullName)) ||
    firstNameFromDisplayString(text(profile.displayName)) ||
    firstNameFromDisplayString(text(profile.accountDisplayName)) ||
    firstNameFromDisplayString(text(prof.displayName));
  if (fromProfile) return fromProfile;

  const meta = authUser?.user_metadata;
  if (meta && typeof meta === 'object') {
    const fromAuth =
      firstNameFromDisplayString(text(meta.display_name)) ||
      firstNameFromDisplayString(text(meta.full_name)) ||
      firstNameFromDisplayString(text(meta.name));
    if (fromAuth) return fromAuth;
  }
  return '';
}

/**
 * Whether this follow-up turn should invite using the candidate's name (~half of eligible turns, stable per session).
 * Skips the first candidate answer turn so the opener stays neutral.
 */
export function interviewShouldAddressByNameThisTurn(sessionId: string, tentativeTurn: number): boolean {
  if (tentativeTurn < 2) return false;
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) {
    h = Math.imul(31, h) + sessionId.charCodeAt(i);
  }
  return (Math.abs(h) + tentativeTurn * 17) % 2 === 0;
}
