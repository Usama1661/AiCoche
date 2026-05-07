import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { chatCompletionJson } from '../_shared/openai.ts';
import { isResponse, readJson, requireAuth } from '../_shared/supabase.ts';

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

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
};

type Body =
  | {
      action: 'recommend';
      profile?: Record<string, unknown>;
      metrics?: Record<string, unknown>;
    }
  | {
      action: 'chat';
      sessionId: string;
      projectId: string;
      question: string;
    }
  | {
      action: 'complete';
      sessionId: string;
      projectId: string;
    };

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(text).filter(Boolean).slice(0, 8)
    : [];
}

function difficulty(value: unknown): ProjectRecommendation['difficulty'] {
  const normalized = text(value);
  return normalized === 'Beginner' || normalized === 'Intermediate' || normalized === 'Advanced'
    ? normalized
    : 'Intermediate';
}

function normalizeProject(value: unknown, index: number): ProjectRecommendation {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const title = text(item.title) || ['Portfolio Proof Project', 'Career Skill Builder', 'Interview-Ready Project'][index] || 'Career Project';
  const idBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: text(item.id) || `${idBase || 'project'}-${index + 1}`,
    title,
    difficulty: difficulty(item.difficulty),
    timeline: text(item.timeline) || '7-14 days',
    summary: text(item.summary) || 'Build a focused portfolio project that proves your target-role skills.',
    why: text(item.why) || 'This project gives your profile practical evidence recruiters can review.',
    skills: strings(item.skills),
    features: strings(item.features),
    stack: strings(item.stack),
    portfolioTips: strings(item.portfolioTips),
    interviewTalkingPoints: strings(item.interviewTalkingPoints),
  };
}

function fallbackProjects(profile: Record<string, unknown>, metrics: Record<string, unknown>): ProjectRecommendation[] {
  const role =
    text(profile.professionLabel) ||
    text((profile.professionalProfile as Record<string, unknown> | undefined)?.currentDesignation) ||
    'target role';
  const score = typeof metrics.lastCvScore === 'number' ? metrics.lastCvScore : null;
  const reason = score == null || score < 75
    ? 'Your CV needs more visible project proof, so this project gives recruiters concrete work to review.'
    : 'Your CV has a base already, so this project adds stronger proof for your next career step.';

  return [
    {
      id: 'ai-career-progress-dashboard',
      title: 'AI Career Progress Dashboard',
      difficulty: 'Intermediate',
      timeline: '10-14 days',
      summary: 'Build a dashboard that tracks CV strength, skills, interview practice, and weekly improvement goals.',
      why: reason,
      skills: ['Dashboard UI', 'User data', 'Progress tracking', 'Portfolio storytelling'],
      features: ['Profile score cards', 'Skill gap tracker', 'Weekly goals', 'Progress history'],
      stack: ['Next.js', 'Supabase', 'TypeScript', 'Charts'],
      portfolioTips: ['Add a strong README with screenshots', 'Explain how scores are calculated', 'Deploy it and link a live demo'],
      interviewTalkingPoints: ['How you designed the dashboard UX', 'How you structured user data', 'How you would scale the scoring system'],
    },
    {
      id: 'smart-cv-review-tool',
      title: 'Smart CV Review Tool',
      difficulty: 'Intermediate',
      timeline: '2 weeks',
      summary: `Create a CV review flow tailored for ${role} with strengths, gaps, and project suggestions.`,
      why: 'This demonstrates AI product thinking and directly supports your career-coach profile.',
      skills: ['AI prompts', 'File upload', 'Structured feedback', 'Privacy thinking'],
      features: ['CV upload', 'Text extraction', 'Strength report', 'Missing skills list', 'Action checklist'],
      stack: ['Next.js', 'Supabase Storage', 'Edge Functions', 'OpenAI'],
      portfolioTips: ['Show sample anonymized output', 'Document privacy decisions', 'Explain prompt validation'],
      interviewTalkingPoints: ['How you handle unreliable AI output', 'How you protect user data', 'How you measure review quality'],
    },
    {
      id: 'mock-interview-practice-room',
      title: 'Mock Interview Practice Room',
      difficulty: 'Intermediate',
      timeline: '7-10 days',
      summary: 'Build an interview practice room with questions, answers, feedback, and saved sessions.',
      why: 'It gives your profile a practical project that recruiters can understand quickly.',
      skills: ['Chat UI', 'State management', 'Feedback UX', 'Session history'],
      features: ['Question flow', 'Answer composer', 'Feedback cards', 'Session history', 'Score summary'],
      stack: ['React or Next.js', 'Supabase', 'TypeScript'],
      portfolioTips: ['Record a short demo video', 'Add sample sessions', 'Highlight responsive design'],
      interviewTalkingPoints: ['How you manage conversation state', 'How feedback is generated', 'How users track progress'],
    },
  ];
}

function initialProjectMessage(project: ProjectRecommendation) {
  return `I recommend "${project.title}" because it can strengthen your profile with practical proof. Ask me about scope, stack, README, GitHub, timeline, or interview explanation.`;
}

function completedIds(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

async function generateProjects(profile: Record<string, unknown>, metrics: Record<string, unknown>) {
  const fallback = fallbackProjects(profile, metrics);
  const raw = await chatCompletionJson(
    [
      {
        role: 'system',
        content: `You are an expert career coach. Return ONLY valid JSON:
{"projects":[{"id": string, "title": string, "difficulty": "Beginner" | "Intermediate" | "Advanced", "timeline": string, "summary": string, "why": string, "skills": string[], "features": string[], "stack": string[], "portfolioTips": string[], "interviewTalkingPoints": string[]}]}
Rules:
- Generate exactly 3 portfolio projects.
- Projects must be specific to the user's CV/background, target role, skills, missing skills, and experience level.
- Avoid generic todo apps.
- Each project should be realistic to finish in 1-2 weeks.
- Keep every list short and practical.`,
      },
      {
        role: 'user',
        content: `Profile snapshot:
${JSON.stringify(profile).slice(0, 18_000)}

Metrics and CV analysis:
${JSON.stringify(metrics).slice(0, 12_000)}`,
      },
    ],
    { temperature: 0.5 }
  );

  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { projects?: unknown[] };
    const projects = Array.isArray(parsed.projects)
      ? parsed.projects.slice(0, 3).map(normalizeProject)
      : [];
    return projects.length === 3 ? projects : fallback;
  } catch {
    return fallback;
  }
}

async function answerQuestion({
  project,
  profile,
  metrics,
  messages,
  question,
}: {
  project: ProjectRecommendation;
  profile: Record<string, unknown>;
  metrics: Record<string, unknown>;
  messages: ChatMessage[];
  question: string;
}) {
  const fallback = `For "${project.title}", focus on the smallest demo first: ${project.features.slice(0, 3).join(', ')}. Then polish the README and prepare to explain why this project fits your profile.`;
  const raw = await chatCompletionJson(
    [
      {
        role: 'system',
        content: `You are AiCoche Project Coach. Return ONLY valid JSON: {"answer": string}
Answer the user's question using the selected project, profile, CV metrics, and previous messages.
Be practical, specific, and concise. If asked about implementation, give steps. If asked about interview, give talking points.`,
      },
      {
        role: 'user',
        content: `Selected project:
${JSON.stringify(project)}

Profile:
${JSON.stringify(profile).slice(0, 12_000)}

Metrics:
${JSON.stringify(metrics).slice(0, 8_000)}

Previous chat:
${JSON.stringify(messages.slice(-10))}

Question:
${question}`,
      },
    ],
    { temperature: 0.45 }
  );

  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { answer?: unknown };
    return text(parsed.answer) || fallback;
  } catch {
    return fallback;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { supabase, user } = await requireAuth(req);
    const body = await readJson<Body>(req);

    if (body.action === 'recommend') {
      const profile = body.profile ?? {};
      const metrics = body.metrics ?? {};
      const { data: sessions, error: reuseError } = await supabase
        .from('ai_project_recommendation_sessions')
        .select('id, recommendations, chats, completed_project_ids, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (reuseError) throw reuseError;

      const latest = Array.isArray(sessions) ? sessions[0] : null;
      if (latest && Array.isArray(latest.recommendations) && latest.recommendations.length) {
        const completed = completedIds(latest.completed_project_ids);
        const recommendations = latest.recommendations.map(normalizeProject);
        const allCompleted = recommendations.every((project) => completed.includes(project.id));
        if (!allCompleted) {
          return jsonResponse({
            sessionId: latest.id,
            recommendations,
            chats: latest.chats ?? {},
            completedProjectIds: completed,
            reused: true,
          });
        }
      }

      const recommendations = await generateProjects(profile, metrics);

      const { data, error } = await supabase
        .from('ai_project_recommendation_sessions')
        .insert({
          user_id: user.id,
          profile_snapshot: profile,
          metrics_snapshot: metrics,
          recommendations,
          chats: {},
          completed_project_ids: [],
        })
        .select('id, recommendations, chats, completed_project_ids')
        .single();

      if (error) throw error;
      return jsonResponse({
        sessionId: data.id,
        recommendations: data.recommendations,
        chats: data.chats ?? {},
        completedProjectIds: data.completed_project_ids ?? [],
        reused: false,
      });
    }

    if (!body.sessionId || !body.projectId) {
      return jsonResponse({ error: 'sessionId and projectId are required' }, 400);
    }

    const { data: session, error: fetchError } = await supabase
      .from('ai_project_recommendation_sessions')
      .select('id, profile_snapshot, metrics_snapshot, recommendations, chats, completed_project_ids')
      .eq('id', body.sessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !session) return jsonResponse({ error: 'Project session not found' }, 404);

    const recommendations = Array.isArray(session.recommendations)
      ? session.recommendations.map(normalizeProject)
      : [];
    const project = recommendations.find((item) => item.id === body.projectId);
    if (!project) return jsonResponse({ error: 'Project not found' }, 404);

    if (body.action === 'complete') {
      const completed = Array.from(new Set([...completedIds(session.completed_project_ids), body.projectId]));
      const { error: updateError } = await supabase
        .from('ai_project_recommendation_sessions')
        .update({ completed_project_ids: completed })
        .eq('id', body.sessionId)
        .eq('user_id', user.id);
      if (updateError) throw updateError;
      return jsonResponse({ completedProjectIds: completed });
    }

    if (!body.question?.trim()) {
      return jsonResponse({ error: 'question is required' }, 400);
    }

    const chats = session.chats && typeof session.chats === 'object'
      ? session.chats as Record<string, ChatMessage[]>
      : {};
    const currentMessages = Array.isArray(chats[body.projectId]) ? [...chats[body.projectId]] : [];
    if (!currentMessages.length) {
      currentMessages.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: initialProjectMessage(project),
        createdAt: new Date().toISOString(),
      });
    }
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: body.question.trim(),
      createdAt: new Date().toISOString(),
    };
    const answer = await answerQuestion({
      project,
      profile: session.profile_snapshot as Record<string, unknown>,
      metrics: session.metrics_snapshot as Record<string, unknown>,
      messages: currentMessages,
      question: userMessage.content,
    });
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...currentMessages, userMessage, assistantMessage];
    const nextChats = { ...chats, [body.projectId]: nextMessages };

    const { error: updateError } = await supabase
      .from('ai_project_recommendation_sessions')
      .update({ chats: nextChats })
      .eq('id', body.sessionId)
      .eq('user_id', user.id);

    if (updateError) throw updateError;
    return jsonResponse({ answer, messages: nextMessages, chats: nextChats });
  } catch (error) {
    if (isResponse(error)) return error;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error(error);
    return jsonResponse({ error: message }, 500);
  }
});
