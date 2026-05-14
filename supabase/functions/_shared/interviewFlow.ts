import { isHonestIDKOrNoAnswer } from './interviewAnswerGate.ts';
import { chatCompletionJson } from './openai.ts';
import { stripFeedbackTrailingQuestionsForDelivery } from './interviewFeedbackSanitize.ts';

export const INTERVIEW_MAX_TURNS = 6;

export type InterviewQuestionCategory =
  | 'cv_based'
  | 'technology'
  | 'general_field'
  | 'scenario'
  | 'behavioral';

export type QueuedInterviewQuestion = {
  question: string;
  category: InterviewQuestionCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  relatedSkill: string;
};

export type InterviewTurnLog = {
  question: string;
  category: string;
  difficulty: string;
  relatedSkill: string;
  userAnswer: string;
  feedback: string;
  score: number;
  strengths: string[];
  improvements: string[];
  detectedIntent: string;
  confidence: number;
  isCorrect: boolean;
  timestamp: string;
};

export type InterviewSummary = {
  overallScore: number;
  strongAreas: string[];
  weakAreas: string[];
  suggestedPracticeTopics: string[];
  categoryScores: Record<string, number>;
};

export type InterviewPlanV1 = {
  v: 1;
  queue: QueuedInterviewQuestion[];
  turns: InterviewTurnLog[];
  summary?: InterviewSummary | null;
};

export type EvaluatorResult = {
  score: number;
  isCorrect: boolean;
  feedback: string;
  strengths: string[];
  improvements: string[];
  shouldMoveNext: boolean;
  detectedIntent: 'answered' | 'dont_know' | 'unclear' | 'off_topic' | string;
  confidence: number;
};

const EVALUATOR_SYSTEM = `You are a professional AI interview evaluator.

Your job is to evaluate the candidate's answer like a real interviewer.

Rules:
- Evaluate meaning, not exact wording.
- Accept different wording if the candidate shows understanding.
- Ignore minor spelling, grammar, and pronunciation mistakes.
- Understand broken English and Roman Urdu.
- If the candidate says "I don't know", "not sure", "no idea", "pata nahi", or similar, mark it low but respond politely.
- Do not give the complete correct answer.
- Give only short interview-style feedback.
- Mention what was good and what was missing.
- Do not hallucinate.
- Do not be too harsh.
- Do not be overly generous.
- Score fairly from 0 to 10.
- Return JSON only.

Expected JSON response format:

{
  "score": 0,
  "isCorrect": false,
  "feedback": "Short professional feedback only. Do not reveal the full correct answer.",
  "strengths": [],
  "improvements": [],
  "shouldMoveNext": true,
  "detectedIntent": "answered | dont_know | unclear | off_topic",
  "confidence": 0.0
}

Scoring guide:
- 0: No answer / I don't know / completely irrelevant
- 1-3: Very weak answer with little understanding
- 4-5: Partially correct but missing important points
- 6-7: Mostly correct with minor gaps
- 8-9: Strong answer with good understanding
- 10: Excellent answer with clear, practical, and complete explanation

For "I don't know" answers:
Return:
{
  "score": 0,
  "isCorrect": false,
  "feedback": "That's okay. This is an area you can improve with more practice. Let's move to the next question.",
  "strengths": [],
  "improvements": ["Needs more understanding of this topic"],
  "shouldMoveNext": true,
  "detectedIntent": "dont_know",
  "confidence": 1.0
}`;

const QUESTION_BATCH_SYSTEM = `You are a professional technical interviewer.

Generate exactly 6 interview questions based on the candidate CV/profile.

Question rules:
- Ask one question at a time (each array item is a single question).
- Mix CV-based, technical, scenario-based, and behavioral questions across the 6.
- Start with easier questions, then increase difficulty.
- Prefer technologies and projects mentioned in the candidate CV.
- Do not ask random unrelated questions.
- Keep each question clear and short.
- Do not include the correct answer in any question.
- In 2 or 3 of the 6 questions, naturally use the candidate's first name once if a first name is provided (only if it sounds natural); other questions should use "you" only.
- Return JSON only.

Question JSON format for the array items:

{
  "question": "Question text here",
  "category": "cv_based | technology | general_field | scenario | behavioral",
  "difficulty": "easy | medium | hard",
  "relatedSkill": "React Native / .NET / SQL / Azure / etc"
}

Return ONLY valid JSON in this shape:
{"questions":[ /* 6 objects following the item format above */ ]}`;

const VALID_CATEGORIES: InterviewQuestionCategory[] = [
  'cv_based',
  'technology',
  'general_field',
  'scenario',
  'behavioral',
];

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(10, Math.max(0, Math.round(n)));
}

function coerceCategory(raw: string): InterviewQuestionCategory {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (VALID_CATEGORIES.includes(s as InterviewQuestionCategory)) return s as InterviewQuestionCategory;
  return 'general_field';
}

function coerceDifficulty(raw: string): 'easy' | 'medium' | 'hard' {
  const s = raw.trim().toLowerCase();
  if (s === 'easy' || s === 'medium' || s === 'hard') return s;
  return 'medium';
}

export function parseInterviewPlan(raw: unknown): InterviewPlanV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  const queue = Array.isArray(o.queue) ? o.queue : [];
  const outQueue: QueuedInterviewQuestion[] = [];
  for (const item of queue) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    const question = typeof q.question === 'string' ? q.question.trim() : '';
    if (!question) continue;
    outQueue.push({
      question,
      category: coerceCategory(typeof q.category === 'string' ? q.category : ''),
      difficulty: coerceDifficulty(typeof q.difficulty === 'string' ? q.difficulty : ''),
      relatedSkill: typeof q.relatedSkill === 'string' ? q.relatedSkill.trim() : 'General',
    });
  }
  const turns: InterviewTurnLog[] = Array.isArray(o.turns)
    ? (o.turns as InterviewTurnLog[]).filter((t) => t && typeof t === 'object' && typeof (t as InterviewTurnLog).question === 'string')
    : [];
  const summary =
    o.summary && typeof o.summary === 'object' && o.summary !== null ? (o.summary as InterviewSummary) : undefined;
  if (outQueue.length < INTERVIEW_MAX_TURNS) return null;
  return { v: 1, queue: outQueue.slice(0, INTERVIEW_MAX_TURNS), turns, summary: summary ?? null };
}

export function emptyInterviewPlan(): InterviewPlanV1 {
  return { v: 1, queue: [], turns: [] };
}

function fallbackQueue(profession: string, firstName: string): QueuedInterviewQuestion[] {
  const nameBit = firstName ? `${firstName}, ` : '';
  const role = profession.trim() || 'this role';
  return [
    {
      question: `${nameBit}what part of your background best shows you are ready for ${role}?`,
      category: 'cv_based',
      difficulty: 'easy',
      relatedSkill: 'Profile',
    },
    {
      question: `Walk me through one recent project or responsibility that is closest to ${role}.`,
      category: 'cv_based',
      difficulty: 'easy',
      relatedSkill: 'Experience',
    },
    {
      question: `For ${role}, which technical concept do you rely on most day to day, and why?`,
      category: 'technology',
      difficulty: 'medium',
      relatedSkill: 'Core stack',
    },
    {
      question: `How do you validate quality before you ship or merge work in ${role}?`,
      category: 'general_field',
      difficulty: 'medium',
      relatedSkill: 'Quality',
    },
    {
      question: `Describe a realistic situation where priorities shifted mid delivery. What did you do?`,
      category: 'scenario',
      difficulty: 'medium',
      relatedSkill: 'Delivery',
    },
    {
      question: `${firstName ? `${firstName}, ` : ''}tell me about a time you disagreed with a teammate or stakeholder. How did you handle it?`,
      category: 'behavioral',
      difficulty: 'hard',
      relatedSkill: 'Collaboration',
    },
  ];
}

function parseQuestionBatchJson(raw: string | null): QueuedInterviewQuestion[] | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { questions?: unknown };
    if (!Array.isArray(p.questions) || p.questions.length < 1) return null;
    const out: QueuedInterviewQuestion[] = [];
    for (const item of p.questions) {
      if (!item || typeof item !== 'object') continue;
      const q = item as Record<string, unknown>;
      const question = typeof q.question === 'string' ? q.question.trim() : '';
      if (!question) continue;
      out.push({
        question,
        category: coerceCategory(typeof q.category === 'string' ? q.category : ''),
        difficulty: coerceDifficulty(typeof q.difficulty === 'string' ? q.difficulty : ''),
        relatedSkill: typeof q.relatedSkill === 'string' ? q.relatedSkill.trim() : 'General',
      });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

export async function generateInterviewQuestionQueue(params: {
  profession: string;
  candidateSummary: string;
  profileJson: string;
  candidateFirstName: string;
}): Promise<InterviewPlanV1> {
  const { profession, candidateSummary, profileJson, candidateFirstName } = params;
  const nameLine = candidateFirstName
    ? `Candidate first name (use in 2–3 questions only when natural): "${candidateFirstName}".`
    : 'No first name provided — address the candidate as "you" only.';

  const userContent = `Target role / field: ${profession}

${nameLine}

Candidate summary:
---
${candidateSummary}
---

Structured profile JSON:
${profileJson}

Produce exactly 6 questions as specified.`;

  const raw = await chatCompletionJson(
    [
      { role: 'system', content: QUESTION_BATCH_SYSTEM },
      { role: 'user', content: userContent },
    ],
    { temperature: 0.25, timeoutMs: 55_000, retryOnceOnHttpError: true },
  );

  let parsed = parseQuestionBatchJson(raw);
  if (!parsed || parsed.length < INTERVIEW_MAX_TURNS) {
    const raw2 = await chatCompletionJson(
      [
        { role: 'system', content: `${QUESTION_BATCH_SYSTEM}\nIf your previous output was invalid, fix it: return ONLY one JSON object with a "questions" array of length 6.` },
        { role: 'user', content: userContent },
      ],
      { temperature: 0.2, timeoutMs: 55_000 },
    );
    parsed = parseQuestionBatchJson(raw2);
  }

  const queue =
    parsed && parsed.length >= INTERVIEW_MAX_TURNS
      ? parsed.slice(0, INTERVIEW_MAX_TURNS)
      : fallbackQueue(profession, candidateFirstName);

  return { v: 1, queue, turns: [] };
}

const DONT_KNOW_RESULT: EvaluatorResult = {
  score: 0,
  isCorrect: false,
  feedback:
    "That's okay. This is an area you can improve with more practice. Let's move to the next question.",
  strengths: [],
  improvements: ['Needs more understanding of this topic'],
  shouldMoveNext: true,
  detectedIntent: 'dont_know',
  confidence: 1.0,
};

function parseEvaluatorJson(raw: string | null): EvaluatorResult | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const score = typeof p.score === 'number' ? clampScore(p.score) : null;
    if (score === null) return null;
    const feedback = typeof p.feedback === 'string' ? p.feedback.trim() : '';
    if (!feedback) return null;
    const strengths = Array.isArray(p.strengths)
      ? (p.strengths as unknown[]).map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
      : [];
    const improvements = Array.isArray(p.improvements)
      ? (p.improvements as unknown[]).map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
      : [];
    const shouldMoveNext = p.shouldMoveNext !== false;
    const detectedIntent = typeof p.detectedIntent === 'string' ? p.detectedIntent.trim() : 'answered';
    const confidence = typeof p.confidence === 'number' && Number.isFinite(p.confidence)
      ? Math.min(1, Math.max(0, p.confidence))
      : 0.5;
    const isCorrect = p.isCorrect === true;
    return {
      score,
      isCorrect,
      feedback,
      strengths,
      improvements,
      shouldMoveNext,
      detectedIntent,
      confidence,
    };
  } catch {
    return null;
  }
}

const EVALUATOR_FALLBACK: EvaluatorResult = {
  score: 5,
  isCorrect: false,
  feedback:
    'Thanks for your answer. A clearer example or a bit more structure would make your point easier to follow.',
  strengths: ['You engaged with the question'],
  improvements: ['Add a concrete example or outcome next time'],
  shouldMoveNext: true,
  detectedIntent: 'answered',
  confidence: 0.35,
};

export async function evaluateInterviewAnswer(params: {
  profession: string;
  interviewQuestion: string;
  candidateAnswer: string;
  candidateSummary: string;
  nextQuestionPreview: string | null;
}): Promise<EvaluatorResult> {
  const { profession, interviewQuestion, candidateAnswer, candidateSummary, nextQuestionPreview } = params;

  if (isHonestIDKOrNoAnswer(candidateAnswer)) {
    return { ...DONT_KNOW_RESULT };
  }

  const userBlock = `Role / field: ${profession}

Interview question the candidate answered:
${interviewQuestion.slice(0, 3500)}

Candidate answer (may include typos, Roman Urdu, or broken English — infer intent generously):
${candidateAnswer.slice(0, 3500)}

Candidate profile summary (context only; judge the answer on its merits, do not invent facts they did not say):
${candidateSummary.slice(0, 2500)}

Remember: respond with JSON only. Do not include the full correct answer in "feedback".`;

  const messages = [
    { role: 'system' as const, content: EVALUATOR_SYSTEM },
    { role: 'user' as const, content: userBlock },
  ];

  const raw = await chatCompletionJson(messages, { temperature: 0.25, timeoutMs: 45_000, retryOnceOnHttpError: true });
  let ev = parseEvaluatorJson(raw);
  if (!ev) {
    const raw2 = await chatCompletionJson(
      [
        ...messages,
        {
          role: 'user' as const,
          content:
            'Your previous reply was not valid JSON or was incomplete. Output ONLY one JSON object matching the required schema.',
        },
      ],
      { temperature: 0.2, timeoutMs: 45_000 },
    );
    ev = parseEvaluatorJson(raw2);
  }

  const base = ev ?? EVALUATOR_FALLBACK;
  const fb = stripFeedbackTrailingQuestionsForDelivery(base.feedback, nextQuestionPreview);
  return { ...base, feedback: fb };
}

export function turnLogFromEvaluation(params: {
  meta: QueuedInterviewQuestion;
  userAnswer: string;
  ev: EvaluatorResult;
}): InterviewTurnLog {
  const now = new Date().toISOString();
  return {
    question: params.meta.question,
    category: params.meta.category,
    difficulty: params.meta.difficulty,
    relatedSkill: params.meta.relatedSkill,
    userAnswer: params.userAnswer,
    feedback: params.ev.feedback,
    score: params.ev.score,
    strengths: params.ev.strengths,
    improvements: params.ev.improvements,
    detectedIntent: params.ev.detectedIntent,
    confidence: params.ev.confidence,
    isCorrect: params.ev.isCorrect,
    timestamp: now,
  };
}

function averageScores(turns: InterviewTurnLog[]): number {
  if (!turns.length) return 0;
  const sum = turns.reduce((a, t) => a + (typeof t.score === 'number' ? t.score : 0), 0);
  return Math.round((sum / turns.length) * 10) / 10;
}

function categoryAverages(turns: InterviewTurnLog[]): Record<string, number> {
  const map = new Map<string, { sum: number; n: number }>();
  for (const t of turns) {
    const c = (t.category || 'general_field').toLowerCase();
    const prev = map.get(c) ?? { sum: 0, n: 0 };
    prev.sum += typeof t.score === 'number' ? t.score : 0;
    prev.n += 1;
    map.set(c, prev);
  }
  const out: Record<string, number> = {};
  for (const [k, { sum, n }] of map.entries()) {
    if (n > 0) out[k] = Math.round((sum / n) * 10) / 10;
  }
  return out;
}

export async function generateInterviewSummary(params: {
  profession: string;
  turns: InterviewTurnLog[];
  candidateFirstName: string;
}): Promise<{ summary: InterviewSummary; markdown: string }> {
  const { profession, turns, candidateFirstName } = params;
  const computedOverall = averageScores(turns);
  const computedCats = categoryAverages(turns);

  const lines = turns
    .map(
      (t, i) =>
        `Q${i + 1} [${t.category}] (${t.difficulty}) score ${t.score}/10\nQuestion: ${t.question}\nAnswer: ${t.userAnswer}\nFeedback: ${t.feedback}`,
    )
    .join('\n\n');

  const raw = await chatCompletionJson(
    [
      {
        role: 'system',
        content: `You summarize a completed mock interview for ${profession}.
Return ONLY valid JSON:
{
  "overallScore": number (0-10, one decimal allowed),
  "strongAreas": string[] (max 5 short items),
  "weakAreas": string[] (max 5 short items),
  "suggestedPracticeTopics": string[] (max 6 short topics),
  "categoryScores": object mapping category name to 0-10 score (one decimal ok)
}
Rules:
- Base everything on the transcript provided — do not invent projects or skills the candidate did not mention.
- Be concise and practical.
- overallScore should be close to the average of per-question scores unless there is a clear reason to nudge slightly (max ±0.7).
- categoryScores keys should use: cv_based, technology, general_field, scenario, behavioral when possible.`,
      },
      {
        role: 'user',
        content: `Computed average of per-turn scores: ${computedOverall}
Computed category averages from scores: ${JSON.stringify(computedCats)}

Transcript:
${lines.slice(0, 12_000)}`,
      },
    ],
    { temperature: 0.2, timeoutMs: 55_000, retryOnceOnHttpError: true },
  );

  let summary: InterviewSummary | null = null;
  if (raw) {
    try {
      const p = JSON.parse(raw) as Record<string, unknown>;
      const overallScore =
        typeof p.overallScore === 'number' && Number.isFinite(p.overallScore)
          ? Math.min(10, Math.max(0, Math.round(p.overallScore * 10) / 10))
          : computedOverall;
      const strongAreas = Array.isArray(p.strongAreas)
        ? (p.strongAreas as unknown[]).map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean).slice(0, 8)
        : [];
      const weakAreas = Array.isArray(p.weakAreas)
        ? (p.weakAreas as unknown[]).map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean).slice(0, 8)
        : [];
      const suggestedPracticeTopics = Array.isArray(p.suggestedPracticeTopics)
        ? (p.suggestedPracticeTopics as unknown[]).map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean).slice(0, 10)
        : [];
      const categoryScores =
        p.categoryScores && typeof p.categoryScores === 'object' && !Array.isArray(p.categoryScores)
          ? (p.categoryScores as Record<string, number>)
          : {};
      summary = {
        overallScore: overallScore || computedOverall,
        strongAreas: strongAreas.length ? strongAreas : ['You completed a full practice round'],
        weakAreas: weakAreas.length ? weakAreas : ['Keep adding depth with examples'],
        suggestedPracticeTopics: suggestedPracticeTopics.length
          ? suggestedPracticeTopics
          : ['Role fundamentals', 'System design basics', 'Behavioral STAR stories'],
        categoryScores: Object.keys(categoryScores).length ? categoryScores : computedCats,
      };
    } catch {
      summary = null;
    }
  }

  if (!summary) {
    summary = {
      overallScore: computedOverall,
      strongAreas: ['You stayed engaged through the full session'],
      weakAreas: ['Tighten structure and add measurable outcomes'],
      suggestedPracticeTopics: ['Core technical concepts for your role', 'CV-aligned stories', 'Tradeoff discussions'],
      categoryScores: computedCats,
    };
  }

  const name = candidateFirstName.trim();
  const catLines = Object.entries(summary.categoryScores)
    .map(([k, v]) => `- **${k}**: ${v}/10`)
    .join('\n');

  const markdown = `### Interview summary

**Overall score${name ? ` — ${name}` : ''}: ${summary.overallScore}/10**

**Strong areas**
${summary.strongAreas.map((x) => `- ${x}`).join('\n')}

**Areas to strengthen**
${summary.weakAreas.map((x) => `- ${x}`).join('\n')}

**Suggested practice topics**
${summary.suggestedPracticeTopics.map((x) => `- ${x}`).join('\n')}

**Category scores**
${catLines || '- (not enough category mix to separate)'}

---

**${name ? `${name}, ` : ''}that concludes our practice interview.** Thank you for your time — keep practicing with short, specific examples and you will keep improving.`;

  return { summary, markdown };
}
