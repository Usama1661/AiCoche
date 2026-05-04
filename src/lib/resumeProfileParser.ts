import type { ProfessionalExperience, ProfessionalProfile } from '@/src/types/user';
import { emptyProfessionalProfile } from '@/src/store/profileStore';

const TECH_SKILL_HINTS = [
  'react',
  'react native',
  'typescript',
  'javascript',
  'node',
  'python',
  'java',
  'swift',
  'kotlin',
  'sql',
  'supabase',
  'firebase',
  'aws',
  'docker',
  'git',
  'figma',
];

const SOFT_SKILL_HINTS = [
  'communication',
  'collaboration',
  'leadership',
  'problem solving',
  'mentoring',
  'stakeholder management',
  'ownership',
  'adaptability',
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function listFrom(value: string) {
  return unique(value.split(/[,;|•\n]/).map((item) => item.replace(/^[-*]\s*/, '')));
}

function section(text: string, labels: string[]) {
  const labelPattern = labels.join('|');
  const nextLabel =
    'summary|profile|about|experience|employment|work history|skills|technical skills|soft skills|certifications|education|projects';
  const match = text.match(
    new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextLabel})\\s*:?|$)`, 'i')
  );
  return clean(match?.[1] ?? '');
}

function labeledValue(text: string, labels: string[]) {
  const labelPattern = labels.join('|');
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*:?\\s*(.+)`, 'i'));
  return clean(match?.[1] ?? '');
}

function nameFromFile(fileName?: string | null) {
  if (!fileName) return '';
  const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
  const cleaned = withoutExtension.replace(/cv|resume|profile/gi, '').replace(/[_-]+/g, ' ');
  return clean(cleaned);
}

function inferSkills(text: string, hints: string[]) {
  const lower = text.toLowerCase();
  return hints.filter((hint) => lower.includes(hint)).map((hint) => hint.replace(/\b\w/g, (c) => c.toUpperCase()));
}

function parseExperience(text: string, technicalSkills: string[]) {
  const experienceText = section(text, ['experience', 'work experience', 'employment', 'work history']);
  if (!experienceText) return [];

  const lines = experienceText
    .split('\n')
    .map(clean)
    .filter(Boolean);

  const jobs: ProfessionalExperience[] = [];
  lines.forEach((line) => {
    const match = line.match(
      /(.+?)\s+(?:at|@|-)\s+(.+?)(?:\s+\(?((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}).*)\)?)?$/i
    );
    if (!match) return;
    const dates = clean(match[3] ?? '');
    const [startDate = '', endDate = 'Present'] = dates.split(/\s*(?:-|to|–|—)\s*/i);
    jobs.push({
      id: makeId('experience'),
      title: clean(match[1]),
      company: clean(match[2]),
      startDate: clean(startDate),
      endDate: clean(endDate),
      responsibilities: [],
      skills: technicalSkills.slice(0, 5),
    });
  });

  return jobs;
}

export function parseProfessionalProfileFromResume({
  resumeText,
  fileName,
  displayName,
  fallbackHeadline,
}: {
  resumeText: string;
  fileName?: string | null;
  displayName?: string;
  fallbackHeadline?: string;
}): ProfessionalProfile {
  const lines = resumeText
    .split('\n')
    .map(clean)
    .filter(Boolean);
  const firstLine = lines.find((line) => !/^(summary|profile|skills|experience|education)\b/i.test(line));
  const fullName = labeledValue(resumeText, ['name', 'full name']) || displayName || nameFromFile(fileName) || firstLine || '';
  const headline =
    labeledValue(resumeText, ['headline', 'designation', 'title']) || fallbackHeadline || 'Professional';
  const bio =
    section(resumeText, ['summary', 'professional summary', 'profile', 'about']) ||
    lines.slice(0, 3).join(' ');
  const listedTechnicalSkills = listFrom(
    section(resumeText, ['technical skills', 'skills', 'technologies', 'tools'])
  );
  const listedSoftSkills = listFrom(section(resumeText, ['soft skills']));
  const technicalSkills = unique([...listedTechnicalSkills, ...inferSkills(resumeText, TECH_SKILL_HINTS)]);
  const softSkills = unique([...listedSoftSkills, ...inferSkills(resumeText, SOFT_SKILL_HINTS)]);
  const experiences = parseExperience(resumeText, technicalSkills);
  const currentExperience =
    experiences.find((item) => /present|current|now/i.test(item.endDate)) ?? experiences[0];
  const certifications = listFrom(section(resumeText, ['certifications', 'certificates', 'badges'])).map(
    (name) => ({
      id: makeId('certification'),
      name,
      issuer: '',
      date: '',
    })
  );

  return {
    ...emptyProfessionalProfile,
    fullName,
    headline,
    bio,
    experiences,
    currentCompany: currentExperience?.company ?? '',
    currentDesignation: currentExperience?.title ?? headline,
    employmentStatus: currentExperience ? 'Employed' : '',
    technicalSkills,
    softSkills,
    certifications,
    source: 'resume',
    updatedAt: new Date().toISOString(),
  };
}
