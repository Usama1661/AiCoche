/**
 * Response shape for edge function `analyze-cv`.
 */
export type CvAnalysis = {
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  suggestions: string[];
  /** Optional overall score 0–100 for dashboard */
  overallScore?: number;
};

export type CvDataRow = {
  id?: string;
  user_id: string;
  file_name: string;
  storage_path?: string;
  extracted_text?: string;
  analysis?: CvAnalysis;
  created_at?: string;
};
