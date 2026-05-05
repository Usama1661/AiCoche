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

function sectionBetween(text: string, start: RegExp, end: RegExp[]) {
  const match = start.exec(text);
  if (!match || match.index == null) return '';
  const from = match.index + match[0].length;
  const rest = text.slice(from);
  const next = end
    .map((pattern) => {
      const found = pattern.exec(rest);
      return found ? found.index : -1;
    })
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  return (next == null ? rest : rest.slice(0, next)).trim();
}

function lines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
}

function parseFallbackAnalysis(cvText: string, targetRole?: string): CvAiAnalysis {
  const allLines = lines(cvText);
  const email = cvText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const phone = cvText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? '';
  const fullName = allLines[0] ?? '';
  const currentRole = allLines[1] ?? targetRole ?? '';
  const sectionEnds = [
    /professional summary/i,
    /work experience/i,
    /education/i,
    /skills/i,
    /projects/i,
    /certifications/i,
  ];
  const summary = sectionBetween(cvText, /professional summary/i, sectionEnds.filter((item) => !/professional/i.test(item.source)));
  const workLines = lines(sectionBetween(cvText, /work experience/i, [/education/i, /skills/i, /projects/i, /certifications/i]));
  const educationLines = lines(sectionBetween(cvText, /education/i, [/skills/i, /projects/i, /certifications/i]));
  const skillNames = sectionBetween(cvText, /skills/i, [/projects/i, /certifications/i, /work experience/i])
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const projectLines = lines(sectionBetween(cvText, /projects/i, [/certifications/i]));

  const experiences = workLines
    .filter((line) => /developer|engineer|manager|designer|analyst|consultant|specialist/i.test(line))
    .map((line) => {
      const [titlePart, companyPart = ''] = line.split(/\s+[—-]\s+/);
      return {
        company: companyPart.split(',')[0]?.trim() ?? '',
        title: titlePart.trim(),
        startDate: '',
        endDate: /present/i.test(line) ? 'Present' : '',
        responsibilities: workLines.filter((item) => item !== line && !/\d{4}/.test(item)).slice(0, 4),
        achievements: [],
        skills: skillNames.slice(0, 8),
      };
    });

  return {
    ...emptyAnalysis,
    fullName,
    email,
    phone,
    currentRole,
    summary: summary || cvText.slice(0, 500),
    experiences,
    education: educationLines.length
      ? [
          {
            institution: educationLines[1] ?? educationLines[0] ?? '',
            degree: educationLines[0] ?? '',
            fieldOfStudy: '',
            startDate: '',
            endDate: educationLines.find((line) => /\d{4}/.test(line)) ?? '',
            description: educationLines.join('\n'),
          },
        ]
      : [],
    skills: skillNames.map((name) => ({
      name,
      category: /xcode|android studio|git|github|expo|firebase|supabase/i.test(name) ? 'tool' : 'technical',
      proficiency: '',
    })),
    projects: projectLines.map((name) => ({
      name,
      description: '',
      role: '',
      technologies: skillNames.slice(0, 6),
      url: '',
    })),
    cvScore: cvText.length > 1200 ? 76 : 62,
    strengths: ['CV content was parsed and structured successfully.'],
    weaknesses: ['Add more quantified impact and measurable outcomes.'],
    improvementSuggestions: ['Add metrics to each role.', 'Group skills by category.', 'Add links for projects where possible.'],
    recommendedSkills: targetRole ? [`Skills aligned with ${targetRole}`] : ['Target-role keywords'],
    jobRoleFit: {},
  };
}

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
  const fallback = parseFallbackAnalysis(cvText, targetRole);

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
