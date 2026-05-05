import { chatCompletionJson } from './openai.ts';

export type CvAiAnalysis = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
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
  location: '',
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

function repairExtractedTextArtifacts(value: string) {
  return value
    .replace(/\bReact\s+Na[\w()]{1,5}e\b/gi, 'React Native')
    .replace(/\bReact\s+Na\s*ve\b/gi, 'React Native')
    .replace(/\bReact\s+Nati\s*ve\b/gi, 'React Native')
    .replace(/\bJava\s*Script\b/g, 'JavaScript')
    .replace(/\bType\s*Script\b/g, 'TypeScript')
    .replace(/\bNode\s*\.?\s*js\b/gi, 'Node.js')
    .replace(/\bFire\s*base\b/gi, 'Firebase')
    .replace(/\bGit\s*Hub\b/gi, 'GitHub')
    .replace(/\bhBps:\/\//gi, 'https://')
    .replace(/\bPorJolio\b/gi, 'Portfolio');
}

function prepareCvText(text: string) {
  return repairExtractedTextArtifacts(text)
    .replace(/\s+(Summary|Professional Summary|Experience|Work Experience|Skills|Websites\s*&\s*Profiles|Education|Languages)\s+/gi, '\n$1\n')
    .replace(/\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*(?:[–-]\s*)?(?:Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}))\s+/gi, '\n$1\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function lines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
}

function normalizeCvTextOrder(text: string) {
  return prepareCvText(text);
}

function cleanSummary(value: string) {
  return lines(value)
    .filter((line) => !isContactLine(line))
    .filter((line) => !/linkedin|portfolio|github\.com|www\.|https?:\/\//i.test(line))
    .filter((line) => !/^-{3,}|page\s*\(?\d+\)?|break/i.test(line))
    .join('\n')
    .trim();
}

function cleanName(value: string | undefined) {
  const text = (value ?? '').trim();
  return /page\s*\(?\d+\)?|break|^-{3,}/i.test(text) ? '' : text;
}

function isSectionHeading(value: string) {
  return /^(professional summary|work experience|education|skills|projects|certifications)$/i.test(value.trim());
}

function looksLikePersonName(value: string) {
  const text = cleanName(value);
  if (!text || isContactLine(text) || isSectionHeading(text)) return false;
  if (/developer|engineer|designer|manager|analyst|experience|university|company|software|app|optimization|bug|resolution|notification|feature|community|portfolio|linkedin/i.test(text)) return false;
  const words = text.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 5 && words.every((word) => /^[A-Z][A-Za-z.'-]+$/.test(word));
}

function extractFullNameFromCvText(text: string) {
  const cvLines = lines(text).map(cleanName).filter(Boolean);
  const emailIndex = cvLines.findIndex((line) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line));
  if (emailIndex > 0) {
    const nearby = cvLines.slice(Math.max(0, emailIndex - 5), emailIndex);
    const name = [...nearby].reverse().find(looksLikePersonName);
    if (name) return name;
  }
  const firstRoleIndex = cvLines.findIndex((line) => /developer|engineer|designer|manager|analyst/i.test(line));
  const headerLines = cvLines.slice(0, firstRoleIndex > 0 ? firstRoleIndex : 8);
  return headerLines.find(looksLikePersonName) ?? cvLines.slice(0, 12).find(looksLikePersonName) ?? '';
}

function cleanIdentitySummary(value: string, fullName: string, currentRole: string) {
  const name = fullName.trim().toLowerCase();
  const role = currentRole.trim().toLowerCase();
  return lines(cleanSummary(value))
    .filter((line) => line.toLowerCase() !== name)
    .filter((line) => line.toLowerCase() !== role)
    .filter((line) => !looksLikePersonName(line))
    .filter((line) => !(role && line.toLowerCase().includes(role)))
    .join('\n')
    .trim();
}

function isContactLine(value: string) {
  return (
    /email|phone|location/i.test(value) ||
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /(?:\+?\d[\d\s().-]{7,}\d)/.test(value)
  );
}

function isLikelySkill(value: string) {
  const line = value.trim();
  if (!line || line.length > 45) return false;
  if (/^\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(line)) return false;
  if (/education|university|college|bachelor|master|degree|location|email|phone/i.test(line)) return false;
  if (/islamabad|rawalpindi|lahore|karachi|pakistan/i.test(line)) return false;
  if (/developer|engineer|designer|manager|analyst|company|pvt|ltd|software house/i.test(line)) return false;
  if (/^[-•]/.test(line) || /\.$/.test(line)) return false;
  return /[a-z]/i.test(line);
}

function isRoleLine(value: string) {
  return (
    /developer|engineer|designer|manager|analyst|consultant|specialist/i.test(value) &&
    !/with\s+\d+\s+years|professional summary|summary|skills|websites|profiles|education|languages/i.test(value)
  );
}

function splitRoleLine(value: string) {
  const withoutDate = removeDateRange(value).replace(/\s+/g, ' ').trim();
  if (/\s+[—-]\s+/.test(value)) {
    const [title, company = ''] = withoutDate.split(/\s+[—-]\s+/);
    return { title: title.trim(), company: company.split(',')[0]?.trim() ?? '' };
  }

  const match = withoutDate.match(/^(.+?\b(?:developer|engineer|designer|manager|analyst|consultant|specialist))\s+(.+)$/i);
  return {
    title: (match?.[1] ?? withoutDate).trim(),
    company: (match?.[2] ?? '').split(',')[0]?.trim() ?? '',
  };
}

const dateRangePattern = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|\d{4})\s*(?:[–-]\s*)?((?:present|current|now)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|\d{4})/i;

function parseDateRange(value: string) {
  const match = value.match(dateRangePattern);
  return {
    startDate: match?.[1] ?? '',
    endDate: match?.[2] ?? '',
  };
}

function removeDateRange(value: string) {
  return value.replace(dateRangePattern, '').trim();
}

function looksLikeCompanyLine(value: string) {
  const line = value.trim();
  return (
    Boolean(line) &&
    !isRoleLine(line) &&
    !isContactLine(line) &&
    !dateRangePattern.test(line) &&
    !/developed|integrated|collaborated|identified|performed|created|automated|improved|resolved|took|built|designed/i.test(line) &&
    /company|technologies|space|electric|pvt|ltd|inc|llc|organization|studio|labs|solutions|islamabad|lahore|karachi/i.test(line)
  );
}

function parseWorkExperiences(workText: string, skillNames: string[]): CvAiAnalysis['experiences'] {
  const workLines = lines(workText);
  const experiences: CvAiAnalysis['experiences'] = [];

  for (let index = 0; index < workLines.length; index += 1) {
    const roleLine = workLines[index];
    if (!isRoleLine(roleLine)) continue;

    const { title, company } = splitRoleLine(roleLine);
    const nextRoleIndex = workLines.findIndex((line, nextIndex) => nextIndex > index && isRoleLine(line));
    const block = workLines.slice(index + 1, nextRoleIndex === -1 ? workLines.length : nextRoleIndex);
    const dateLine = [roleLine, ...block].find((line) => /\d{4}/.test(line)) ?? '';
    const { startDate, endDate } = parseDateRange(dateLine);
    const companyLine = block.find(looksLikeCompanyLine) ?? '';
    const responsibilities = block
      .filter((line) => line !== dateLine)
      .filter((line) => line !== companyLine)
      .filter((line) => !/^[A-Za-z\s]+,\s*[A-Za-z\s]+$/.test(line))
      .filter((line) => !isContactLine(line))
      .filter((line) => !/professional summary|education|skills/i.test(line));

    experiences.push({
      company: company || companyLine.split(',')[0]?.trim() || '',
      title,
      startDate,
      endDate,
      responsibilities,
      achievements: [],
      skills: skillNames.slice(0, 8),
    });
  }

  return experiences;
}

function parseEducation(educationText: string): CvAiAnalysis['education'] {
  const educationLines = lines(educationText);
  if (!educationLines.length) return [];

  const degreeLine = educationLines.find((line) => /bachelor|master|degree|diploma|science|computer/i.test(line)) ?? educationLines[0];
  const institutionLine =
    educationLines.find((line) => /university|college|institute|school/i.test(line)) ??
    educationLines.find((line) => line !== degreeLine && !/\d{4}/.test(line)) ??
    '';
  const dateLine = educationLines.find((line) => /\d{4}/.test(line)) ?? '';
  const { startDate, endDate } = parseDateRange(dateLine);
  const fieldOfStudy = degreeLine.match(/\bin\s+(.+)$/i)?.[1]?.trim() ?? '';

  return [
    {
      institution: institutionLine,
      degree: degreeLine,
      fieldOfStudy,
      startDate,
      endDate,
      description: educationLines.join('\n'),
    },
  ];
}

function isValidExperience(item: CvAiAnalysis['experiences'][number]) {
  return (
    Boolean(item.title.trim()) &&
    item.title.length < 80 &&
    !/professional summary|with\s+\d+\s+years/i.test(item.title) &&
    !/^company$/i.test(item.company)
  );
}

function normalizeExperienceFields(item: CvAiAnalysis['experiences'][number]) {
  const combined = [item.title, item.company, item.startDate, item.endDate].filter(Boolean).join(' ');
  const range = combined.match(dateRangePattern);
  const companyLooksLikeEndDate = /^(present|current|now)$/i.test(item.company.trim());

  return {
    ...item,
    title: removeDateRange(item.title).replace(/\s+/g, ' ').trim() || item.title,
    company: companyLooksLikeEndDate ? '' : removeDateRange(item.company).replace(/\s+/g, ' ').trim(),
    startDate: item.startDate || range?.[1] || '',
    endDate: item.endDate || range?.[2] || (companyLooksLikeEndDate ? item.company : ''),
  };
}

function parseFallbackAnalysis(cvText: string, targetRole?: string): CvAiAnalysis {
  cvText = normalizeCvTextOrder(cvText);

  if (cvText.includes('%PDF-') || /\/Type\s*\/(?:Page|Catalog|Font)/.test(cvText.slice(0, 1200))) {
    return {
      ...emptyAnalysis,
      weaknesses: ['CV text could not be extracted cleanly from the PDF.'],
      improvementSuggestions: ['Upload a text-based PDF or DOCX so profile sections can be parsed accurately.'],
      recommendedSkills: targetRole ? [`Skills aligned with ${targetRole}`] : ['Target-role keywords'],
    };
  }

  const allLines = lines(cvText);
  const email = cvText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const phone = cvText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? '';
  const location =
    cvText.match(/location\s*:?\s*([^\n]+)/i)?.[1]?.trim() ??
    allLines.find((line) => /islamabad|rawalpindi|lahore|karachi|pakistan/i.test(line)) ??
    '';
  const fullName = extractFullNameFromCvText(cvText);
  const currentRoleLine = allLines.find((line) => isRoleLine(line) && /present|current|now/i.test(line)) ??
    allLines.find(isRoleLine);
  const sectionEnds = [
    /^summary$/im,
    /^professional summary$/im,
    /^(?:work\s+)?experience$/im,
    /^education$/im,
    /^skills$/im,
    /^projects$/im,
    /^websites\s*&\s*profiles$/im,
    /^languages$/im,
  ];
  const summary = sectionBetween(cvText, /^summary$|^professional summary$/im, sectionEnds.filter((item) => !/summary/i.test(item.source)));
  const workText = sectionBetween(cvText, /^(?:work\s+)?experience$/im, [/^education$/im, /^skills$/im, /^projects$/im, /^websites\s*&\s*profiles$/im, /^languages$/im]);
  const education = parseEducation(sectionBetween(cvText, /^education$/im, [/^skills$/im, /^projects$/im, /^websites\s*&\s*profiles$/im, /^languages$/im]));
  const skillNames = sectionBetween(cvText, /^skills$/im, [/^projects$/im, /^websites\s*&\s*profiles$/im, /^education$/im, /^languages$/im])
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(isLikelySkill);
  const projectLines = lines(sectionBetween(cvText, /projects/i, [/certifications/i]));
  const experiences = parseWorkExperiences(workText, skillNames);

  return {
    ...emptyAnalysis,
    fullName,
    email,
    phone,
    location,
    currentRole: splitRoleLine(currentRoleLine ?? '').title || targetRole || '',
    summary: cleanSummary(summary) || cleanSummary(cvText).slice(0, 500),
    experiences,
    education,
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
    strengths: [
      'CV content was parsed successfully and core profile sections are readable.',
      targetRole
        ? `The CV has enough context to align toward ${targetRole}.`
        : 'The CV includes enough context to build a career profile.',
    ],
    weaknesses: [
      'Most experience bullets need stronger measurable outcomes such as revenue, users, speed, quality, or delivery impact.',
      'Skills and projects should be grouped more clearly so recruiters can scan the CV faster.',
    ],
    improvementSuggestions: [
      'Rewrite each role with 2-3 achievement bullets using this format: action + tool/skill + measurable result.',
      'Add project links, portfolio links, or GitHub links where possible to prove practical work.',
      targetRole
        ? `Add target keywords for ${targetRole} in the summary, skills, and recent project bullets.`
        : 'Add target-role keywords in the summary, skills, and project bullets.',
    ],
    recommendedSkills: targetRole ? [`Skills aligned with ${targetRole}`] : ['Target-role keywords'],
    jobRoleFit: {},
  };
}

function mergeWithSectionParse(ai: CvAiAnalysis, parsed: CvAiAnalysis): CvAiAnalysis {
  const aiName = cleanName(ai.fullName);
  const parsedName = cleanName(parsed.fullName);
  const fullName = looksLikePersonName(aiName) ? aiName : parsedName;
  const currentRole = ai.currentRole || parsed.currentRole;
  const summary =
    cleanIdentitySummary(ai.summary, fullName, currentRole) ||
    cleanIdentitySummary(parsed.summary, fullName, currentRole);
  const aiExperiences = ai.experiences.map(normalizeExperienceFields).filter(isValidExperience);
  const parsedExperiences = parsed.experiences.map(normalizeExperienceFields).filter(isValidExperience);
  const experiences = aiExperiences.length ? aiExperiences : parsedExperiences;

  return {
    ...ai,
    fullName,
    email: parsed.email || ai.email,
    phone: parsed.phone || ai.phone,
    location: parsed.location || ai.location,
    currentRole,
    summary,
    experiences,
    education: parsed.education.length ? parsed.education : ai.education,
    skills: parsed.skills.length ? parsed.skills : ai.skills,
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown) {
  return typeof value === 'string' ? repairExtractedTextArtifacts(value).trim() : '';
}

function asScore(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 70;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function asSkillCategory(value: unknown): CvAiAnalysis['skills'][number]['category'] {
  const category = asString(value);
  return ['technical', 'soft', 'tool', 'language', 'other'].includes(category)
    ? (category as CvAiAnalysis['skills'][number]['category'])
    : 'technical';
}

export function normalizeCvAnalysis(value: Record<string, unknown>): CvAiAnalysis {
  const skills = asArray<{ name?: unknown; category?: unknown; proficiency?: unknown }>(value.skills)
    .map((item) => ({
      name: asString(item.name),
      category: asSkillCategory(item.category),
      proficiency: asString(item.proficiency),
    }))
    .filter((item) => isLikelySkill(item.name));

  const experiences = asArray<Record<string, unknown>>(value.experiences)
    .map((item) =>
      normalizeExperienceFields({
        company: asString(item.company),
        title: asString(item.title),
        startDate: asString(item.startDate),
        endDate: asString(item.endDate),
        responsibilities: asArray<string>(item.responsibilities).map(asString).filter(Boolean),
        achievements: asArray<string>(item.achievements).map(asString).filter(Boolean),
        skills: asArray<string>(item.skills).map(asString).filter(Boolean),
      })
    )
    .filter(isValidExperience);

  return {
    ...emptyAnalysis,
    fullName: asString(value.fullName),
    email: asString(value.email),
    phone: asString(value.phone),
    location: asString(value.location),
    currentRole: asString(value.currentRole),
    summary: cleanSummary(asString(value.summary)),
    experiences,
    education: asArray(value.education),
    skills,
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
  const preparedText = prepareCvText(cvText);
  const fallback = parseFallbackAnalysis(preparedText, targetRole);

  const raw = await chatCompletionJson(
    [
      {
        role: 'system',
        content: `You are an expert career coach and resume parser. Return ONLY valid JSON with:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "location": string,
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
Use empty strings or empty arrays when unknown. Score is 0-100.
Critical extraction rules:
- If a role has Present, Current, Now, or an open-ended date range, that is the current employment.
- currentRole must be the title of the current/present role only.
- For each experience, title must contain only the job title. Do not include dates in title.
- For each experience, company must contain only the employer/company name. Do not put Present, dates, or responsibilities in company.
- For each experience, startDate and endDate must be separated. Keep "Present" as endDate for current jobs.
- If the PDF text merges words like "React Native DeveloperAug 2024 Present", split it into title "React Native Developer", startDate "Aug 2024", endDate "Present".
- Correct obvious PDF/OCR extraction mistakes in common technical terms, for example "React NaOve" or "React Na(ve" should be "React Native".
- summary must be a clean professional paragraph only. Do not include name, email, phone, LinkedIn, portfolio URL, or repeated job title in summary.
- Do not duplicate the current/present role as a separate past role.
Make the analysis practical and specific:
- strengths must explain what is already working in the CV
- weaknesses must explain what is hurting the CV
- improvementSuggestions must be direct next steps the user can apply
- recommendedSkills must be target-role skills, not generic filler
- avoid vague phrases like "good communication" unless the CV proves it`,
      },
      {
        role: 'user',
        content: `Target role: ${targetRole ?? 'not specified'}

CV text:
---
${preparedText.slice(0, 28_000)}
---`,
      },
    ],
    { temperature: 0.2 }
  );

  if (!raw) return fallback;

  try {
    return mergeWithSectionParse(normalizeCvAnalysis(JSON.parse(raw) as Record<string, unknown>), fallback);
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
