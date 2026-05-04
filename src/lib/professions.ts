export type Profession = {
  key: string;
  label: string;
};

/** Expandable list — not developer-only; keyed for analytics & personalization */
export const PROFESSIONS: Profession[] = [
  { key: 'software_developer', label: 'Software Developer' },
  { key: 'web_developer', label: 'Web Developer' },
  { key: 'mobile_developer', label: 'Mobile App Developer' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'nurse', label: 'Nurse' },
  { key: 'news_anchor', label: 'News Anchor' },
  { key: 'content_writer', label: 'Content Writer' },
  { key: 'graphic_designer', label: 'Graphic Designer' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'accountant', label: 'Accountant' },
  { key: 'marketing_specialist', label: 'Marketing Specialist' },
  { key: 'data_scientist', label: 'Data Scientist' },
  { key: 'ai_engineer', label: 'AI Engineer' },
  { key: 'cybersecurity_analyst', label: 'Cybersecurity Analyst' },
  { key: 'cloud_architect', label: 'Cloud Architect' },
  { key: 'data_analyst', label: 'Data Analyst' },
  { key: 'product_manager', label: 'Product Manager' },
  { key: 'ux_designer', label: 'UX Designer' },
  { key: 'devops_engineer', label: 'DevOps Engineer' },
  { key: 'qa_engineer', label: 'QA Engineer' },
];

export function searchProfessions(query: string): Profession[] {
  const q = query.trim().toLowerCase();
  if (!q) return PROFESSIONS;
  return PROFESSIONS.filter(
    (p) =>
      p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
  );
}
