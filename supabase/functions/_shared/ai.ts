import { chatCompletionJson } from './openai.ts';

export type CvAiAnalysis = {
  fullName: string;
  email: string;
  phone: string;
  currentRole: string;
  summary: string;
  experiences: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    responsibilities: string[];
    achievements: string[];
    skills: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  skills: Array<{ name: string; category: 'technical' | 'soft' | 'tool' | 'language' | 'other'; proficiency: string }>;
  certifications: Array<{ name: string; issuer: string; date: string; credentialUrl: string }>;
  projects: Array<{ name: string; description: string; role: string; technologies: string[]; url: string }>;
  cvScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  recommendedSkills: string[];
  jobRoleFit: Record<string, unknown>;
};

const emptyAnalysis: CvAiAnalysis = {
  fullName: '',
  email: '',
  phone: '',
  currentRole: '',
  summary: '',
  experiences: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  cvScore: 70,
  strengths: [],
  weaknesses: [],
  improvementSuggestions: [],
  recommendedSkills: [],
  jobRoleFit: {},
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asScore(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 70;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function normalizeCvAnalysis(value: Record<string, unknown>): CvAiAnalysis {
  return {
    ...emptyAnalysis,
    fullName: asString(value.fullName),
    email: asString(value.email),
    phone: asString(value.phone),
    currentRole: asString(value.currentRole),
    summary: asString(value.summary),
    experiences: asArray(value.experiences),
    education: asArray(value.education),
    skills: asArray(value.skills),
    certifications: asArray(value.certifications),
    projects: asArray(value.projects),
    cvScore: asScore(value.cvScore),
    strengths: asArray<string>(value.strengths).map(asString).filter(Boolean),
    weaknesses: asArray<string>(value.weaknesses).map(asString).filter(Boolean),
    improvementSuggestions: asArray<string>(value.improvementSuggestions).map(asString).filter(Boolean),
    recommendedSkills: asArray<string>(value.recommendedSkills).map(asString).filter(Boolean),
    jobRoleFit:
      value.jobRoleFit && typeof value.jobRoleFit === 'object'
        ? (value.jobRoleFit as Record<string, unknown>)
        : {},
  };
}

export async function analyzeCvWithAi(cvText: string, targetRole?: string): Promise<CvAiAnalysis> {
  const fallback = {
    ...emptyAnalysis,
    summary: cvText.slice(0, 500),
    cvScore: cvText.length > 1200 ? 76 : 62,
    strengths: ['Resume content is available for review.'],
    weaknesses: ['Add more quantified outcomes and role-specific keywords.'],
    improvementSuggestions: ['Include measurable achievements for each role.', 'Group skills by category.'],
    recommendedSkills: targetRole ? [`Skills aligned with ${targetRole}`] : ['Target-role keywords'],
  };

  const raw = await chatCompletionJson(
    [
      {
        role: 'system',
        content: `You are an expert career coach and resume parser. Return ONLY valid JSON with:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "currentRole": string,
  "summary": string,
  "experiences": [{"company": string, "title": string, "startDate": string, "endDate": string, "responsibilities": string[], "achievements": string[], "skills": string[]}],
  "education": [{"institution": string, "degree": string, "fieldOfStudy": string, "startDate": string, "endDate": string, "description": string}],
  "skills": [{"name": string, "category": "technical" | "soft" | "tool" | "language" | "other", "proficiency": string}],
  "certifications": [{"name": string, "issuer": string, "date": string, "credentialUrl": string}],
  "projects": [{"name": string, "description": string, "role": string, "technologies": string[], "url": string}],
  "cvScore": number,
  "strengths": string[],
  "weaknesses": string[],
  "improvementSuggestions": string[],
  "recommendedSkills": string[],
  "jobRoleFit": object
}
Use empty strings or empty arrays when unknown. Score is 0-100.`,
      },
      {
        role: 'user',
        content: `Target role: ${targetRole ?? 'not specified'}

CV text:
---
${cvText.slice(0, 28_000)}
---`,
      },
    ],
    { temperature: 0.2 }
  );

  if (!raw) return fallback;

  try {
    return normalizeCvAnalysis(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return fallback;
  }
}

export async function generateQuizWithAi({
  topic,
  difficulty,
  skills,
  count,
}: {
  topic: string;
  difficulty: string;
  skills: string[];
  count: number;
}) {
  const raw = await chatCompletionJson(
    [
      {
        role: 'system',
        content: `Create career skill quiz questions. Return ONLY JSON:
{"questions":[{"id": string, "question": string, "options": string[], "answerIndex": number, "explanation": string}]}`,
      },
      {
        role: 'user',
        content: `Topic: ${topic}
Difficulty: ${difficulty}
Relevant skills: ${skills.join(', ')}
Question count: ${count}`,
      },
    ],
    { temperature: 0.45 }
  );

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { questions?: unknown[] };
      if (Array.isArray(parsed.questions) && parsed.questions.length) return parsed.questions;
    } catch {
      // Use fallback below.
    }
  }

  return Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
    question: `Which practice best improves ${topic} readiness?`,
    options: ['Memorize answers', 'Build projects and review feedback', 'Avoid interviews', 'Skip fundamentals'],
    answerIndex: 1,
    explanation: 'Practical application and feedback build durable interview readiness.',
    order: index + 1,
  }));
}
