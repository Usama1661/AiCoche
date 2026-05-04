/**
 * Edge: `start-interview` / `continue-interview`
 */
export type StartInterviewResponse = {
  sessionId: string;
  question: string;
};

export type ContinueInterviewResponse = {
  feedback: string;
  score: number;
  nextQuestion: string | null;
  finished?: boolean;
};

export type ChatRole = 'assistant' | 'user' | 'system';

export type InterviewMessage = {
  id: string;
  role: ChatRole;
  content: string;
  score?: number;
};
